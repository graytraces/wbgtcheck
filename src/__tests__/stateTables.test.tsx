import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { ReactElement } from 'react'
import i18n from '../i18n'
import en from '../locales/en.json'
import es from '../locales/es.json'
import Virginia from '../pages/Virginia'
import Florida from '../pages/Florida'
import NewYork from '../pages/NewYork'
import {
  VHSL_REFERENCE,
  VHSL_CANCEL_WBGT_F,
  VHSL_CANCEL_QUOTE,
  VHSL_LEVEL_COUNT,
  VHSL_ICE_LEVEL,
  VA_ICE_WBGT_F,
  VA_MIN_TIERS,
  FHSAA_PRACTICE_REFERENCE,
  FHSAA_NO_OUTDOOR_WBGT_F,
  FHSAA_NO_OUTDOOR_QUOTE,
  FHSAA_CONTEST_SECTION,
  FHSAA_CONTEST_SPORT_COUNT,
  FHSAA_CONTEST_REFERENCE_QUOTE,
  FHSAA_CONTEST_TOP_BAND_MIN_F,
  FHSAA_TRIGGER_WBGT_F,
  NYSPHSAA_WBGT_CATEGORIES,
  NYSPHSAA_WBGT_ACTIONS,
  NYSPHSAA_WBGT_BLACK_MIN_F,
  NYSPHSAA_WBGT_BLACK_QUOTE,
  NYSPHSAA_WBGT_SOURCE,
  CIF_CATEGORIES,
} from '../data/policyOracle'

