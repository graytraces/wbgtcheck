import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import i18n from '../i18n'
import en from '../locales/en.json'
import es from '../locales/es.json'
import ForecastOrDevice from '../pages/ForecastOrDevice'
import Virginia from '../pages/Virginia'
import VerdictCard from '../components/VerdictCard'
import { requireFreshDist } from '../test/requireDist'
import {
  MEASUREMENT_STANCES,
  BAND_COVERAGE,
  NYSPHSAA_WBGT_SOURCE,
  KY_ONSITE_STRENGTHS,
  KY_REVISION,
  stanceOf,
  requiresOnSiteReading,
  POLICIES,
  KHSAA_WBGT_REFERENCE,
  NCHSAA_REFERENCE,
  NYSPHSAA_HEAT_INDEX_REFERENCE,
  VHSL_REFERENCE,
  FHSAA_PRACTICE_REFERENCE,
  UIL_CLASS_2,
  UIL_CLASS_3,
  GHSA,
  SCHSL,
  TSSAA,
  IOWA_CATEGORY_2,
  MIAA,
  GENERIC_NATA,
  CIF_CATEGORY_1,
  CIF_CATEGORY_2,
  CIF_CATEGORY_3,
  KY_FOOTBALL_ONSITE_QUOTE,
  KY_ONSITE_ONLY_QUOTE,
  NYSPHSAA_ZIP_QUOTE,
  NYSPHSAA_ONFIELD_WBGT_QUOTE,
  NYSPHSAA_REMOTE_SCALE,
  VHSL_FORECAST_NOT_REPLACE_QUOTE,
  VHSL_FORECAST_PLANNING_QUOTE,
  NCHSAA_DEVICE_QUOTE,
  classifyWbgt,
  isBorderline,
  type RemoteEstimateStance,
} from '../data/policyOracle'
import type { HourVerdict } from '../utils/verdict'
import { STATE_DIRECTORY } from '../data/stateDirectory'
import { STATE_GUIDES } from '../data/guideRegistry'

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

/** Mirrors the fixture in verdictCard.test.tsx — one hot hour, any policy. */
function hourAt(wbgtF: number): HourVerdict {
  return {
    time: Date.parse('2026-08-10T20:00:00+00:00'),
    wbgtF,
    source: 'nws',
    tempF: null,
    flag: classifyWbgt(UIL_CLASS_3, wbgtF).flag,
    borderline: isBorderline(UIL_CLASS_3, wbgtF),
    localHour: 15,
    localDate: '2026-08-10',
  }
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/en/forecast-or-device']}>
      <Routes>
        <Route path="/:lang/*" element={<ForecastOrDevice />} />
      </Routes>
    </MemoryRouter>,
  )

/** The page /states' Virginia note tells the reader to go and read. */
const renderVirginia = () =>
  render(
    <MemoryRouter initialEntries={['/en/virginia']}>
      <Routes>
        <Route path="/:lang/*" element={<Virginia />} />
      </Routes>
    </MemoryRouter>,
  )

/**
 * The three states whose `remoteEstimatesAllowed` was undefined until this
 * batch. Each value is pinned to the sentence that decides it, so deleting
 * the quote deletes the assertion — and each is checked against the modal
 * verb the source actually uses, which is where the previous KY overstatement
 * came from.
 */
