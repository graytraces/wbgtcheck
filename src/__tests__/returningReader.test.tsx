import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'
import i18n from '../i18n'
import en from '../locales/en.json'
import { priorVisitCount, recordVisit, trackVerdictView } from '../utils/analytics'
import {
  installMemoryStorage,
  stubForecastFetch,
  renderHome,
  aqiFixture,
  AUSTIN_TX,
} from '../test/homeFixture'

/**
 * Whether a coach COMES BACK is the question the ~09-30 readout exists to
 * answer, and the property could not answer it: `verdict_view` and
 * `location_set` count events, not people, so one coach's twentieth check of
 * the season and twenty coaches' first look identical in GA4.
 *
 * The same counter decides where the add-to-home-screen hint appears. It used
 * to render last on the page — below the footer nav, ~90% scroll depth, one ×
 * from permanent dismissal — and it was offered to a first-time reader, who
 * has no reason yet to want a shortcut to a site they have used once.
 */

let store: Map<string, string>

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  store = installMemoryStorage()
  window.sessionStorage.clear()
  window.gtag = vi.fn() as unknown as typeof window.gtag
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('visit accounting', () => {
  it('starts at zero and counts the first qualifying visit as the first', () => {
    expect(priorVisitCount()).toBe(0)
    expect(recordVisit().ordinal).toBe(1)
  })

  it('counts a tab session once, however many verdicts it renders', () => {
    recordVisit()
    recordVisit()
    recordVisit()
    expect(priorVisitCount()).toBe(1)
  })

  it('picks up where the previous session left off', () => {
    recordVisit()
    // A new tab session over the same device storage.
    window.sessionStorage.clear()
    expect(priorVisitCount()).toBe(1)
    expect(recordVisit().ordinal).toBe(2)
    window.sessionStorage.clear()
    expect(recordVisit().ordinal).toBe(3)
  })

  it('reports days since the first visit, not since this one', () => {
    const eightDaysAgo = Date.now() - 8 * 86_400_000
    store.set('wbgt-first-seen', String(eightDaysAgo))
    store.set('wbgt-visit-count', '4')
    expect(recordVisit()).toEqual({ ordinal: 5, daysSinceFirst: 8 })
  })

  it('reads every visit as the first when storage is blocked', () => {
    // The honest degradation: with nothing to remember by, we cannot tell two
    // visits apart, so we do not claim to.
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => {
          throw new DOMException('blocked', 'SecurityError')
        },
        setItem: () => {
          throw new DOMException('blocked', 'SecurityError')
        },
        removeItem: () => {},
        clear: () => {},
      },
    })
    expect(priorVisitCount()).toBe(0)
    expect(recordVisit().ordinal).toBe(1)
  })
})

describe('verdict_view carries where the reader is in their own sequence', () => {
  it('sends the visit ordinal and the days since first, as strings', () => {
    store.set('wbgt-visit-count', '6')
    store.set('wbgt-first-seen', String(Date.now() - 20 * 86_400_000))
    trackVerdictView('TX', 'red')
    expect(window.gtag).toHaveBeenCalledWith('event', 'verdict_view', {
      state: 'TX',
      category: 'red',
      visit_ordinal: '7',
      days_since_first: '20',
    })
  })

  it('does not re-count within the session, so a policy switch is not a visit', () => {
    trackVerdictView('TX', 'red')
    trackVerdictView('TX', 'black')
    const calls = (window.gtag as unknown as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.map((c) => (c[2] as { visit_ordinal: string }).visit_ordinal)).toEqual(['1', '1'])
  })
})

describe('the add-to-home-screen hint waits for a second visit', () => {
  const iosUserAgent =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'

  const seedLocated = () => {
    store.set('wbgt-uil-class', JSON.stringify('uil-class-3'))
    store.set('wbgt-location', JSON.stringify(AUSTIN_TX))
    stubForecastFetch({ aqi: aqiFixture() })
  }

  /**
   * Render, then settle.
   *
   * The hint mounts with the verdict and decides whether to show itself in a
   * mount effect, so an assertion taken the instant `todayHeading` appears is
   * too early — and "too early" reads as ABSENT, which made the first-visit
   * case pass with the gate deleted. Both cases are now read at the same
   * point, and the case that expects the hint to be there is what proves that
   * point is late enough.
   */
  const renderSettled = async () => {
    renderHome()
    await waitFor(() => expect(screen.getByText(en.verdict.todayHeading)).toBeInTheDocument())
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  beforeEach(() => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: iosUserAgent,
    })
  })

  it('is absent on a first visit', async () => {
    seedLocated()
    await renderSettled()
    expect(screen.queryByText(en.installHint.ios)).not.toBeInTheDocument()
  })

  it('appears on a return, under the verdict rather than under the footer', async () => {
    store.set('wbgt-visit-count', '1')
    seedLocated()
    await renderSettled()

    const hint = screen.getByText(en.installHint.ios)
    // Above the hourly strip, which is itself directly under the verdict —
    // it used to sit below every section on the page.
    const hourly = screen.getByText(en.verdict.todayHeading)
    expect(
      hint.compareDocumentPosition(hourly) & Node.DOCUMENT_POSITION_FOLLOWING,
      'the hint is still below the fold',
    ).toBeTruthy()
  })

  it('does not reappear once dismissed, however many visits follow', async () => {
    store.set('wbgt-visit-count', '9')
    store.set('wbgt-a2hs-dismissed', '1')
    seedLocated()
    await renderSettled()
    expect(screen.queryByText(en.installHint.ios)).not.toBeInTheDocument()
  })
})