/**
 * The three tables this site spent a day telling readers did not exist.
 *
 * Every expectation below is transcribed from the PRIMARY DOCUMENT, not from
 * the oracle — that is the point. Asserting `row.sourceLabel` against itself
 * would pass with any number in it, which is exactly how a wrong threshold
 * survives a green suite. The documents, all three re-read on 2026-08-10:
 *
 *   VHSL      p.8 "WET BULB GLOBE TEMPERATURE (WBGT) PARTICIPATION
 *             RECOMMENDATIONS", 9pp, sha256 3dd4bf78b5c74e97…
 *   FHSAA     2026-27 Handbook §41.8, p.106, 116pp, sha256 d983d6cac131b4e1…
 *   NYSPHSAA  Heat Index Procedure 5/23 p.2 (embedded image), 2pp,
 *             sha256 1d6f8e64aede79c1…
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

/** Parse "85.0-87.4" / "90.1 - 92.0" / "≥ 92.1" / "< 82.0" / "90.0 +". */
function bounds(label: string): { low: number | null; high: number | null } {
  const range = /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/.exec(label)
  if (range) return { low: Number(range[1]), high: Number(range[2]) }
  const open = /^[≥>]?\s*(\d+(?:\.\d+)?)\s*\+?$/.exec(label.replace('°F', '').trim())
  if (open) return { low: Number(open[1]), high: null }
  const under = /^[<]\s*(\d+(?:\.\d+)?)/.exec(label.replace('°F', '').trim())
  if (under) return { low: null, high: Number(under[1]) }
  throw new Error(`unparsed band label: ${label}`)
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('VHSL participation levels match the document', () => {
  // p.8, transcribed from the PDF.
  const DOCUMENT = [
    { level: 1, label: '<80' },
    { level: 2, label: '80.0-82.4' },
    { level: 3, label: '82.5-84.9' },
    { level: 4, label: '85.0-87.4' },
    { level: 5, label: '87.5-89.9' },
    { level: 6, label: '90.0 +' },
  ]

  it('carries every level the source prints, hottest first', () => {
    expect(VHSL_REFERENCE.rows).toHaveLength(DOCUMENT.length)
    expect(VHSL_LEVEL_COUNT).toBe(DOCUMENT.length)
    // Stored hottest first, like every other table in the oracle.
    expect(VHSL_REFERENCE.rows.map((r) => r.level)).toEqual(
      [...DOCUMENT].reverse().map((d) => d.level),
    )
    for (const { level, label } of DOCUMENT) {
      const row = VHSL_REFERENCE.rows.find((r) => r.level === level)
      expect(row, `Level ${level} missing`).toBeDefined()
      expect(row!.sourceLabel, `Level ${level}`).toBe(label)
    }
  })

  /**
   * § 22.1-271.10(B)(3), re-read 2026-08-11 from law.lis.virginia.gov: the
   * final tier outlines procedures for "the most severe heat or humidity level
   * BEFORE the level at which all outdoor athletics practices or games shall
   * be cancelled pursuant to subdivision 2". Five tiers plus a cancel line —
   * six levels — which is exactly what VHSL prints. The old copy said the
   * tiers escalate "up to the level at which activity is cancelled", under
   * which a division could believe a five-level ladder ending in "cancel"
   * complies, and be one modification tier short.
   */
  it('the statute\'s minimum tiers sit BELOW its cancel level, and the copy says so', () => {
    expect(VA_MIN_TIERS).toBe(5)
    expect(VHSL_LEVEL_COUNT).toBe(VA_MIN_TIERS + 1)
    for (const dict of [en, es]) {
      expect(dict.virginia.tiersBody).not.toMatch(
        /up to the level at which activity is cancelled|hasta aquel en que la actividad se cancela/i,
      )
      expect(dict.virginia.tiersBody).toMatch(/BEFORE|ANTES/)
    }
  })

  it('the levels never overlap, and never leave more than a tenth unassigned', () => {
    // VHSL does NOT use one boundary convention throughout, and a test that
    // assumed it does was wrong about the document rather than the other way
    // round. Level 1 is "<80" and Level 2 opens at "80.0" — exactly
    // contiguous. Every boundary above it steps by a tenth (82.4 → 82.5),
    // which leaves readings like 82.45 unassigned in the source itself.
    //
    // What must hold either way: no reading falls under two levels at once,
    // and no unassigned span is bigger than the tenth the source rounds to.
    const ascending = [...VHSL_REFERENCE.rows].reverse()
    for (let i = 0; i < ascending.length - 1; i += 1) {
      const here = bounds(ascending[i].sourceLabel)
      const next = bounds(ascending[i + 1].sourceLabel)
      const gap = (next.low as number) - (here.high as number)
      expect(gap, `Level ${ascending[i].level}→${ascending[i + 1].level} overlaps`).toBeGreaterThanOrEqual(0)
      expect(gap, `Level ${ascending[i].level}→${ascending[i + 1].level} gap`).toBeLessThanOrEqual(0.1001)
    }
    // Pin the one seam that is exactly contiguous, so a later edit that made
    // Level 1 "<79.9" would have to justify itself here.
    expect(bounds('<80').high).toBe(80)
    expect(bounds(VHSL_REFERENCE.rows[VHSL_REFERENCE.rows.length - 2].sourceLabel).low).toBe(80.0)
  })

  it('the top level is the cancel line at the documented reading', () => {
    const top = VHSL_REFERENCE.rows[0]
    expect(top.level).toBe(6)
    expect(bounds(top.sourceLabel).low).toBe(VHSL_CANCEL_WBGT_F)
    expect(VHSL_CANCEL_WBGT_F).toBe(90.0)
    // The source prints it in caps, and it stops all three activity kinds.
    expect(VHSL_CANCEL_QUOTE).toBe('NO OUTDOOR PRACTICES, SCRIMMAGES or COMPETITIONS')
    expect(top.textKeys).toContain('virginia.rows.cancel')
  })

  it('the statute\'s ice number lands on the level that first calls for ice', () => {
    // The cross-check that VHSL is the document § 22.1-271.10 points at.
    expect(VA_ICE_WBGT_F).toBe(80)
    expect(VHSL_ICE_LEVEL).toBe(2)
    const iceRow = VHSL_REFERENCE.rows.find((r) => r.level === VHSL_ICE_LEVEL)!
    expect(bounds(iceRow.sourceLabel).low).toBe(VA_ICE_WBGT_F)
    expect(iceRow.textKeys).toContain('virginia.rows.fluidWithIce')
    // Level 1 must NOT claim ice — the source says only "adequate fluid".
    const level1 = VHSL_REFERENCE.rows.find((r) => r.level === 1)!
    expect(level1.textKeys).toContain('virginia.rows.fluidAdequate')
    expect(level1.textKeys).not.toContain('virginia.rows.fluidWithIce')
  })

  it('the work/rest split appears only on the two levels that state one', () => {
    // Levels 4 and 5 carry hourly work/rest caps; 1-3 do not, and inventing
    // one for a cooler level would impose a limit VHSL never wrote.
    for (const row of VHSL_REFERENCE.rows) {
      const hasSplit = row.textKeys.includes('virginia.rows.durationWorkRest')
      expect(hasSplit, `Level ${row.level}`).toBe(row.level === 4 || row.level === 5)
    }
    const l4 = VHSL_REFERENCE.rows.find((r) => r.level === 4)!
    const l5 = VHSL_REFERENCE.rows.find((r) => r.level === 5)!
    expect(l4.vars).toMatchObject({ hours: 3, work: 45, rest: 15 })
    expect(l5.vars).toMatchObject({ hours: 2, work: 40, rest: 20 })
    // The hotter level must not permit the longer session.
    expect(l5.vars.hours!).toBeLessThan(l4.vars.hours!)
    expect(l5.vars.work!).toBeLessThan(l4.vars.work!)
    expect(l5.vars.rest!).toBeGreaterThan(l4.vars.rest!)
  })

  it('fluid volume and water breaks escalate with the reading', () => {
    // Per the document: 4-6 oz/20 min at L2, 6-8 at L3, 8-10/15 min at L4-5;
    // three water breaks per hour up to L3 and four from L4.
    const byLevel = Object.fromEntries(VHSL_REFERENCE.rows.map((r) => [r.level, r.vars]))
    expect(byLevel[2]).toMatchObject({ min: 4, max: 6, every: 20, breaks: 3 })
    expect(byLevel[3]).toMatchObject({ min: 6, max: 8, every: 20, breaks: 3 })
    expect(byLevel[4]).toMatchObject({ min: 8, max: 10, every: 15, breaks: 4 })
    expect(byLevel[5]).toMatchObject({ min: 8, max: 10, every: 15, breaks: 4 })
    expect(byLevel[6]).toMatchObject({ oz: 24 })
    for (const level of [2, 3, 4]) {
      expect(byLevel[level].min!).toBeLessThanOrEqual(byLevel[level + 1].min ?? Infinity)
    }
  })

  it('renders every level, the cancel quote and the oracle numbers (EN)', () => {
    renderAt('/en/virginia', <Virginia />)
    for (const { label } of DOCUMENT) {
      expect(screen.getAllByText(label).length, label).toBeGreaterThan(0)
    }
    // The sentence a Virginia coach is on this page for, verbatim.
    expect(
      screen.getByText((c) => c.includes(VHSL_CANCEL_QUOTE)),
    ).toBeInTheDocument()
    // Interpolated numbers must reach the DOM, not the placeholder.
    const l5 = VHSL_REFERENCE.rows.find((r) => r.level === 5)!
    expect(
      screen.getAllByText(
        (c) =>
          c.includes(String(l5.vars.work)) &&
          c.includes(String(l5.vars.rest)) &&
          c.includes(String(l5.vars.hours)),
      ).length,
    ).toBeGreaterThan(0)
  })
})

describe('FHSAA §41.8 practice index matches the handbook', () => {
  // p.106, transcribed from the PDF.
  const DOCUMENT = ['< 82.0', '82.1 - 87.0', '87.1 - 90.0', '90.1 - 92.0', '≥ 92.1']

  it('carries the five bands the section prints, hottest first', () => {
    expect(FHSAA_PRACTICE_REFERENCE.rows.map((r) => r.sourceLabel)).toEqual(
      [...DOCUMENT].reverse(),
    )
  })

  it('the bands tile without gap or overlap', () => {
    const ascending = [...FHSAA_PRACTICE_REFERENCE.rows].reverse()
    for (let i = 0; i < ascending.length - 1; i += 1) {
      const here = bounds(ascending[i].sourceLabel)
      const next = bounds(ascending[i + 1].sourceLabel)
      expect(next.low, ascending[i + 1].sourceLabel).toBeCloseTo((here.high as number) + 0.1, 5)
    }
  })

  it('the top band stops outdoor activity at the documented reading', () => {
    const top = FHSAA_PRACTICE_REFERENCE.rows[0]
    expect(bounds(top.sourceLabel).low).toBe(FHSAA_NO_OUTDOOR_WBGT_F)
    expect(FHSAA_NO_OUTDOOR_WBGT_F).toBe(92.1)
    expect(FHSAA_NO_OUTDOOR_QUOTE).toBe('No outdoor activities.')
    expect(top.textKeys).toEqual(['florida.rows.noOutdoor'])
  })

  it('rest breaks rise and activity time falls as the reading rises', () => {
    // 3 → 4 → 5 breaks of 4 minutes; 2 h → 1 h caps. A ladder that relaxed as
    // it got hotter is the failure this ordering check exists to catch.
    const byLabel = Object.fromEntries(
      FHSAA_PRACTICE_REFERENCE.rows.map((r) => [r.sourceLabel, r.vars]),
    )
    expect(byLabel['82.1 - 87.0']).toMatchObject({ breaks: 3, minutes: 4 })
    expect(byLabel['87.1 - 90.0']).toMatchObject({ breaks: 4, minutes: 4, hours: 2 })
    expect(byLabel['90.1 - 92.0']).toMatchObject({ breaks: 5, minutes: 4, hours: 1 })
    expect(byLabel['90.1 - 92.0'].hours!).toBeLessThan(byLabel['87.1 - 90.0'].hours!)
    expect(byLabel['90.1 - 92.0'].breaks!).toBeGreaterThan(byLabel['87.1 - 90.0'].breaks!)
  })

  it('only the 90.1-92.0 band drops the "per hour of activity" qualifier', () => {
    // The source writes "Five (5) separate four (4) minute rest breaks." with
    // no per-hour clause, inside a one-hour cap. Collapsing it into the
    // per-hour sentence would silently multiply the requirement.
    const byLabel = Object.fromEntries(
      FHSAA_PRACTICE_REFERENCE.rows.map((r) => [r.sourceLabel, r.textKeys]),
    )
    expect(byLabel['90.1 - 92.0']).toContain('florida.rows.breaks')
    expect(byLabel['90.1 - 92.0']).not.toContain('florida.rows.breaksPerHour')
    expect(byLabel['82.1 - 87.0']).toContain('florida.rows.breaksPerHour')
    expect(byLabel['87.1 - 90.0']).toContain('florida.rows.breaksPerHour')
  })

  it('the contest index stops HIGHER than the practice index forbids', () => {
    // §41.9.5's hottest band begins at 90.1 and prescribes hydration breaks;
    // §41.8 forbids outdoor activity at 92.1. So the practice table's top row
    // is NOT Florida's stop line for a game, and a page that implied it was
    // would be permissive in the direction that hurts. Read from pp.106-108.
    expect(FHSAA_CONTEST_TOP_BAND_MIN_F).toBe(90.1)
    expect(FHSAA_CONTEST_TOP_BAND_MIN_F).toBeLessThan(FHSAA_NO_OUTDOOR_WBGT_F)
    // The measurement trigger sits below every band that modifies activity.
    expect(FHSAA_TRIGGER_WBGT_F).toBe(82)
    const coolest = FHSAA_PRACTICE_REFERENCE.rows[FHSAA_PRACTICE_REFERENCE.rows.length - 1]
    expect(bounds(coolest.sourceLabel).high).toBeCloseTo(FHSAA_TRIGGER_WBGT_F, 5)
  })

  /**
   * The sports §41.9.5 names, counted off the matrix rather than recalled:
   * Football, Golf, Cross Country, Lacrosse, Soccer, Baseball, Softball,
   * Tennis, Track & Field, Beach Volleyball, Flag Football, Swimming & Diving,
   * Water Polo. Thirteen, re-counted 2026-08-11 from pp.106-108 of the pinned
   * handbook. It was 12, and /florida printed the number to readers.
   */
  it('the contest index is thirteen sports wide, and the page states it exactly', () => {
    expect(FHSAA_CONTEST_SPORT_COUNT).toBe(13)
    for (const dict of [en, es]) {
      // A counted number does not get hedged.
      expect(dict.florida.contestBody).not.toMatch(/about \{\{sports\}\}|unos \{\{sports\}\}/)
    }
    renderAt('/en/florida', <Florida />)
    expect(
      screen.getByText(
        i18n.t('florida.contestBody', {
          section: FHSAA_CONTEST_SECTION,
          sports: FHSAA_CONTEST_SPORT_COUNT,
          quote: FHSAA_CONTEST_REFERENCE_QUOTE,
          top: FHSAA_CONTEST_TOP_BAND_MIN_F,
        }),
      ),
    ).toBeInTheDocument()
  })

  it('renders every band and the oracle numbers (EN)', () => {
    renderAt('/en/florida', <Florida />)
    for (const label of DOCUMENT) {
      expect(screen.getAllByText(label).length, label).toBeGreaterThan(0)
    }
    expect(screen.getByText((c) => c.includes(FHSAA_NO_OUTDOOR_QUOTE))).toBeInTheDocument()
    // The one-hour band's five four-minute breaks must reach the DOM as
    // numbers, rendered from that row's own vars.
    const oneHour = FHSAA_PRACTICE_REFERENCE.rows.find(
      (r) => r.sourceLabel === '90.1 - 92.0',
    )!
    expect(
      screen.getByText(
        i18n.t('florida.rows.breaks', oneHour.vars as Record<string, number>),
      ),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(
        i18n.t('florida.rows.maxHours', oneHour.vars as Record<string, number>),
      ).length,
    ).toBeGreaterThan(0)
    // And the contest asymmetry must be stated where a coach will see it.
    expect(
      screen.getAllByText((c) => c.includes(String(FHSAA_CONTEST_TOP_BAND_MIN_F))).length,
    ).toBeGreaterThan(0)
  })
})

describe('NYSPHSAA WBGT chart matches the page-2 image', () => {
  // Transcribed from the extracted 1192x882 image, Cat 1 / 2 / 3.
  const DOCUMENT = {
    1: { black: '≥ 86.2°F', red: '84.2 - 86.0°F', orange: '81.1 - 84.0°F', yellow: '76.3 - 81.0°F', green: '< 76.1°F' },
    2: { black: '≥ 89.8°F', red: '87.8 - 89.6°F', orange: '84.7 - 87.6°F', yellow: '79.9 - 84.6°F', green: '< 79.7°F' },
    3: { black: '≥ 92.1°F', red: '90.1 - 91.9°F', orange: '87.1 - 90.0°F', yellow: '82.2 - 86.9°F', green: '< 82.0°F' },
  } as const

  it('carries all three categories with the labels the chart prints', () => {
    expect(NYSPHSAA_WBGT_CATEGORIES).toHaveLength(3)
    for (const category of NYSPHSAA_WBGT_CATEGORIES) {
      const expected = DOCUMENT[category.categoryNumber as 1 | 2 | 3]
      for (const band of category.bands) {
        expect(band.sourceLabel, `Cat ${category.categoryNumber} ${band.flag}`).toBe(
          expected[band.flag as keyof typeof expected],
        )
      }
      // Hottest first, five rows, one per flag.
      expect(category.bands.map((b) => b.flag)).toEqual([
        'black',
        'red',
        'orange',
        'yellow',
        'green',
      ])
    }
  })

  it('the black lines are the ones the oracle publishes, and they differ', () => {
    // Category 1 stops 5.9 °F cooler than Category 3. Showing one region's
    // number to another region is the specific harm this page guards against.
    expect(NYSPHSAA_WBGT_BLACK_MIN_F).toEqual({ cat1: 86.2, cat2: 89.8, cat3: 92.1 })
    for (const category of NYSPHSAA_WBGT_CATEGORIES) {
      const black = category.bands.find((b) => b.flag === 'black')!
      const key = `cat${category.categoryNumber}` as 'cat1' | 'cat2' | 'cat3'
      expect(bounds(black.sourceLabel).low).toBe(NYSPHSAA_WBGT_BLACK_MIN_F[key])
    }
    expect(NYSPHSAA_WBGT_BLACK_MIN_F.cat1).toBeLessThan(NYSPHSAA_WBGT_BLACK_MIN_F.cat2)
    expect(NYSPHSAA_WBGT_BLACK_MIN_F.cat2).toBeLessThan(NYSPHSAA_WBGT_BLACK_MIN_F.cat3)
  })

  it('is NOT the CIF object, however identical the numbers look today', () => {
    // Same numbers, different bodies and revisions. Sharing an object would
    // attribute a CIF verifiedOn to a NYSPHSAA claim.
    for (const nyCategory of NYSPHSAA_WBGT_CATEGORIES) {
      for (const cifCategory of CIF_CATEGORIES) {
        expect(nyCategory).not.toBe(cifCategory)
        expect(nyCategory.id).not.toBe(cifCategory.id)
      }
    }
    expect(NYSPHSAA_WBGT_SOURCE.url).toContain('nysphsaa')
    expect(NYSPHSAA_WBGT_SOURCE.verifiedOn).toBe('2026-08-10')
  })

  it('one action set serves all three ladders, escalating with the flag', () => {
    expect(NYSPHSAA_WBGT_ACTIONS.map((a) => a.flag)).toEqual([
      'black',
      'red',
      'orange',
      'yellow',
      'green',
    ])
    const byFlag = Object.fromEntries(NYSPHSAA_WBGT_ACTIONS.map((a) => [a.flag, a]))
    expect(byFlag.orange.vars).toMatchObject({ hours: 2, breaks: 4, minutes: 4 })
    expect(byFlag.red.vars).toMatchObject({ hours: 1, rest: 20 })
    expect(byFlag.yellow.vars).toMatchObject({ breaks: 3, minutes: 4 })
    expect(byFlag.green.vars).toMatchObject({ breaks: 3, minutes: 3 })
    expect(byFlag.red.vars.hours!).toBeLessThan(byFlag.orange.vars.hours!)
    // Only black stops outdoor work, and it does so with the source's sentence.
    expect(byFlag.black.textKeys).toEqual(['newYork.wbgtRows.noOutdoor'])
    expect(NYSPHSAA_WBGT_BLACK_QUOTE).toBe(
      'No outdoor workouts. Delay practice until a cooler WBGT is reached.',
    )
    // Football loses equipment at red, is restricted at orange, free below.
    expect(byFlag.red.textKeys).toContain('newYork.wbgtRows.footballNoEquipment')
    expect(byFlag.orange.textKeys).toContain('newYork.wbgtRows.footballEquipment')
    expect(byFlag.yellow.textKeys.join()).not.toMatch(/football/i)
  })

  it('renders all three ladders side by side and picks none (EN)', () => {
    renderAt('/en/new-york', <NewYork />)
    for (const category of NYSPHSAA_WBGT_CATEGORIES) {
      for (const band of category.bands) {
        expect(screen.getAllByText(band.sourceLabel).length, band.sourceLabel).toBeGreaterThan(0)
      }
    }
    // The two black lines whose difference is the reason for showing all three.
    expect(
      screen.getByText(
        (c) =>
          c.includes(String(NYSPHSAA_WBGT_BLACK_MIN_F.cat1)) &&
          c.includes(String(NYSPHSAA_WBGT_BLACK_MIN_F.cat2)),
      ),
    ).toBeInTheDocument()
  })
})

/**
 * House rule: every threshold lives in policyData.js. A digit in a row
 * sentence is a number no test can trace to a document — and in translation it
 * is a number nobody will ever re-check.
 */
describe('the new row copy carries no numbers of its own', () => {
  const NAMESPACES: Array<[string, (d: typeof en) => Record<string, string>]> = [
    ['virginia.rows', (d) => d.virginia.rows as Record<string, string>],
    ['florida.rows', (d) => d.florida.rows as Record<string, string>],
    ['newYork.wbgtRows', (d) => d.newYork.wbgtRows as Record<string, string>],
  ]

  it('no digit appears in any row sentence, in either locale', () => {
    for (const [name, pick] of NAMESPACES) {
      for (const [lang, dict] of [['en', en], ['es', es]] as const) {
        const rows = pick(dict)
        expect(Object.keys(rows).length, `${lang} ${name} is empty`).toBeGreaterThan(0)
        for (const [key, sentence] of Object.entries(rows)) {
          expect(sentence, `${lang} ${name}.${key} hardcodes a digit`).not.toMatch(/\d/)
        }
      }
    }
  })

  it('every placeholder a row uses is supplied by that row, in both locales', () => {
    // A placeholder with no var renders as literal "{{breaks}}" to a coach; a
    // var with no placeholder is a number that silently stopped being shown.
    const tables: Array<[string, Array<{ textKeys: string[]; vars: Record<string, number | undefined> }>]> = [
      ['VHSL', VHSL_REFERENCE.rows],
      ['FHSAA', FHSAA_PRACTICE_REFERENCE.rows],
      ['NYSPHSAA', NYSPHSAA_WBGT_ACTIONS],
    ]
    const QUOTE_VARS = new Set(['cancel'])
    for (const [name, rows] of tables) {
      for (const row of rows) {
        for (const [lang, dict] of [['en', en], ['es', es]] as const) {
          const used = new Set<string>()
          for (const key of row.textKeys) {
            const leaf = key
              .split('.')
              .reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], dict)
            expect(typeof leaf, `${lang} ${key} missing`).toBe('string')
            for (const m of (leaf as string).matchAll(/\{\{(\w+)\}\}/g)) used.add(m[1])
          }
          for (const placeholder of used) {
            if (QUOTE_VARS.has(placeholder)) continue
            expect(
              row.vars[placeholder],
              `${lang} ${name} row needs ${placeholder}`,
            ).toBeTypeOf('number')
          }
          for (const provided of Object.keys(row.vars)) {
            expect(used.has(provided), `${lang} ${name} row never shows ${provided}`).toBe(true)
          }
        }
      }
    }
  })

  it('renders no unresolved placeholder on any of the three pages', () => {
    for (const [path, element] of [
      ['/en/virginia', <Virginia />],
      ['/en/florida', <Florida />],
      ['/en/new-york', <NewYork />],
    ] as const) {
      const { container, unmount } = renderAt(path, element)
      expect(container.textContent, path).not.toContain('{{')
      unmount()
    }
  })
})

