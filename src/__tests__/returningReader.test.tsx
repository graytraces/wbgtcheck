import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import i18n from '../i18n'
import en from '../locales/en.json'
import {
  localCalendarDay,
  priorVisitCount,
  recordVisit,
  trackVerdictView,
} from '../utils/analytics'
import { clearDeferredInstallPrompt } from '../utils/installPrompt'
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

  /**
   * A tab is not a visit, in either direction.
   *
   * The dedupe used to live only in session storage, so it died with the tab:
   * measured, six opens in six fresh tabs on one afternoon counted 1→6. That
   * is the same coach on the same day, and it is the number the ~09-30 readout
   * divides retention by. The day stamp is on the DEVICE now, so a second tab
   * this afternoon reads the first tab's mark.
   */
  it('does not count a second tab opened the same day', () => {
    expect(recordVisit().ordinal).toBe(1)
    // A new tab session over the same device storage.
    window.sessionStorage.clear()
    expect(recordVisit().ordinal, 'a second tab counted as a second visit').toBe(1)
    window.sessionStorage.clear()
    expect(recordVisit().ordinal).toBe(1)
    expect(priorVisitCount()).toBe(1)
  })

  it('picks up where the previous day left off, in a fresh tab', () => {
    recordVisit()
    // Tomorrow, in a tab opened tomorrow: nothing on the device says today.
    window.sessionStorage.clear()
    store.set('wbgt-visit-day', String(localCalendarDay(Date.now() - 26 * 3_600_000)))
    expect(priorVisitCount()).toBe(1)
    expect(recordVisit().ordinal).toBe(2)
    window.sessionStorage.clear()
    store.set('wbgt-visit-day', String(localCalendarDay(Date.now() - 26 * 3_600_000)))
    expect(recordVisit().ordinal).toBe(3)
  })

  it('reports days since the first visit, not since this one', () => {
    const eightDaysAgo = Date.now() - 8 * 86_400_000
    store.set('wbgt-first-seen', String(eightDaysAgo))
    store.set('wbgt-visit-count', '4')
    expect(recordVisit()).toEqual({ ordinal: 5, daysSinceFirst: 8 })
  })

  /**
   * The tab that never closes.
   *
   * Session storage survives a reload, so the dedupe flag outlived every one
   * of them: measured, six visits in six fresh tabs counted 1→6 while three
   * reloads inside a single tab counted nothing at all. A coach who leaves the
   * site open on the sideline laptop — the habit this product is a bet on —
   * read as visit 1 from August to October, and never cleared the install
   * hint's `priorVisitCount() >= 1` gate either. The ~09-30 readout was
   * instrumented against its own hypothesis.
   */
  /**
   * Both marks, because both were written together when the visit was counted:
   * the tab's (session) and the device's (local). Stamping only the tab would
   * describe a state the code cannot produce.
   */
  const setCountedDay = (at: number) => {
    window.sessionStorage.setItem('wbgt-visit-counted', String(localCalendarDay(at)))
    store.set('wbgt-visit-day', String(localCalendarDay(at)))
  }

  it('counts the next morning in a tab that was never closed', () => {
    expect(recordVisit().ordinal).toBe(1)
    expect(recordVisit().ordinal, 'a reload is not a new visit').toBe(1)

    // Midnight passes. Nothing about the tab changed, so session storage still
    // says this visit was counted — it was, yesterday.
    setCountedDay(Date.now() - 26 * 3_600_000)

    expect(recordVisit().ordinal, 'the next morning still read as visit 1').toBe(2)
    // Once for the day, not once per verdict rendered that day.
    expect(recordVisit().ordinal).toBe(2)
    expect(priorVisitCount()).toBe(2)
  })

  it('counts once for a tab that was already open when this shipped', () => {
    // The marker used to be the literal '1'. It has to read as "some earlier
    // day" rather than as garbage, or an open tab keeps its old immunity.
    window.sessionStorage.setItem('wbgt-visit-counted', '1')
    store.set('wbgt-visit-count', '3')
    expect(recordVisit().ordinal).toBe(4)
    expect(recordVisit().ordinal).toBe(4)
  })

  it('does not count again when the stored day is later than today', () => {
    // A device clock moved backwards, or a flight west across the date line.
    // "Earlier day" is the trigger; a later one is not a second visit.
    recordVisit()
    setCountedDay(Date.now() + 26 * 3_600_000)
    expect(recordVisit().ordinal).toBe(1)
  })

  it('orders calendar days across month and year boundaries', () => {
    const day = (y: number, m: number, d: number) => localCalendarDay(new Date(y, m, d, 12).getTime())
    expect(day(2026, 7, 10)).toBeLessThan(day(2026, 7, 11))
    expect(day(2026, 6, 31)).toBeLessThan(day(2026, 7, 1))
    expect(day(2025, 11, 31)).toBeLessThan(day(2026, 0, 1))
  })

  /**
   * The day the visit was counted on is written to BOTH stores.
   *
   * The device mark is what makes a second tab this afternoon not a second
   * visit; the tab mark is what still stops a tab counting itself twice when
   * localStorage is blocked or full, which is the one case the device mark
   * cannot cover.
   */
  it('marks the day on the device and in the tab', () => {
    recordVisit()
    const today = String(localCalendarDay(Date.now()))
    expect(store.get('wbgt-visit-day'), 'nothing on the device marks today').toBe(today)
    expect(
      window.sessionStorage.getItem('wbgt-visit-counted'),
      'the tab-local guard is gone',
    ).toBe(today)
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
  const settle = async () => {
    await waitFor(() => expect(screen.getByText(en.verdict.todayHeading)).toBeInTheDocument())
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  const renderSettled = async () => {
    renderHome()
    await settle()
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

  /**
   * Every case above is an iPhone, and iOS is the one platform where the hint
   * needs no browser event: it takes the Share-menu branch and shows itself.
   * Android is where the install API actually lives, where the majority of
   * this site's phone traffic is, and where the hint depends on catching a
   * `beforeinstallprompt` that Chrome fires ONCE, shortly after load — long
   * before a two-hop NWS forecast can resolve and let the gated hint mount.
   * That is the gap that let a hint which cannot appear on Android ship.
   */
  describe('on Android, where the event arrives before the verdict does', () => {
    const androidUserAgent =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/126.0.0.0 Mobile Safari/537.36'

    let realMatchMedia: typeof window.matchMedia

    beforeEach(() => {
      Object.defineProperty(window.navigator, 'userAgent', {
        configurable: true,
        value: androidUserAgent,
      })
      // A phone: Chrome only signals installability on touch devices, and the
      // hint refuses to render outside iOS without the same signal.
      realMatchMedia = window.matchMedia
      window.matchMedia = ((query: string) => ({
        matches: query.includes('pointer: coarse'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia
      clearDeferredInstallPrompt()
    })

    afterEach(() => {
      window.matchMedia = realMatchMedia
      clearDeferredInstallPrompt()
    })

    /** What Chrome hands over: an Event carrying a one-shot `prompt()`. */
    const fireInstallPrompt = () => {
      const event = new Event('beforeinstallprompt') as Event & { prompt: () => Promise<void> }
      event.prompt = vi.fn(async () => {})
      fireEvent(window, event)
      return event
    }

    it('shows the hint for an event fired before the forecast resolved', async () => {
      store.set('wbgt-visit-count', '1')
      seedLocated()

      renderHome()
      // Chrome's moment: right after load, with the forecast still in flight
      // and the hint not mounted — nothing inside the component is listening.
      fireInstallPrompt()
      await settle()

      expect(
        screen.getByText(en.installHint.android),
        'the install hint can never appear on Android',
      ).toBeInTheDocument()
    })

    it('offers the browser install button, so the captured event is the real one', async () => {
      store.set('wbgt-visit-count', '1')
      seedLocated()

      renderHome()
      const event = fireInstallPrompt()
      await settle()

      fireEvent.click(screen.getByRole('button', { name: en.installHint.cta }))
      expect(event.prompt, 'the "Add" button fired nothing').toHaveBeenCalled()
    })

    it('stays away on a first visit, exactly as on iOS', async () => {
      seedLocated()
      renderHome()
      fireInstallPrompt()
      await settle()

      expect(screen.queryByText(en.installHint.android)).not.toBeInTheDocument()
    })

    it('stays away once dismissed', async () => {
      store.set('wbgt-visit-count', '4')
      store.set('wbgt-a2hs-dismissed', '1')
      seedLocated()
      renderHome()
      fireInstallPrompt()
      await settle()

      expect(screen.queryByText(en.installHint.android)).not.toBeInTheDocument()
    })
  })
})