describe('the three measurement-stance gaps are filled from the documents', () => {
  it('Kentucky takes the strictest of its three strengths', () => {
    expect(KHSAA_WBGT_REFERENCE.remoteEstimatesAllowed).toBe('device-required')
    // The sentence that earns 'device-required' is unconditional and names
    // the prohibition. If it ever softens, this stance has to be re-derived.
    expect(KY_FOOTBALL_ONSITE_QUOTE).toContain('must be taken')
    expect(KY_FOOTBALL_ONSITE_QUOTE).toContain('no off-site measurement permitted')
    expect(KY_FOOTBALL_ONSITE_QUOTE).not.toMatch(/recommend/i)
  })

  it('North Carolina is recommended, not required — the source says "should"', () => {
    expect(NCHSAA_REFERENCE.remoteEstimatesAllowed).toBe('device-recommended')
    expect(NCHSAA_DEVICE_QUOTE).toContain('should be measured')
    // Promoting NCHSAA to device-required would claim a mandate the handbook
    // does not write. The word "must" is not in this sentence.
    expect(NCHSAA_DEVICE_QUOTE).not.toContain('must')
    expect(NCHSAA_DEVICE_QUOTE).toContain('scientifically approved device')
  })

  it('New York is a WBGT claim, and its remote lookup is a heat-index one', () => {
    expect(NYSPHSAA_HEAT_INDEX_REFERENCE.remoteEstimatesAllowed).toBe('device-recommended')
    // The distinction the page must not blur, pinned in both directions.
    expect(NYSPHSAA_REMOTE_SCALE).toBe('heat-index')
    expect(NYSPHSAA_ZIP_QUOTE).toContain('zip code')
    expect(NYSPHSAA_ZIP_QUOTE).toContain('THI')
    // The WBGT leg names the field every time it appears.
    expect(NYSPHSAA_ONFIELD_WBGT_QUOTE).toContain('on the field')
    expect(NYSPHSAA_ONFIELD_WBGT_QUOTE).toContain('Wet Bulb Globe Temperature Indicator')
    // …and the ZIP sentence must never be the one that sets the stance.
    expect(NYSPHSAA_ZIP_QUOTE).not.toContain('on the field')
  })

  it('every jurisdiction on the page now declares a stance', () => {
    expect(MEASUREMENT_STANCES.length).toBe(12)
    for (const row of MEASUREMENT_STANCES) {
      expect(
        ['yes', 'device-required', 'device-recommended', 'unspecified'],
        `${row.abbr} stance`,
      ).toContain(stanceOf(row))
    }
  })
})

/**
 * The hazard comment on CIF_CATEGORY_1 says `remoteEstimatesAllowed: 'yes'` is
 * safe only while those objects stay out of POLICIES, because 'yes' suppresses
 * the device warning on the verdict and share cards. This batch added the
 * field to five more objects; none of them may reach that code path either.
 *
 * The guard is the whole POLICIES map rather than the new objects, because
 * that is the set the cards can be handed — a future object added to POLICIES
 * with the wrong stance is caught here whatever it is called.
 */