/**
 * One standing rule, applied to every table instead of two of them.
 *
 * GHSA_ORANGE and CIF_ORANGE both document why the mid-practice equipment
 * relaxation is not rendered: it governs a transition inside a practice
 * already under way, which the on-site instrument decides, while every surface
 * on this site is read before the practice starts. The two newest tables
 * (FHSAA §41.8 and the NYSPHSAA chart) printed the identical sentence anyway,
 * so the same rule ran two ways — and the inconsistency leaned permissive.
 */
describe('the mid-practice equipment relaxation is suppressed on every table', () => {
  const RELAXATION = {
    en: /continue to work ?out wearing (football pants|full pads)/i,
    es: /seguir entrenando con pantal[oó]n/i,
  }

  it('no locale string offers to keep the pads on when the reading rises', () => {
    expect(JSON.stringify(en)).not.toMatch(RELAXATION.en)
    expect(JSON.stringify(es)).not.toMatch(RELAXATION.es)
  })

  it('and no rendered state table does either', () => {
    for (const [path, element] of [
      ['/en/florida', <Florida />],
      ['/en/new-york', <NewYork />],
      ['/en/virginia', <Virginia />],
    ] as const) {
      const { container, unmount } = renderAt(path, element)
      expect(container.textContent ?? '', path).not.toMatch(RELAXATION.en)
      unmount()
    }
  })
})

