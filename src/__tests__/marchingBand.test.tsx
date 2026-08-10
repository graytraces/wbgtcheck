import { describe, it, expect, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import i18n from '../i18n'
import en from '../locales/en.json'
import es from '../locales/es.json'
import MarchingBand from '../pages/MarchingBand'
import { requireFreshDist } from '../test/requireDist'
import {
  BAND_COVERAGE,
  IOWA_BAND_ROWS,
  IOWA_CATEGORY_2,
  IOWA_APPENDIX_C_SCOPE_QUOTE,
  IOWA_BAND_FOOTNOTE_SOURCE,
  UIL_MANDATE_2026_QUOTE,
  UIL_BAND_HEADING_QUOTE,
  UIL_BAND_COOLING_ZONE_QUOTE,
  UIL_BAND_PRACTICE_DEFINITION_QUOTE,
  UIL_CLASS_2,
  UIL_CLASS_3,
  NCHSAA_ALL_SPORTS_HEADING_QUOTE,
  NCHSAA_CHEER_JURISDICTION_QUOTE,
  NCHSAA_MANDATE_QUOTE,
  FL_TRAINING_QUOTE,
  GHSA_ALL_SPORTS_QUOTE,
  MIAA_ALL_SPORTS_QUOTE,
  SCHSL_TABLE_SCOPE_QUOTE,
  FHSAA_STUDENT_ATHLETE_SCOPE_QUOTE,
  KY_ALL_SPORTS_COLUMN_QUOTE,
  CIF_CANCEL_QUOTE,
  NYSPHSAA_EITHER_SCALE_QUOTE,
  TSSAA_EITHER_QUOTE,
  VA_CANCEL_QUOTE,
} from '../data/policyOracle'
import { STATE_GUIDES } from '../data/guideRegistry'

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/en/marching-band-heat-rules']}>
      <Routes>
        <Route path="/:lang/*" element={<MarchingBand />} />
      </Routes>
    </MemoryRouter>,
  )

/**
 * The spine: two states wrote marching band into the rule, ten did not.
 * Everything on this page hangs off that count, so it is pinned to the
 * documents rather than to a number typed into a test.
 */
