import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import i18n from '../i18n'
import en from '../locales/en.json'
import {
  installMemoryStorage,
  stubForecastFetch,
  renderHome,
  aqiFixture,
  AUSTIN_TX,
} from '../test/homeFixture'

/**
 * Reading order on the phone (P1-10).
 *
 * The site's promise is "one screen for the morning call", and the question
 * being asked is whether practice can run this afternoon. The hourly and
 * weekly views answered that, and they sat below the air-quality card, the
 * policy picker, two paragraphs of prose and the share button — roughly two
 * and a half screens down at 390px. In Texas the air card spent most of a
 * screen saying it had no verified policy to offer.
 */

let store: Map<string, string>

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  store = installMemoryStorage()
  store.set('wbgt-location', JSON.stringify(AUSTIN_TX))
  // Already answered, so the class prompt does not sit in the middle of the
  // order under test.
  store.set('wbgt-uil-class', JSON.stringify('uil-class-3'))
  store.set('wbgt-policy', JSON.stringify('uil-class-3'))
  stubForecastFetch({ aqi: aqiFixture() })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Document order of the landmarks, as a reader meets them scrolling down. */
function order(...nodes: HTMLElement[]): boolean {
  for (let i = 1; i < nodes.length; i++) {
    const follows = nodes[i - 1].compareDocumentPosition(nodes[i])
    if (!(follows & Node.DOCUMENT_POSITION_FOLLOWING)) return false
  }
  return true
}

describe('home reading order', () => {
  it('puts the hourly and weekly views straight under the verdict', async () => {
    renderHome()
    await waitFor(() =>
      expect(screen.getByText(en.verdict.todayHeading)).toBeInTheDocument(),
    )
    const hourly = screen.getByText(en.verdict.todayHeading)
    const week = screen.getByText(en.verdict.weekHeading)
    // The collapsed card repeats the heading in its summary; the first
    // occurrence is where the reader meets the card.
    const air = screen.getAllByText(en.air.gateHeading)[0]
    const picker = screen.getByLabelText(en.policies.pickerLabel)

    expect(order(hourly, week, air, picker)).toBe(true)
  })

  it('collapses the air card where there is no verified state policy', async () => {
    renderHome()
    await waitFor(() =>
      expect(screen.getByText(en.verdict.todayHeading)).toBeInTheDocument(),
    )
    // Texas has no verified air policy: the card must summarise rather than
    // spend a screen saying so. The reading itself stays on the summary line.
    const summary = screen.getByText(en.air.noPolicySummary)
    expect(summary).toBeInTheDocument()
    expect(summary.closest('summary')).not.toBeNull()
    // The full explanation is still there, one tap away.
    expect(screen.getByText(en.air.noPolicyBody)).toBeInTheDocument()
    expect(screen.getByText(en.air.noPolicyBody).closest('details')).not.toBeNull()
  })
})
