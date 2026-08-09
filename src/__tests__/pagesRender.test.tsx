import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { ReactElement } from 'react'
import i18n from '../i18n'
import en from '../locales/en.json'
import Home from '../pages/Home'
import Texas from '../pages/Texas'
import Georgia from '../pages/Georgia'
import SouthCarolina from '../pages/SouthCarolina'
import Tennessee from '../pages/Tennessee'
import Iowa from '../pages/Iowa'
import NorthCarolina from '../pages/NorthCarolina'
import NewYork from '../pages/NewYork'
import Virginia from '../pages/Virginia'
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
  VA_ICE_WBGT_F,
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

  it('Virginia renders the no-threshold-table notice and the statutory ice level', () => {
    renderAt('/en/virginia', <Virginia />)
    expect(screen.getByText(en.virginia.noTableNotice)).toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('virginia.iceBody', { ice: VA_ICE_WBGT_F })),
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