describe('band coverage matches what the documents say', () => {
  it('covers the same twelve states the site has read primary sources for', () => {
    expect(BAND_COVERAGE.length).toBe(12)
    const guides = new Set(STATE_GUIDES.map((g) => g.abbr))
    for (const row of BAND_COVERAGE) {
      expect(guides.has(row.abbr), `${row.abbr} has no guide page`).toBe(true)
    }
    // Ordered by abbreviation, like guideRegistry and stateDirectory.
    expect(BAND_COVERAGE.map((r) => r.abbr)).toEqual(
      [...BAND_COVERAGE.map((r) => r.abbr)].sort(),
    )
  })

  it('only Texas and Iowa are "named", and each is pinned to its own sentence', () => {
    const named = BAND_COVERAGE.filter((r) => r.coverage === 'named').map((r) => r.abbr)
    expect(named).toEqual(['IA', 'TX'])
    // Texas: the requirement itself names band. If UIL ever drops the phrase,
    // this classification has to be re-derived rather than kept.
    expect(UIL_MANDATE_2026_QUOTE).toContain('marching band')
    expect(UIL_MANDATE_2026_QUOTE).toContain('required standard')
    expect(UIL_BAND_HEADING_QUOTE).toContain('Marching Band')
    expect(UIL_BAND_COOLING_ZONE_QUOTE).toContain('marching band')
    expect(UIL_BAND_PRACTICE_DEFINITION_QUOTE).toContain('coach/director-supervised')
    // The cooling-zone sentence carries two temperatures, and they are not
    // band-specific numbers: they are the Class 2 and Class 3 yellow floors
    // the athletics ladder already uses. If UIL ever moves a band edge and
    // this quote is updated from a stale copy, they stop matching here.
    const yellowFloor = (policy: typeof UIL_CLASS_2) =>
      policy.bands.find((b) => b.flag === 'yellow')!.minF
    expect(UIL_BAND_COOLING_ZONE_QUOTE).toContain(String(yellowFloor(UIL_CLASS_2)))
    expect(UIL_BAND_COOLING_ZONE_QUOTE).toContain(String(yellowFloor(UIL_CLASS_3)))
    // Iowa: the rows exist and the appendix says they are ADDITIONAL guidance.
    expect(IOWA_BAND_ROWS.length).toBe(3)
    expect(IOWA_APPENDIX_C_SCOPE_QUOTE).toContain('additional sport/activity guidance')
  })

  it('every athletics-only row carries the scope sentence that makes it one', () => {
    const athleticsOnly = BAND_COVERAGE.filter((r) => r.coverage === 'athletics-only')
    expect(athleticsOnly).toHaveLength(10)
    for (const row of athleticsOnly) {
      expect(row.scopeQuote.length, `${row.abbr} scope quote`).toBeGreaterThan(10)
      // The claim is "this document is about athletics", so its own scope
      // sentence has to name the athletic domain…
      expect(row.scopeQuote.toLowerCase(), `${row.abbr} scope quote`).toMatch(
        /sport|athlet|outdoor|practice|competition|contest/,
      )
      // …and must not name any of the activities it is being said to exclude.
      // A scope quote that mentioned band would make its own row false.
      expect(row.scopeQuote.toLowerCase(), `${row.abbr} names band after all`).not.toMatch(
        /\bband\b|marching|cheer|music|color guard/,
      )
    }
    // Every one of the ten is pinned to the named constant it was read into,
    // so deleting a constant deletes the assertion that somebody read it —
    // the regex above is only a sanity check on top of these.
    const byAbbr = Object.fromEntries(BAND_COVERAGE.map((r) => [r.abbr, r]))
    expect(byAbbr.CA.scopeQuote).toBe(CIF_CANCEL_QUOTE)
    expect(byAbbr.FL.scopeQuote).toBe(FHSAA_STUDENT_ATHLETE_SCOPE_QUOTE)
    expect(byAbbr.GA.scopeQuote).toBe(GHSA_ALL_SPORTS_QUOTE)
    expect(byAbbr.KY.scopeQuote).toBe(KY_ALL_SPORTS_COLUMN_QUOTE)
    expect(byAbbr.MA.scopeQuote).toBe(MIAA_ALL_SPORTS_QUOTE)
    expect(byAbbr.NC.scopeQuote).toBe(NCHSAA_ALL_SPORTS_HEADING_QUOTE)
    expect(byAbbr.NY.scopeQuote).toBe(NYSPHSAA_EITHER_SCALE_QUOTE)
    expect(byAbbr.SC.scopeQuote).toBe(SCHSL_TABLE_SCOPE_QUOTE)
    expect(byAbbr.TN.scopeQuote).toBe(TSSAA_EITHER_QUOTE)
    expect(byAbbr.VA.scopeQuote).toBe(VA_CANCEL_QUOTE)
  })

  /**
   * The two rows where a flat 'athletics-only' would lose the half of the
   * document that helps somebody. Both were nearly flattened.
   */
  it('keeps the two partial-coverage nuances attached to their rows', () => {
    const nc = BAND_COVERAGE.find((r) => r.abbr === 'NC')!
    expect(nc.partialCoverage).toBe(NCHSAA_CHEER_JURISDICTION_QUOTE)
    expect(nc.partialCoverage).toContain('health and safety guidelines')
    // The mandate NCHSAA writes is broader than the section heading beside it.
    expect(NCHSAA_MANDATE_QUOTE).toContain('all sanctioned activities')
    expect(NCHSAA_ALL_SPORTS_HEADING_QUOTE).toContain('All Sports')

    const fl = BAND_COVERAGE.find((r) => r.abbr === 'FL')!
    expect(fl.reachesBeyondAthletics).toBe(FL_TRAINING_QUOTE)
    // The sentence reaches past athletics, which is the whole point of the
    // nuance — and it is a TRAINING duty, not a threshold.
    expect(FL_TRAINING_QUOTE).toContain('sponsor of extracurricular activities')
    expect(FL_TRAINING_QUOTE).toContain('complete training')
    expect(FL_TRAINING_QUOTE).not.toMatch(/WBGT|threshold|degrees/i)

    // …and nowhere else claims a nuance it has no document for.
    const withNuance = BAND_COVERAGE.filter(
      (r) => r.partialCoverage || r.reachesBeyondAthletics,
    ).map((r) => r.abbr)
    expect(withNuance).toEqual(['FL', 'NC'])
  })
})