/**
 * The P0 itself: three states were told their own numbers were unobtainable.
 * English was corrected in 09c3145 and Spanish was not, so this guards BOTH
 * locales against the claim coming back in either one.
 */
describe('no locale tells these three states their thresholds are unknowable', () => {
  const DENIALS = [
    /have not been able to open/i,
    /could not open/i,
    /no hemos podido abrir/i,
    /no pudimos abrir/i,
    /no honest page can tell you/i,
    /ninguna página honesta puede darle/i,
    /has no threshold table/i,
    /no tiene tabla de umbrales/i,
    // New York's overturned sentence. It named WBGT, so a test that only
    // looked for the term would have passed with the false claim in place:
    // what was wrong is the "but", which demoted the WBGT chart to a footnote
    // while NYSPHSAA's own suspension trigger names both scales at once.
    /but heat index is the ladder the thresholds are written for/i,
    /pero el índice de calor es la escala para la que están escritos los umbrales/i,
  ]

  it('the Virginia, Florida and New York pages make no such claim', () => {
    for (const [lang, dict] of [['en', en], ['es', es]] as const) {
      const prose = JSON.stringify([dict.virginia, dict.florida, dict.newYork, dict.states.notes])
      for (const pattern of DENIALS) {
        expect(prose, `${lang} still denies its own thresholds: ${pattern}`).not.toMatch(pattern)
      }
    }
  })

  /**
   * /en/virginia is prerendered, so its first sentence is what Google indexes
   * and what a coach reads first. It opened with a note about this site's own
   * editing history — "and this page said otherwise for a day" — which is a
   * changelog entry. The correction belongs in the commit message and in
   * CorrectionNote, which the page already carries.
   */
  it('the indexed first sentence is about Virginia, not about this site', () => {
    for (const dict of [en, es]) {
      expect(dict.virginia.intro).not.toMatch(/said otherwise|dijo lo contrario/i)
      expect(dict.virginia.intro).not.toMatch(/for a day|durante un día/i)
    }
  })

  it('each of the three says what its association actually publishes', () => {
    for (const [lang, dict] of [['en', en], ['es', es]] as const) {
      expect(dict.virginia.intro, `${lang} VA`).toMatch(/VHSL/)
      expect(dict.florida.pickerExclusionBody, `${lang} FL`).toMatch(/41\.8/)
      expect(dict.florida.pickerExclusionBody, `${lang} FL`).toMatch(/41\.9/)
      expect(dict.newYork.notWbgtBody, `${lang} NY`).toMatch(/WBGT/)
      // The chart note may recount the old claim, but only as a past error —
      // it has to end by pointing at the table that is now on the page.
      expect(dict.newYork.wbgtChartNote, `${lang} NY chart note`).toMatch(
        /reproduced below|reproduce más abajo/i,
      )
      // /states must agree with the guide pages it links to.
      expect(dict.states.notes.va, `${lang} VA note`).toMatch(/VHSL/)
      expect(dict.states.notes.fl, `${lang} FL note`).toMatch(/41\.9/)
      expect(dict.states.notes.ny, `${lang} NY note`).toMatch(/WBGT/)
    }
    // The specific overturned sentence: NY is not a heat-index-only state.
    expect(en.states.notes.ny).not.toMatch(/heat index, not WBGT/i)
    expect(es.states.notes.ny).not.toMatch(/índice de calor, no WBGT/i)
  })

  it('New York still says which category applies cannot be determined', () => {
    // Publishing the ladders must not turn into choosing one. The page carries
    // the region figure honestly and still refuses to read a school off it.
    for (const [lang, dict] of [['en', en], ['es', es]] as const) {
      expect(dict.newYork.categoryBody, `${lang}`).toMatch(
        /cannot tell you|no puede decírselo/i,
      )
      expect(dict.newYork.categoryFigureBody, `${lang}`).toContain('{{caption}}')
      expect(dict.newYork.categoryFigureBody, `${lang}`).toContain('{{strict}}')
      expect(dict.newYork.categoryFigureBody, `${lang}`).toContain('{{loose}}')
    }
  })
})