describe('nothing added here can change what a verdict card says', () => {
  it('the pickable policies are exactly the eight, with their stances unmoved', () => {
    expect(Object.keys(POLICIES).sort()).toEqual([
      'generic',
      'ghsa',
      'iowa',
      'miaa',
      'schsl',
      'tssaa',
      'uil-class-2',
      'uil-class-3',
    ])
    const before: Record<string, RemoteEstimateStance> = {
      'uil-class-2': 'yes',
      'uil-class-3': 'yes',
      ghsa: 'device-required',
      schsl: 'device-required',
      tssaa: 'device-recommended',
      iowa: 'device-recommended',
      miaa: 'device-required',
      generic: 'unspecified',
    }
    for (const [id, policy] of Object.entries(POLICIES)) {
      expect(policy.remoteEstimatesAllowed, `${id} stance moved`).toBe(before[id])
    }
    // Belt and braces on the objects themselves, so a rename cannot hide it.
    expect(UIL_CLASS_2.remoteEstimatesAllowed).toBe('yes')
    expect(UIL_CLASS_3.remoteEstimatesAllowed).toBe('yes')
    expect(GHSA.remoteEstimatesAllowed).toBe('device-required')
    expect(SCHSL.remoteEstimatesAllowed).toBe('device-required')
    expect(TSSAA.remoteEstimatesAllowed).toBe('device-recommended')
    expect(IOWA_CATEGORY_2.remoteEstimatesAllowed).toBe('device-recommended')
    expect(MIAA.remoteEstimatesAllowed).toBe('device-required')
    expect(GENERIC_NATA.remoteEstimatesAllowed).toBe('unspecified')
  })

  it('the five newly-stanced objects are not policies the picker can hand a card', () => {
    const pickable = new Set(Object.values(POLICIES))
    for (const table of [
      KHSAA_WBGT_REFERENCE,
      NCHSAA_REFERENCE,
      NYSPHSAA_HEAT_INDEX_REFERENCE,
      VHSL_REFERENCE,
      FHSAA_PRACTICE_REFERENCE,
    ]) {
      expect(pickable.has(table as never), `${table.id} reached POLICIES`).toBe(false)
      // A reference table has rows, not bands: classifyWbgt cannot take one.
      expect((table as unknown as { bands?: unknown }).bands).toBeUndefined()
    }
    // CIF's hazard, unchanged: three 'yes' ladders still outside the picker.
    for (const cat of [CIF_CATEGORY_1, CIF_CATEGORY_2, CIF_CATEGORY_3]) {
      expect(cat.remoteEstimatesAllowed).toBe('yes')
      expect(pickable.has(cat)).toBe(false)
    }
  })

  /**
   * The behavioural half. `requiresOnSiteReading` was widened from HeatPolicy
   * to MeasurementSubject in this batch; the card's rendering must be byte-for
   * byte what it was for each of the eight pickable policies.
   */
  it('renders the same compliance line for every pickable policy as before', () => {
    const expected: Record<string, string | null> = {
      'uil-class-2': null,
      'uil-class-3': null,
      generic: null,
      ghsa: 'verdict.deviceOnlyNotice',
      schsl: 'verdict.deviceOnlyNotice',
      miaa: 'verdict.deviceOnlyNotice',
      tssaa: 'verdict.deviceRecommendedNotice',
      iowa: 'verdict.deviceRecommendedNotice',
    }
    for (const [id, policy] of Object.entries(POLICIES)) {
      const key = expected[id]
      expect(requiresOnSiteReading(policy), `${id} on-site requirement`).toBe(key !== null)
      if (key === null) continue
      const rendered = i18n.t(key, { body: policy.source.name.split(' ')[0] })
      const view = render(
        <MemoryRouter initialEntries={['/en']}>
          <VerdictCard
            hour={hourAt(88)}
            policy={policy}
            locationLabel="Austin, TX"
            stateAbbr="TX"
            timeZone="America/Chicago"
          />
        </MemoryRouter>,
      )
      expect(screen.getByText(rendered), `${id} compliance line`).toBeInTheDocument()
      view.unmount()
    }
  })
})