/**
 * Iowa is stricter IN KIND, not in number. The temperatures are the athletics
 * temperatures; only the required actions differ. Copy that implied a second
 * ladder would tell a band director to watch for numbers that do not exist.
 */
describe('Iowa band rows share the athletics bands', () => {
  it('every band row joins a flag the athletics ladder already has', () => {
    const athleticsFlags = new Set(IOWA_CATEGORY_2.bands.map((b) => b.flag))
    for (const row of IOWA_BAND_ROWS) {
      expect(athleticsFlags.has(row.flag), `${row.flag} is not an Iowa band`).toBe(true)
    }
    // Appendix C writes only the top three; it says nothing below orange.
    expect(IOWA_BAND_ROWS.map((r) => r.flag)).toEqual(['black', 'red', 'orange'])
  })

  it('the printed edges are the athletics edges, not a second scale', () => {
    // Read the numbers back out of Appendix C's labels and check them against
    // the ladder's own minF. A band-specific threshold would fail here.
    const edgeOf = (label: string) => Number(label.match(/\d+\.\d+/)![0])
    const byFlag = Object.fromEntries(IOWA_CATEGORY_2.bands.map((b) => [b.flag, b]))
    expect(edgeOf(IOWA_BAND_ROWS.find((r) => r.flag === 'orange')!.sourceLabel)).toBe(
      byFlag.orange.minF,
    )
    expect(edgeOf(IOWA_BAND_ROWS.find((r) => r.flag === 'red')!.sourceLabel)).toBe(
      byFlag.red.minF,
    )
    // Appendix C prints black as "89.8 or greater" where the chart prints
    // "> 89.7" — the same boundary, both as the source prints them.
    const black = edgeOf(IOWA_BAND_ROWS.find((r) => r.flag === 'black')!.sourceLabel)
    expect(black).toBeGreaterThan(byFlag.black.minF!)
    expect(black - byFlag.black.minF!).toBeCloseTo(0.1, 5)
  })

  it('the actions differ from the athletics ones — that is what band gets', () => {
    const orange = IOWA_BAND_ROWS.find((r) => r.flag === 'orange')!
    // Uniform and playing surface, neither of which the athletics rows carry.
    expect(orange.quote).toMatch(/uniform/i)
    expect(orange.quote).toMatch(/grassy area/i)
    expect(IOWA_BAND_ROWS.find((r) => r.flag === 'red')!.quote).toMatch(/out of uniform/i)
    expect(IOWA_BAND_ROWS.find((r) => r.flag === 'black')!.quote).toMatch(/No outdoor/i)
    // Iowa cites the NFHS marching-band article for writing these at all.
    expect(IOWA_BAND_FOOTNOTE_SOURCE.url).toContain('marching-band')
  })
})

