import { describe, it, expect, beforeAll, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { ReactElement } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import i18n from '../i18n'
import en from '../locales/en.json'
import Home from '../pages/Home'
import VerdictCard from '../components/VerdictCard'
import Texas from '../pages/Texas'
import Georgia from '../pages/Georgia'
import SouthCarolina from '../pages/SouthCarolina'
import Tennessee from '../pages/Tennessee'
import Iowa from '../pages/Iowa'
import NorthCarolina from '../pages/NorthCarolina'
import NewYork from '../pages/NewYork'
import Virginia from '../pages/Virginia'
import Massachusetts from '../pages/Massachusetts'
import Florida from '../pages/Florida'
import California from '../pages/California'
import Kentucky from '../pages/Kentucky'
import States from '../pages/States'
import Disclaimer from '../pages/Disclaimer'
import WashingtonAir from '../pages/WashingtonAir'
import OregonAir from '../pages/OregonAir'
import CaliforniaAir from '../pages/CaliforniaAir'
import {
  WA_AIR_POLICY,
  OR_AIR_POLICY,
  CA_REFRAIN_AT_OR_ABOVE_AQI,
  CA_RULE_QUOTE,
  airActionQuote,
} from '../data/airPolicyOracle'
import {
  UIL_CLASS_2,
  UIL_CLASS_3,
  UIL_FAQ_FORECAST_QUOTE,
  UIL_MANDATE_2026_QUOTE,
  GHSA,
  GHSA_NO_APPS_QUOTE,
  SCHSL,
  TSSAA,
  TSSAA_HEAT_INDEX_BANDS,
  IOWA_CATEGORY_2,
  NCHSAA_REFERENCE,
  NYSPHSAA_HEAT_INDEX_REFERENCE,
  VHSL_REFERENCE,
  FHSAA_PRACTICE_REFERENCE,
  NYSPHSAA_WBGT_CATEGORIES,
  VA_ICE_WBGT_F,
  MIAA,
  MIAA_NO_GAMES_FOOTNOTE_QUOTE,
  FL_ONSITE_MEASUREMENT_QUOTE,
  CIF_CATEGORIES,
  GENERIC_NATA,
  KHSAA_WBGT_REFERENCE,
  KY_LOWEST_BAND_FLOOR,
  KY_REVISION_ISO,
  CIF_GAP_EXAMPLE_LOWER,
  CIF_GAP_EXAMPLE_UPPER,
  CIF_GAP_EXAMPLE_SKIPPED,
  CIF_AIR_BYLAW_CITATION,
  CIF_BYLAW_L_SUBJECT,
  KY_REVISION,
  KY_FOOTBALL_ONSITE_QUOTE,
  REMOTE_UNDERESTIMATE_MIN_C,
  REMOTE_UNDERESTIMATE_MAX_C,
} from '../data/policyOracle'
import { STATE_DIRECTORY } from '../data/stateDirectory'

const BIAS_PARAMS = { min: REMOTE_UNDERESTIMATE_MIN_C, max: REMOTE_UNDERESTIMATE_MAX_C }

/**
 * Rendered-DOM (post-JS) prose survival guards — the WRS-visible tree, not
 * the prerender HTML. App.tsx strips [data-prerender] on mount, so anything
 * asserted here must come from the React render itself (wiki:
 * prerender-wrs-prosewipe; assertions derive from the oracle, not copied
 * strings).
 */

function renderAt(path: string, element: ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:lang" element={element} />
        <Route path="/:lang/*" element={element} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('post-JS rendered DOM', () => {
  it('Home renders the keyword H1 from home.pageTitle (H1-desync guard)', () => {
    renderAt('/en', <Home />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe(en.home.pageTitle)
  })

  it('Home renders the prose sections (not only prerender)', () => {
    renderAt('/en', <Home />)
    for (const section of en.home.sections) {
      expect(screen.getByText(section.heading)).toBeInTheDocument()
    }
  })

  it('Home renders the hero badge (free / no account / no install)', () => {
    renderAt('/en', <Home />)
    expect(screen.getByText(en.home.heroBadge)).toBeInTheDocument()
  })

  it('Home states the data source and resolution next to the measurement rules', () => {
    renderAt('/en', <Home />)
    expect(screen.getByText(en.verdict.dataResolutionNote)).toBeInTheDocument()
  })

  it('Texas renders every oracle band label for both classes', () => {
    renderAt('/en/texas', <Texas />)
    for (const band of [...UIL_CLASS_2.bands, ...UIL_CLASS_3.bands]) {
      expect(screen.getAllByText(band.sourceLabel).length).toBeGreaterThan(0)
    }
    // Legality section: the FAQ quote reaches the DOM verbatim, and the
    // no-approval-list caveat stays as long as UIL publishes no list.
    expect(
      screen.getByText((content) => content.includes(UIL_FAQ_FORECAST_QUOTE)),
    ).toBeInTheDocument()
    expect(screen.getByText(en.texas.legalityNoList)).toBeInTheDocument()
    // 2026-27 mandate quote reaches the DOM verbatim.
    expect(
      screen.getByText((content) => content.includes(UIL_MANDATE_2026_QUOTE)),
    ).toBeInTheDocument()
  })

  it('Georgia renders every GHSA band label and the device-only warning', () => {
    renderAt('/en/georgia', <Georgia />)
    for (const band of GHSA.bands) {
      expect(screen.getAllByText(band.sourceLabel).length).toBeGreaterThan(0)
    }
    expect(screen.getByText(en.georgia.deviceWarning)).toBeInTheDocument()
    expect(
      screen.getByText((content) => content.includes(GHSA_NO_APPS_QUOTE)),
    ).toBeInTheDocument()
  })

  it('States renders one row per directory entry', () => {
    renderAt('/en/states', <States />)
    for (const row of STATE_DIRECTORY) {
      expect(screen.getAllByText(row.abbr).length).toBeGreaterThan(0)
    }
  })

  it('South Carolina renders every SCHSL band label and the device-only warning', () => {
    renderAt('/en/south-carolina', <SouthCarolina />)
    for (const band of SCHSL.bands) {
      expect(screen.getAllByText(band.sourceLabel).length).toBeGreaterThan(0)
    }
    expect(screen.getByText(en.southCarolina.deviceWarning)).toBeInTheDocument()
  })

  it('Iowa renders every band label and the marching band section', () => {
    renderAt('/en/iowa', <Iowa />)
    for (const band of IOWA_CATEGORY_2.bands) {
      expect(screen.getAllByText(band.sourceLabel).length).toBeGreaterThan(0)
    }
    expect(screen.getByText(en.iowa.bandBody)).toBeInTheDocument()
  })

  it('Tennessee renders both ladders and flags the silent low band', () => {
    renderAt('/en/tennessee', <Tennessee />)
    for (const band of TSSAA.bands) {
      expect(screen.getAllByText(band.sourceLabel).length).toBeGreaterThan(0)
    }
    for (const hi of TSSAA_HEAT_INDEX_BANDS) {
      expect(screen.getAllByText(hi.sourceLabel).length).toBeGreaterThan(0)
    }
    // The source states nothing below its lowest band — say so, don't invent.
    expect(screen.getByText(en.guideline.notAddressedBelow)).toBeInTheDocument()
  })

  it('North Carolina renders the current two-column chart and the picker exclusion', () => {
    renderAt('/en/north-carolina', <NorthCarolina />)
    for (const row of NCHSAA_REFERENCE.rows) {
      expect(screen.getAllByText(row.sourceLabel).length).toBeGreaterThan(0)
    }
    expect(screen.getByText(en.northCarolina.rows.suspend)).toBeInTheDocument()
    expect(screen.getByText(en.northCarolina.pickerExclusionBody)).toBeInTheDocument()
  })

  it('New York renders heat index rows and the not-WBGT caveat', () => {
    renderAt('/en/new-york', <NewYork />)
    for (const row of NYSPHSAA_HEAT_INDEX_REFERENCE.rows) {
      expect(screen.getAllByText(row.sourceLabel).length).toBeGreaterThan(0)
    }
    expect(screen.getByText(en.newYork.appCaveat)).toBeInTheDocument()
  })

  it('New York renders all three WBGT category ladders', () => {
    renderAt('/en/new-york', <NewYork />)
    // Every threshold from every category must be on the page. A missing
    // column would show one region another region's numbers — and here that is
    // the difference between a black flag and a yellow one at the same reading.
    for (const category of NYSPHSAA_WBGT_CATEGORIES) {
      for (const band of category.bands) {
        expect(screen.getAllByText(band.sourceLabel).length).toBeGreaterThan(0)
      }
    }
  })

  it('Virginia renders the VHSL levels and the statutory ice level', () => {
    renderAt('/en/virginia', <Virginia />)
    for (const row of VHSL_REFERENCE.rows) {
      expect(screen.getAllByText(row.sourceLabel).length).toBeGreaterThan(0)
    }
    expect(
      screen.getByText(i18n.t('virginia.iceBody', { ice: VA_ICE_WBGT_F })),
    ).toBeInTheDocument()
  })

  it('Massachusetts renders every band label, the device rule and the games footnote', () => {
    renderAt('/en/massachusetts', <Massachusetts />)
    for (const band of MIAA.bands) {
      expect(screen.getAllByText(band.sourceLabel).length).toBeGreaterThan(0)
    }
    // The two facts a Massachusetts reader most needs off this page.
    expect(screen.getByText(i18n.t('massachusetts.deviceWarning'))).toBeInTheDocument()
    expect(
      screen.getByText(
        i18n.t('massachusetts.noGamesBody', {
          footnote: MIAA_NO_GAMES_FOOTNOTE_QUOTE,
          band: MIAA.bands[2].sourceLabel,
        }),
      ),
    ).toBeInTheDocument()
  })

  it('Florida renders the §41.8 practice index and the on-site rule', () => {
    renderAt('/en/florida', <Florida />)
    for (const row of FHSAA_PRACTICE_REFERENCE.rows) {
      expect(screen.getAllByText(row.sourceLabel).length).toBeGreaterThan(0)
    }
    expect(screen.getByText(en.florida.deviceWarning)).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('florida.measurementBody', { quote: FL_ONSITE_MEASUREMENT_QUOTE })),
    ).toBeInTheDocument()
  })

  it('California renders all three category ladders and the picker-exclusion note', () => {
    renderAt('/en/california', <California />)
    // Every threshold from every category must be on the page — a missing
    // column would silently show one region another region's numbers.
    for (const policy of CIF_CATEGORIES) {
      for (const band of policy.bands) {
        expect(screen.getAllByText(band.sourceLabel).length).toBeGreaterThan(0)
      }
    }
    expect(screen.getByText(en.california.pickerExclusionBody)).toBeInTheDocument()
  })

  it('Kentucky renders its four bands, the currency caveat and the football rule', () => {
    renderAt('/en/kentucky', <Kentucky />)
    for (const row of KHSAA_WBGT_REFERENCE.rows) {
      expect(screen.getAllByText(row.sourceLabel).length).toBeGreaterThan(0)
    }
    // Archive-sourced numbers must always ship with the currency caveat.
    expect(
      screen.getByText(i18n.t('kentucky.currencyBody', { revision: KY_REVISION })),
    ).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('kentucky.footballBody', { quote: KY_FOOTBALL_ONSITE_QUOTE })),
    ).toBeInTheDocument()
  })

  it('WashingtonAir renders every band label and all three duration columns', () => {
    renderAt('/en/washington-air-quality', <WashingtonAir />)
    for (const band of WA_AIR_POLICY.bands) {
      expect(screen.getAllByText(band.sourceLabel).length).toBeGreaterThan(0)
    }
    for (const activity of ['short', 'medium', 'long'] as const) {
      expect(screen.getAllByText(en.air.activity[activity]).length).toBeGreaterThan(0)
    }
    // At least one of the guide's action rules must reach the UI verbatim,
    // not only as paraphrased table cells.
    const verbatim = airActionQuote(WA_AIR_POLICY, 'limitLightOrHourModerate')
    expect(verbatim).not.toBeNull()
    expect(screen.getByText(verbatim!)).toBeInTheDocument()
  })

  it('OregonAir renders each stated band with its published visibility range', () => {
    renderAt('/en/oregon-air-quality', <OregonAir />)
    for (const band of OR_AIR_POLICY.bands.filter((b) => b.action !== null)) {
      expect(screen.getAllByText(band.sourceLabel).length).toBeGreaterThan(0)
      expect(screen.getAllByText(band.visibilityLabel!).length).toBeGreaterThan(0)
    }
  })

  it('CaliforniaAir renders the bylaw quote and its threshold', () => {
    renderAt('/en/california-air-quality', <CaliforniaAir />)
    // ruleBody frames the quote in a sentence — match by containment.
    expect(
      screen.getByText((content) => content.includes(CA_RULE_QUOTE)),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(new RegExp(String(CA_REFRAIN_AT_OR_ABOVE_AQI))).length,
    ).toBeGreaterThan(0)
  })

  it('Disclaimer renders the not-a-measurement and not-compliance sections', () => {
    renderAt('/en/disclaimer', <Disclaimer />)
    // notMeasurement interpolates the oracle bias constants
    expect(
      screen.getByText(i18n.t('disclaimerPage.notMeasurement', BIAS_PARAMS)),
    ).toBeInTheDocument()
    expect(screen.getByText(en.disclaimerPage.notCompliance)).toBeInTheDocument()
  })
})