describe('the /forecast-or-device page', () => {
  it('shows a stance for every jurisdiction it lists', () => {
    const { container } = renderPage()
    const rows = container.querySelectorAll('table[aria-labelledby="stance-table-heading"] tbody tr')
    expect(rows).toHaveLength(MEASUREMENT_STANCES.length)
    const labels: Record<RemoteEstimateStance, string> = {
      yes: en.forecastOrDevice.stanceYes,
      'device-required': en.forecastOrDevice.stanceDeviceRequired,
      'device-recommended': en.forecastOrDevice.stanceDeviceRecommended,
      unspecified: en.forecastOrDevice.stanceUnspecified,
    }
    for (const [i, row] of [...rows].entries()) {
      const entry = MEASUREMENT_STANCES[i]
      expect(row.textContent).toContain(entry.abbr)
      expect(row.textContent, `${entry.abbr} stance label`).toContain(labels[stanceOf(entry)])
    }
  })

  /**
   * The stance shown is READ from the oracle rather than restated, which is
   * the property that keeps this page and the verdict card from disagreeing.
   * Asserting the rendered label per state is the only way to check it — the
   * previous shape of this bug on /states was a hand-written list that went
   * stale silently.
   */
  it('agrees with /states about how each state must measure', () => {
    const directory = Object.fromEntries(STATE_DIRECTORY.map((r) => [r.abbr, r.measurement]))
    // Two documents answer differently on two scales, and each declares which
    // — derived from the oracle, never a hardcoded "except NY and TN".
    const split = MEASUREMENT_STANCES.filter((r) => r.subject.remoteScale)
    expect(split.map((r) => r.abbr)).toEqual(['NY', 'TN'])
    for (const row of MEASUREMENT_STANCES) {
      if (row.subject.remoteScale) continue
      const expected = stanceOf(row) === 'yes' ? 'apps-allowed' : 'device-required'
      expect(directory[row.abbr], `${row.abbr}: /states vs this page`).toBe(expected)
    }
  })

  /**
   * The one place the two surfaces can look like they contradict each other.
   * /states files New York as apps-allowed, which is true of the heat-index
   * lane NYSPHSAA really does tell schools to read by ZIP code; this page says
   * the WBGT lane is on the field, which is true of the same document.
   *
   * Neither is wrong and both are dangerous alone, so BOTH surfaces have to
   * carry the split. Without this the site says "Apps allowed" to a New York
   * coach reading a WBGT number.
   */
  it('carries both scale splits on both surfaces, in both locales', () => {
    for (const abbr of ['NY', 'TN'] as const) {
      const row = MEASUREMENT_STANCES.find((r) => r.abbr === abbr)!
      expect(row.subject.remoteScale, `${abbr} declared scale`).toBe('heat-index')
      expect(row.subject.remoteEstimatesAllowed, `${abbr} WBGT stance`).toBe(
        'device-recommended',
      )
      expect(STATE_DIRECTORY.find((r) => r.abbr === abbr)!.measurement).toBe('apps-allowed')
      for (const dict of [en, es]) {
        // /states must name the scale the app route belongs to.
        expect(
          dict.states.notes[abbr.toLowerCase() as 'ny' | 'tn'],
          `${abbr} /states note`,
        ).toMatch(/heat[- ]index|índice de calor/i)
      }
    }
    for (const dict of [en, es]) {
      // New York's WBGT lane must not be left sounding equally app-readable.
      expect(dict.states.notes.ny).toMatch(/on the field|en el campo/i)
      // Tennessee's permission must keep both of its limits.
      expect(dict.states.notes.tn).toMatch(/heat index only|solo.*índice de calor/i)
      // …and this page carries the New York half in prose.
      expect(dict.forecastOrDevice.newYorkBody).toMatch(/heat index|índice de calor/i)
      // The two permissions must never be described as the same thing: only
      // New York's is a remote lookup, and only Tennessee's is a last resort.
      expect(dict.forecastOrDevice.recommendedBody).toMatch(
        /last resort|último recurso/i,
      )
    }
  })

  /**
   * The section in a source `name` is printed to readers, so it is a claim.
   * Both sentences NYSPHSAA contributes outside the chart are bullets on page
   * 1, and both were cited to "p.2 WBGT chart" — sending anyone who checked
   * the citation to the wrong page of a two-page PDF.
   */
  it('cites NYSPHSAA page-1 sentences to a page-1 source', () => {
    const rows = [
      ...MEASUREMENT_STANCES.filter((r) => r.abbr === 'NY'),
      ...BAND_COVERAGE.filter((r) => r.abbr === 'NY'),
    ]
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row.source.name, 'page-1 sentence cited to the p.2 chart').not.toMatch(/p\.2/)
      expect(row.source.name).toContain('p.1')
      // Same document, so the same URL and the same read date.
      expect(row.source.url).toBe(NYSPHSAA_WBGT_SOURCE.url)
      expect(row.source.verifiedOn).toBe(NYSPHSAA_WBGT_SOURCE.verifiedOn)
    }
    // The chart's own source keeps its own section.
    expect(NYSPHSAA_WBGT_SOURCE.name).toContain('p.2')
  })

  it('quotes the sentence that decides each stance, not a summary of it', () => {
    const { container } = renderPage()
    const text = container.textContent ?? ''
    // The four load-bearing quotations that the argument rests on.
    expect(text).toContain(VHSL_FORECAST_PLANNING_QUOTE)
    expect(text).toContain(VHSL_FORECAST_NOT_REPLACE_QUOTE)
    expect(text).toContain(NYSPHSAA_ZIP_QUOTE)
    expect(text).toContain(NYSPHSAA_ONFIELD_WBGT_QUOTE)
    expect(text).not.toContain('{{')
  })

  /**
   * The page's own header comment says the deciding sentence is shown "because
   * the classification is a judgement and the reader is entitled to check it".
   * For a while it said that while the table rendered the badge alone and
   * `colSays` sat unused in both locales.
   */
  it('shows each row its own deciding sentence, and labels what it is', () => {
    const { container } = renderPage()
    const text = container.textContent ?? ''
    for (const row of MEASUREMENT_STANCES) {
      expect(text, `${row.abbr}'s deciding sentence is not on the page`).toContain(row.quote)
    }
    // The label a reader who cannot see the layout needs to know what those
    // twelve quotations are doing in the second column.
    expect(text).toContain(en.forecastOrDevice.colSays)
  })

  /**
   * /states and /kentucky both say khsaa.org cannot be reached and the
   * document was read from an archive capture; this page printed "read
   * 2026-08-10" beside the Kentucky row like every other source and said
   * nothing.
   */
  it('carries the Kentucky currency caveat beside its Kentucky section', () => {
    const { container } = renderPage()
    const text = container.textContent ?? ''
    expect(text).toContain(
      i18n.t('forecastOrDevice.kentuckyCurrencyNote', { revision: KY_REVISION }),
    )
    for (const dict of [en, es]) {
      expect(dict.forecastOrDevice.kentuckyCurrencyNote).toContain('{{revision}}')
      expect(dict.forecastOrDevice.kentuckyCurrencyNote).toMatch(/archive|archivo/i)
    }
  })

  /**
   * policyData.js carries a Directive: any surface that renders Kentucky's
   * single stance must render KY_ONSITE_STRENGTHS beside it, because the
   * stance is the strictest of three and shown alone it overstates nine
   * sports. This is that Directive as a test.
   */
  it('never shows Kentucky\'s summary stance without the per-sport breakdown', () => {
    const { container } = renderPage()
    const text = container.textContent ?? ''
    expect(KY_ONSITE_STRENGTHS).toHaveLength(5)
    expect(text).toContain(KY_FOOTBALL_ONSITE_QUOTE)
    expect(text).toContain(KY_ONSITE_ONLY_QUOTE)
    // The all-sports column has no quote at all, and the page has to say so
    // rather than leaving the reader to infer the football rule covers it.
    expect(text).toContain(en.forecastOrDevice.kentuckyUnstatedBody)
    expect(text).toContain(en.forecastOrDevice.kentuckyStrengthMust)
    expect(text).toContain(en.forecastOrDevice.kentuckyStrengthRecommended)
    expect(text).toContain(en.forecastOrDevice.kentuckyStrengthUnstated)
  })

  it('never claims New York permits a remote WBGT reading', () => {
    for (const dict of [en, es]) {
      const body = dict.forecastOrDevice.newYorkBody
      // The correction has to be present, in both languages: the ZIP sentence
      // is quoted, and the page immediately says which scale it belongs to.
      expect(body).toContain('{{zip}}')
      expect(body).toContain('{{onField}}')
      expect(body).toMatch(/heat index|índice de calor/i)
    }
    // And the summary label for NY may not be the permissive one.
    const ny = MEASUREMENT_STANCES.find((r) => r.abbr === 'NY')!
    expect(stanceOf(ny)).not.toBe('yes')
  })

  it('links each state to its own guide', () => {
    const { container } = renderPage()
    for (const row of MEASUREMENT_STANCES) {
      const guide = STATE_GUIDES.find((g) => g.abbr === row.abbr)!
      expect(
        container.querySelector(`a[href="/en/${guide.slug}"]`),
        `${row.abbr} has no route to its guide`,
      ).toBeTruthy()
    }
  })

  it('cites a dated source for every row', () => {
    const { container } = renderPage()
    for (const row of MEASUREMENT_STANCES) {
      expect(row.source.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(
        container.querySelector(`a[href="${row.source.url}"]`),
        `${row.abbr} source link`,
      ).toBeTruthy()
      expect(container.textContent).toContain(row.source.verifiedOn)
    }
  })

  /** Prerendered HTML is what a crawler and a JS-off reader get. */
  it('prerenders the stance table in both locales', () => {
    requireFreshDist()
    for (const lang of ['en', 'es'] as const) {
      const dict = lang === 'en' ? en : es
      const html = readFileSync(
        join(process.cwd(), 'dist', lang, 'forecast-or-device.html'),
        'utf-8',
      )
      for (const row of MEASUREMENT_STANCES) {
        expect(html, `${lang} missing ${row.abbr}`).toContain(`<th scope="row">`)
        expect(html, `${lang} missing ${row.abbr} source`).toContain(row.source.url)
      }
      expect(html).toContain(dict.forecastOrDevice.stanceDeviceRequired)
      expect(html).toContain(dict.forecastOrDevice.stanceYes)
      // The Kentucky breakdown travels into the prerender too.
      expect(html, `${lang} Kentucky breakdown`).toContain(
        dict.forecastOrDevice.kentuckyStrengthUnstated,
      )
      expect(html).not.toContain('{{')
    }
  })
})