describe('the /marching-band-heat-rules page', () => {
  it('answers the question for every state in one table', () => {
    const { container } = renderPage()
    const rows = container.querySelectorAll('table[aria-labelledby="band-table-heading"] tbody tr')
    expect(rows).toHaveLength(BAND_COVERAGE.length)
    for (const [i, row] of [...rows].entries()) {
      const entry = BAND_COVERAGE[i]
      expect(row.textContent).toContain(entry.abbr)
      expect(row.textContent, `${entry.abbr} coverage label`).toContain(
        entry.coverage === 'named' ? en.marchingBand.coverageNamed : en.marchingBand.coverageAthleticsOnly,
      )
    }
  })

  it('shows the two states that name band with their own sentences', () => {
    const { container } = renderPage()
    const text = container.textContent ?? ''
    expect(text).toContain(UIL_MANDATE_2026_QUOTE)
    expect(text).toContain(UIL_BAND_COOLING_ZONE_QUOTE)
    expect(text).toContain(UIL_BAND_PRACTICE_DEFINITION_QUOTE)
    expect(text).toContain(IOWA_APPENDIX_C_SCOPE_QUOTE)
    for (const row of IOWA_BAND_ROWS) {
      expect(text, `Iowa ${row.flag} action`).toContain(row.quote)
      expect(text, `Iowa ${row.flag} band`).toContain(row.sourceLabel)
    }
    expect(text).not.toContain('{{')
  })

  it('carries both nuances rather than flattening them to "athletics only"', () => {
    const { container } = renderPage()
    const text = container.textContent ?? ''
    expect(text).toContain(NCHSAA_CHEER_JURISDICTION_QUOTE)
    expect(text).toContain(FL_TRAINING_QUOTE)
  })

  /**
   * The register the Oregon air page set: the absence of a rule is not a
   * finding that the activity is safe. Ten of these twelve rows are absences,
   * so the page has to say what an absence means.
   */
  it('says in both locales that a silent document is not a clearance', () => {
    for (const dict of [en, es]) {
      expect(dict.marchingBand.silenceNote).toMatch(
        /not a clearance|no es una autorización/i,
      )
      // …and the sentence has to name where the decision actually sits, so a
      // reader is not left with "nobody said no" as the answer.
      expect(dict.marchingBand.silenceNote).toMatch(/district|distrito/i)
    }
    const prose = JSON.stringify([en.marchingBand, es.marchingBand]).toLowerCase()
    expect(prose).not.toContain('safe to practice')
    expect(prose).not.toContain('seguro practicar')
  })

  it('never implies Iowa runs a separate ladder for band', () => {
    for (const dict of [en, es]) {
      expect(dict.marchingBand.iowaSameBandsBody).toMatch(
        /same bands|mismas bandas/i,
      )
      expect(dict.marchingBand.iowaSameBandsBody).toContain('{{scope}}')
      // Explicitly denies the second-scale reading.
      expect(dict.marchingBand.iowaSameBandsBody).toMatch(
        /did not build a second scale|no construyó una segunda escala/i,
      )
    }
  })

  it('links each state to its guide and cites a dated source per row', () => {
    const { container } = renderPage()
    for (const row of BAND_COVERAGE) {
      const guide = STATE_GUIDES.find((g) => g.abbr === row.abbr)!
      expect(
        container.querySelector(`a[href="/en/${guide.slug}"]`),
        `${row.abbr} guide link`,
      ).toBeTruthy()
      expect(row.source.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(
        container.querySelector(`a[href="${row.source.url}"]`),
        `${row.abbr} source link`,
      ).toBeTruthy()
    }
  })

  it('prerenders the coverage table and the Iowa rows in both locales', () => {
    requireFreshDist()
    for (const lang of ['en', 'es'] as const) {
      const dict = lang === 'en' ? en : es
      const html = readFileSync(
        join(process.cwd(), 'dist', lang, 'marching-band-heat-rules.html'),
        'utf-8',
      )
      expect(html).toContain(dict.marchingBand.coverageNamed)
      expect(html).toContain(dict.marchingBand.coverageAthleticsOnly)
      for (const row of IOWA_BAND_ROWS) {
        expect(html, `${lang} Iowa ${row.flag}`).toContain(row.sourceLabel)
      }
      for (const row of BAND_COVERAGE) {
        expect(html, `${lang} ${row.abbr} source`).toContain(row.source.url)
      }
      expect(html).toContain(dict.marchingBand.silenceNote)
      expect(html).not.toContain('{{')
    }
  })
})

/**
 * Tennessee's guide already told band directors TSSAA does not cover them.
 * Re-read from the PDF this batch (sha256 2b13368…): the document is one page,
 * its text extracts as mojibake behind a custom font encoding, and rendered at
 * 200 dpi it says nothing about band, cheer, music or any non-athletic
 * activity. The existing claim survives, so this pins it rather than changing
 * it — and pins it to BAND_COVERAGE so the two pages cannot drift apart.
 */
describe('the Tennessee scope claim survives a visual re-read', () => {
  it('agrees with the guide page that already made the claim', () => {
    const tn = BAND_COVERAGE.find((r) => r.abbr === 'TN')!
    expect(tn.coverage).toBe('athletics-only')
    for (const dict of [en, es]) {
      expect(dict.tennessee.scopeBody).toMatch(/marching band|banda de marcha/i)
      expect(dict.states.notes.tn).toMatch(
        /band not covered|no cubre banda/i,
      )
    }
  })
})