/**
 * Three corrections that are only visible in the rendered sentence: a
 * threshold example that has to match the table beside it, a date that has to
 * be readable in Spanish, and a citation that has to disagree with itself out
 * loud. All are interpolated, so a locale-file diff alone cannot show them.
 */
describe('post-JS rendered DOM — interpolated corrections', () => {
  it('California prints the gap example straight off its own table', () => {
    renderAt('/en/california', <California />)
    const expected = i18n.t('california.boundaryBody', {
      lower: CIF_GAP_EXAMPLE_LOWER,
      upper: CIF_GAP_EXAMPLE_UPPER,
      skipped: CIF_GAP_EXAMPLE_SKIPPED,
    })
    expect(expected).toContain(CIF_GAP_EXAMPLE_SKIPPED)
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('California says its own citation disagrees with CIF\'s bylaws', () => {
    renderAt('/en/california', <California />)
    const expected = i18n.t('california.bylawNumberNote', {
      actual: CIF_AIR_BYLAW_CITATION,
      other: CIF_BYLAW_L_SUBJECT,
    })
    expect(expected).toContain(CIF_BYLAW_L_SUBJECT)
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('Kentucky discloses that the table stops rather than clears', () => {
    renderAt('/en/kentucky', <Kentucky />)
    expect(
      screen.getByText(i18n.t('kentucky.belowBandsNote', { floor: KY_LOWEST_BAND_FLOOR })),
    ).toBeInTheDocument()
  })

  it('the Spanish Kentucky page dates the revision unambiguously', async () => {
    await i18n.changeLanguage('es')
    try {
      renderAt('/es/kentucky', <Kentucky />)
      const caveat = screen.getByText(
        i18n.t('kentucky.currencyBody', { revision: KY_REVISION_ISO }),
      )
      // 8/22/24 read day-first claims a 22nd month; it must not survive here.
      expect(caveat.textContent).toContain(KY_REVISION_ISO)
      expect(caveat.textContent).not.toContain('8/22/24')
    } finally {
      await i18n.changeLanguage('en')
    }
  })
})

/**
 * Changing location meant scrolling 3.4 screens to a button that cleared
 * everything and left the reader in place — with the new ZIP field 1.35
 * screens ABOVE where they were standing, so the visible result of pressing it
 * was a wall of prose. The label saying WHERE the reading is sits at the top
 * of the verdict card; the way to change it now sits beside it.
 *
 * LocationSetup had carried a `compact` prop for this since it was written,
 * with no caller anywhere.
 */
describe('changing location starts where the location is shown', () => {
  const hourFixture = {
    time: '2026-08-14T20:00:00Z',
    wbgtF: 84,
    flag: 'red',
    borderline: false,
    localHour: 15,
    localDate: '2026-08-14',
    source: 'forecast',
  } as never

  it('the verdict card offers the change beside the place name', () => {
    const onChangeLocation = vi.fn()
    render(
      <MemoryRouter initialEntries={['/en']}>
        <VerdictCard
          hour={hourFixture}
          policy={GENERIC_NATA}
          locationLabel="Austin, TX"
          stateAbbr="TX"
          timeZone="America/Chicago"
          onChangeLocation={onChangeLocation}
        />
      </MemoryRouter>,
    )
    const label = screen.getByText('Austin, TX')
    const button = within(label.closest('span')!).getByRole('button')
    expect(button.textContent).toBe(en.location.change)
    fireEvent.click(button)
    expect(onChangeLocation).toHaveBeenCalled()
  })

  it('renders no change control when the page does not offer one', () => {
    render(
      <MemoryRouter initialEntries={['/en']}>
        <VerdictCard
          hour={hourFixture}
          policy={GENERIC_NATA}
          locationLabel="Austin, TX"
          stateAbbr="TX"
          timeZone="America/Chicago"
        />
      </MemoryRouter>,
    )
    expect(within(screen.getByText('Austin, TX').closest('span')!).queryByRole('button')).toBeNull()
  })

  it('the compact editor prop has a caller now', () => {
    const src = readFileSync(join(process.cwd(), 'src/pages/Home.tsx'), 'utf8')
    expect(src).toContain('<LocationSetup')
    expect(src).toMatch(/compact\s*$/m)
    // Opening it scrolls to and focuses the field rather than leaving the
    // reader wherever they were.
    expect(src).toContain('scrollIntoView')
    expect(src).toContain("getElementById('zip-input')")
  })
})