/**
 * Virginia's directory row said "measurement method not regulated". VHSL
 * regulates it in a paragraph of its own, and this batch found it — the same
 * mistake VA's ladder classification made a day earlier, in the adjacent
 * column: a document nobody had read recorded as a document that does not
 * exist.
 */
describe('Virginia: the method is regulated after all', () => {
  it('VHSL states the forecast/instrument split itself', () => {
    expect(VHSL_FORECAST_PLANNING_QUOTE).toMatch(/Forecasting tools/)
    expect(VHSL_FORECAST_NOT_REPLACE_QUOTE).toContain('should never replace')
    expect(VHSL_FORECAST_NOT_REPLACE_QUOTE).toContain('on-site at the activity location')
    expect(VHSL_REFERENCE.remoteEstimatesAllowed).toBe('device-recommended')
  })

  it('the directory row and its note no longer say the method is unregulated', () => {
    const va = STATE_DIRECTORY.find((r) => r.abbr === 'VA')!
    expect(va.measurement).toBe('device-required')
    expect(en.states.notes.va).not.toMatch(/method not regulated/i)
    expect(es.states.notes.va).not.toMatch(/método no (est[áa] )?regulad/i)
    // …and it says what VHSL actually says instead.
    expect(en.states.notes.va).toMatch(/should never replace/)
    expect(es.states.notes.va).toMatch(/should never replace/)
  })

  /**
   * The gap this test exists to close: the note above says "see the Virginia
   * guide", and the guide said measurement was unregulated. The previous
   * assertion pinned the /states note and never rendered the page it points
   * at, so the contradiction shipped green. This renders the destination.
   */
  it('the guide the note sends readers to carries the VHSL paragraph itself', () => {
    const { container } = renderVirginia()
    const text = container.textContent ?? ''
    expect(text).toContain(VHSL_FORECAST_PLANNING_QUOTE)
    expect(text).toContain(VHSL_FORECAST_NOT_REPLACE_QUOTE)
    expect(text).not.toContain('{{')
  })

  it('scopes the silence to the statute rather than to Virginia', () => {
    for (const dict of [en, es]) {
      // A heading that says measurement is unregulated contradicts the row on
      // /states and the paragraph directly beneath it.
      expect(dict.virginia.measurementHeading).not.toMatch(
        /not regulated|no está regulada/i,
      )
      expect(dict.virginia.measurementHeading).toMatch(/statute|estatuto/i)
      expect(dict.virginia.vhslMeasurementBody).toContain('{{planning}}')
      expect(dict.virginia.vhslMeasurementBody).toContain('{{notReplace}}')
    }
  })
})
