import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import i18n from '../i18n'
import en from '../locales/en.json'
import es from '../locales/es.json'

/**
 * Two of Home's four fallback-notice variants render for nobody.
 *
 * `home.stateScale*` needs a guide with `ladder: 'heat-index'` and
 * `home.stateNoNumbers*` needs `ladder: 'no-state-numbers'`; every one of the
 * twelve STATE_GUIDES is `wbgt-own` today, because reading VHSL's table moved
 * Virginia and FHSAA's §41.8 moved Florida and NYSPHSAA's page 2 moved New
 * York. So five strings and two documented registry values are unreachable
 * from the app.
 *
 * They are kept rather than deleted, and this file is the reason they may be:
 * DELETING them would leave Home's two branches calling t() on keys that no
 * longer exist, so the next state that publishes a heat-index ladder or hands
 * its thresholds to districts would render a raw i18n key on the busiest page
 * of the site. The branches are a fallback for a registry value, not dead code
 * — and this proves the fallback still works by declaring one of each and
 * mounting the real Home.
 *
 * guideReachability.test.tsx builds the notice by hand instead of mounting
 * Home, which is why nothing flagged the dormancy in either direction.
 *
 * ⚠️ The stand-in state must be one the PICKER cannot already offer. Home only
 * reaches the ladder-notice branch when the flag on screen is not the detected
 * state's own (`showStateGuide`), so mocking a registry value onto a state the
 * picker auto-selects exercises nothing. Florida used to carry the
 * 'association' case and stopped being usable for it the moment FHSAA §41.8
 * entered the picker; Kentucky took it over, whose thresholds really are the
 * association's (KHSAA) rather than a district's.
 */
vi.mock('../data/guideRegistry', async () => {
  const actual =
    await vi.importActual<typeof import('../data/guideRegistry')>('../data/guideRegistry')
  return {
    ...actual,
    STATE_GUIDES: actual.STATE_GUIDES.map((guide) => {
      if (guide.abbr === 'NY') return { ...guide, ladder: 'heat-index' }
      if (guide.abbr === 'VA')
        return { ...guide, ladder: 'no-state-numbers', numbersSetBy: 'districts' }
      if (guide.abbr === 'KY')
        return { ...guide, ladder: 'no-state-numbers', numbersSetBy: 'association' }
      return guide
    }),
  }
})

const { installMemoryStorage, stubForecastFetch, renderHome, aqiFixture, AUSTIN_TX } =
  await import('../test/homeFixture')
const { STATE_GUIDES } = await import('../data/guideRegistry')

let store: Map<string, string>

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  store = installMemoryStorage()
  stubForecastFetch({ aqi: aqiFixture() })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A located, already-answered reader in `abbr`, on the real Home. */
async function homeIn(abbr: string) {
  store.clear()
  store.set('wbgt-uil-class', JSON.stringify('uil-class-3'))
  store.set(
    'wbgt-location',
    JSON.stringify({ lat: AUSTIN_TX.lat, lon: AUSTIN_TX.lon, label: `Field, ${abbr}`, stateAbbr: abbr }),
  )
  const view = renderHome()
  await waitFor(() => expect(screen.getByText(en.verdict.todayHeading)).toBeInTheDocument())
  return view
}

describe('the dormant fallback notices are dormant by DATA, not by dead code', () => {
  it('the registry declares no heat-index and no no-state-numbers guide today', async () => {
    // Read from the real module, not the mock above.
    const real =
      await vi.importActual<typeof import('../data/guideRegistry')>('../data/guideRegistry')
    expect(real.STATE_GUIDES.length).toBeGreaterThan(0)
    for (const guide of real.STATE_GUIDES) {
      expect(guide.ladder, `${guide.abbr} ladder`).toBe('wbgt-own')
    }
    // …which is exactly why nothing on the site renders these five strings.
    for (const dict of [en, es]) {
      expect(dict.home.stateScaleHeading.length).toBeGreaterThan(0)
      expect(dict.home.stateNoNumbersHeading.length).toBeGreaterThan(0)
      expect(dict.home.stateNoNumbersBody).toContain('{{setBy}}')
    }
  })

  it('a heat-index guide still gets the scale notice from the real Home', async () => {
    expect(STATE_GUIDES.find((g) => g.abbr === 'NY')!.ladder).toBe('heat-index')
    const view = await homeIn('NY')
    expect(screen.getByText(en.home.stateScaleHeading)).toBeInTheDocument()
    expect(screen.getByText(en.home.stateScaleBody)).toBeInTheDocument()
    view.unmount()
  })

  it('a no-state-numbers guide still gets the right setBy, per registry value', async () => {
    for (const [abbr, setByKey] of [
      ['VA', 'stateNumbersSetByDistricts'],
      ['KY', 'stateNumbersSetByAssociation'],
    ] as const) {
      const view = await homeIn(abbr)
      expect(screen.getByText(en.home.stateNoNumbersHeading)).toBeInTheDocument()
      expect(
        screen.getByText(
          i18n.t('home.stateNoNumbersBody', { setBy: en.home[setByKey] }),
        ),
        `${abbr} names the wrong body`,
      ).toBeInTheDocument()
      view.unmount()
    }
  })
})
