import { describe, it, expect } from 'vitest'
import {
  POLICIES,
  UIL_CLASS_2,
  UIL_CLASS_3,
  GHSA,
  SCHSL,
  TSSAA,
  IOWA_CATEGORY_2,
  MIAA,
  MIAA_DEVICE_QUOTE,
  MIAA_COMPETITION_QUOTE,
  MIAA_COOLING_ZONE_WBGT_F,
  MIAA_TABLE_SCOPE_QUOTE,
  MIAA_NO_GAMES_FOOTNOTE_QUOTE,
  KHSAA_WBGT_REFERENCE,
  KY_OFFSITE_INVALID_QUOTE,
  CIF_CATEGORIES,
  CIF_CATEGORY_1,
  CIF_CATEGORY_3,
  CIF_NO_DEVICE_QUOTE,
  CIF_NOAA_TOOL_URL,
  FL_ONSITE_MEASUREMENT_QUOTE,
  FL_YEAR_ROUND_QUOTE,
  FL_STATUTE_SOURCE,
  GENERIC_NATA,
  NCHSAA_REFERENCE,
  NYSPHSAA_HEAT_INDEX_REFERENCE,
  classifyWbgt,
  isBorderline,
  nextBandBoundary,
  requiresOnSiteReading,
  BORDERLINE_MARGIN_F,
  REMOTE_UNDERESTIMATE_MIN_C,
  REMOTE_UNDERESTIMATE_MAX_C,
  REMOTE_UNDERESTIMATE_MIN_F,
  REMOTE_UNDERESTIMATE_MAX_F,
  UIL_EFFECTIVE_DATE,
  UIL_READING_BEFORE_PRACTICE_MAX_MINUTES,
  UIL_READING_INTERVAL_MINUTES,
  GHSA_READING_INTERVAL_MINUTES,
  GHSA_CALIBRATION_INTERVAL_YEARS,
  SCHSL_READING_INTERVAL_MINUTES,
  SCHSL_CALIBRATION_INTERVAL_YEARS,
  SCHSL_RANGE_HOLD_MINUTES,
  SCHSL_COLD_IMMERSION_WBGT_F,
  IOWA_READING_INTERVAL_MINUTES,
  IOWA_AMBIENT_TRIGGER_F,
  IOWA_CATEGORY_NUMBER,
  NYSPHSAA_AMBIENT_TRIGGER_F,
  VA_ICE_WBGT_F,
  VA_MIN_TIERS,
  UIL_INSTRUMENT_OR_INTERNET_QUOTE,
  UIL_FAQ_FORECAST_QUOTE,
  UIL_FAQ_SOURCE,
  UIL_MANDATE_2026_QUOTE,
  UIL_RECORDKEEPING_QUOTE,
  UIL_READING_MUST_QUOTE,
  UIL_INTERNET_CADENCE_QUOTE,
  UIL_LINKED_TOOL,
  GHSA_NO_APPS_QUOTE,
  GHSA_MONITOR_EVERY_PRACTICE_QUOTE,
  GHSA_REMINDER_SOURCE,
  GHSA_INSTRUMENT_QUOTE,
  GHSA_POLICY_YEAR_ROUND_QUOTE,
  GHSA_RANGE_HOLD_MINUTES,
  GHSA_RANGE_HOLD_QUOTE,
  GHSA_NO_REVERT_QUOTE,
  GHSA_ESCALATE_QUOTE,
  SCHSL_CONTINUOUS_QUOTE,
} from '../data/policyOracle'
import type { FlagColor, HeatPolicy } from '../data/policyOracle'
import { guidelineSentences } from '../lib/guidelineSentences.js'
import en from '../locales/en.json'
import es from '../locales/es.json'

function flagAt(policy: HeatPolicy, f: number): FlagColor {
  return classifyWbgt(policy, f).flag
}

describe('policy oracle — band boundaries vs primary sources', () => {
  it('UIL Class 3 boundaries match the 25-26 WBGT chart', () => {
    expect(flagAt(UIL_CLASS_3, 81.9)).toBe('green')
    expect(flagAt(UIL_CLASS_3, 82.0)).toBe('yellow')
    expect(flagAt(UIL_CLASS_3, 86.9)).toBe('yellow')
    expect(flagAt(UIL_CLASS_3, 87.0)).toBe('orange')
    expect(flagAt(UIL_CLASS_3, 90.0)).toBe('orange')
    expect(flagAt(UIL_CLASS_3, 90.1)).toBe('red')
    expect(flagAt(UIL_CLASS_3, 92.0)).toBe('red')
    expect(flagAt(UIL_CLASS_3, 92.1)).toBe('black')
  })

  it('UIL Class 2 boundaries match the 25-26 WBGT chart', () => {
    expect(flagAt(UIL_CLASS_2, 79.6)).toBe('green')
    expect(flagAt(UIL_CLASS_2, 79.7)).toBe('yellow')
    expect(flagAt(UIL_CLASS_2, 84.6)).toBe('yellow')
    expect(flagAt(UIL_CLASS_2, 84.7)).toBe('orange')
    expect(flagAt(UIL_CLASS_2, 87.6)).toBe('orange')
    expect(flagAt(UIL_CLASS_2, 87.7)).toBe('red')
    expect(flagAt(UIL_CLASS_2, 89.7)).toBe('red')
    expect(flagAt(UIL_CLASS_2, 89.8)).toBe('black')
  })

  it('GHSA boundaries match By-law 2.67 (92.0 itself is red; black is "Over 92.0")', () => {
    expect(flagAt(GHSA, 81.9)).toBe('green')
    expect(flagAt(GHSA, 82.0)).toBe('yellow')
    expect(flagAt(GHSA, 86.9)).toBe('yellow')
    expect(flagAt(GHSA, 87.0)).toBe('orange')
    expect(flagAt(GHSA, 89.9)).toBe('orange')
    expect(flagAt(GHSA, 90.0)).toBe('red')
    expect(flagAt(GHSA, 92.0)).toBe('red')
    expect(flagAt(GHSA, 92.01)).toBe('black')
  })

  it('generic NATA fallback resolves the 92.0-92.1 source gap upward (conservative)', () => {
    expect(flagAt(GENERIC_NATA, 92.0)).toBe('red')
    expect(flagAt(GENERIC_NATA, 92.05)).toBe('black')
  })

  it('SCHSL boundaries match the April 2024 heat guidelines table', () => {
    expect(flagAt(SCHSL, 81.9)).toBe('green')
    expect(flagAt(SCHSL, 82.0)).toBe('yellow')
    expect(flagAt(SCHSL, 86.9)).toBe('yellow')
    expect(flagAt(SCHSL, 87.0)).toBe('orange')
    expect(flagAt(SCHSL, 89.9)).toBe('orange')
    expect(flagAt(SCHSL, 90.0)).toBe('red')
    expect(flagAt(SCHSL, 92.0)).toBe('red')
    // Source disagrees with itself above 92 ("Over 92.1" vs "at 92.1 or
    // above"); resolved upward like GENERIC_NATA.
    expect(flagAt(SCHSL, 92.05)).toBe('black')
  })

  it('TSSAA boundaries match the October 2024 heat policy', () => {
    expect(flagAt(TSSAA, 81.9)).toBe('green')
    expect(flagAt(TSSAA, 82.0)).toBe('yellow')
    expect(flagAt(TSSAA, 86.9)).toBe('yellow')
    expect(flagAt(TSSAA, 87.0)).toBe('orange')
    expect(flagAt(TSSAA, 89.9)).toBe('orange')
    expect(flagAt(TSSAA, 90.0)).toBe('red')
    expect(flagAt(TSSAA, 92.0)).toBe('red')
    expect(flagAt(TSSAA, 92.01)).toBe('black')
  })

  it('Iowa Category 2 boundaries match the joint WBGT guidance table', () => {
    expect(flagAt(IOWA_CATEGORY_2, 79.6)).toBe('green')
    // Source prints "< 79.7" then "79.8 – 84.6"; 79.7 resolves upward.
    expect(flagAt(IOWA_CATEGORY_2, 79.7)).toBe('yellow')
    expect(flagAt(IOWA_CATEGORY_2, 84.6)).toBe('yellow')
    expect(flagAt(IOWA_CATEGORY_2, 84.7)).toBe('orange')
    expect(flagAt(IOWA_CATEGORY_2, 87.6)).toBe('orange')
    expect(flagAt(IOWA_CATEGORY_2, 87.7)).toBe('red')
    expect(flagAt(IOWA_CATEGORY_2, 89.7)).toBe('red')
    expect(flagAt(IOWA_CATEGORY_2, 89.8)).toBe('black')
  })

  it('Iowa classifies identically to UIL Class 2 (both derive from Category 2)', () => {
    // Two independent documents, same national region set — a cross-check that
    // catches either file drifting from its source. Compared by classification
    // at reporting precision (0.1 °F) rather than by raw minF, because the two
    // sources encode the top boundary differently: UIL prints "≥89.8" where
    // Iowa prints "> 89.7". Identical at every tenth, different as numbers.
    for (let tenths = 750; tenths <= 950; tenths++) {
      const f = tenths / 10
      expect(flagAt(IOWA_CATEGORY_2, f), `mismatch at ${f} °F`).toBe(flagAt(UIL_CLASS_2, f))
    }
  })
})

describe('policy oracle — guideline facts vs primary sources', () => {
  it('UIL orange caps practice at 2h with 4×4-min breaks; red caps at 1h with 20 min rest', () => {
    const orange = UIL_CLASS_3.bands.find((b) => b.flag === 'orange')!
    expect(orange.guideline.maxPracticeMinutes).toBe(120)
    expect(orange.guideline.restBreaksPerHour).toBe(4)
    expect(orange.guideline.restBreakMinMinutes).toBe(4)
    expect(orange.guideline.footballEquipment).toBe('helmet-shoulder-pads-shorts')

    const red = UIL_CLASS_3.bands.find((b) => b.flag === 'red')!
    expect(red.guideline.maxPracticeMinutes).toBe(60)
    expect(red.guideline.restMinutesPerHour).toBe(20)
    expect(red.guideline.footballEquipment).toBe('none')
    expect(red.guideline.noConditioning).toBe(true)
  })

  it('UIL mandates the rapid cooling zone from yellow upward (chart wording)', () => {
    for (const policy of [UIL_CLASS_2, UIL_CLASS_3]) {
      for (const flag of ['yellow', 'orange', 'red'] as const) {
        expect(policy.bands.find((b) => b.flag === flag)!.guideline.coolingZoneRequired).toBe(true)
      }
      expect(policy.bands.find((b) => b.flag === 'green')!.guideline.coolingZoneRequired).toBe(false)
    }
  })

  it('UIL Class 2 and Class 3 share guidelines — only thresholds differ', () => {
    for (const flag of ['green', 'yellow', 'orange', 'red', 'black'] as const) {
      expect(UIL_CLASS_2.bands.find((b) => b.flag === flag)!.guideline).toEqual(
        UIL_CLASS_3.bands.find((b) => b.flag === flag)!.guideline,
      )
    }
  })

  it('Kentucky stays a reference table — four bands are not five flags', () => {
    // KHSAA publishes a contest-alteration matrix, not a practice ladder.
    // Feeding four bands to classifyWbgt would dress them up as this site's
    // five flags, the same reason NC and NY are excluded.
    expect(KHSAA_WBGT_REFERENCE.rows).toHaveLength(4)
    expect(Object.keys(POLICIES)).not.toContain('khsaa')
    expect(KHSAA_WBGT_REFERENCE.rows.map((r) => r.sourceLabel)).toEqual([
      '92.0 and above',
      '90.1 - 91.9',
      '87.1 - 90.0',
      '82.2 - 87.0',
    ])
    // The top band stops everything; it must not carry the ordinary actions.
    expect(KHSAA_WBGT_REFERENCE.rows[0].textKeys).toEqual(['kentucky.rows.stopAll'])
  })

  it('Kentucky says an off-property reading is not valid, and the page says currency is unconfirmed', () => {
    expect(KY_OFFSITE_INVALID_QUOTE).toContain('should not be considered valid')
    // Read from an archive because khsaa.org answers nothing — the page has to
    // carry that limitation, not bury it.
    expect(KHSAA_WBGT_REFERENCE.source.url).toContain('web.archive.org')
    for (const locale of [en, es]) {
      expect(locale.kentucky.currencyBody.length).toBeGreaterThan(0)
      expect(locale.kentucky.deviceWarning.length).toBeGreaterThan(0)
    }
  })

  it('CIF category ladders match the 2026-27 bylaw chart', () => {
    // Read off the p.103 chart, which is an image — rendered to PNG at 170 dpi
    // and read by eye (the TSSAA treatment). Three ladders, one guideline set.
    expect(CIF_CATEGORIES).toHaveLength(3)
    expect(flagAt(CIF_CATEGORY_1, 76.0)).toBe('green')
    expect(flagAt(CIF_CATEGORY_1, 76.3)).toBe('yellow')
    expect(flagAt(CIF_CATEGORY_1, 81.0)).toBe('yellow')
    expect(flagAt(CIF_CATEGORY_1, 84.0)).toBe('orange')
    expect(flagAt(CIF_CATEGORY_1, 86.0)).toBe('red')
    expect(flagAt(CIF_CATEGORY_1, 86.2)).toBe('black')
    // Category 3 is the hottest ladder — the same reading is two flags cooler
    // there than in Category 1, which is why the category has to be chosen.
    expect(flagAt(CIF_CATEGORY_3, 86.0)).toBe('yellow')
    expect(flagAt(CIF_CATEGORY_3, 92.1)).toBe('black')
    // All three share one guideline set, like UIL Class 2 and 3.
    for (const flag of ['green', 'yellow', 'orange', 'red', 'black'] as const) {
      expect(CIF_CATEGORIES[0].bands.find((b) => b.flag === flag)!.guideline).toEqual(
        CIF_CATEGORIES[2].bands.find((b) => b.flag === flag)!.guideline,
      )
    }
  })

  it('CIF disputed top boundaries resolve to the hotter flag', () => {
    // p.102 text says >86.2 / >89.9 / >92.0; the p.103 chart prints
    // ≥86.2 / ≥89.8 / ≥92.1 and ends red at 86.0 / 89.6 / 91.9. Both the
    // disagreement and the gap resolve upward, so nothing in the disputed
    // range is ever shown as red.
    expect(flagAt(CIF_CATEGORIES[0], 86.05)).toBe('black')
    expect(flagAt(CIF_CATEGORIES[1], 89.7)).toBe('black')
    expect(flagAt(CIF_CATEGORIES[2], 92.0)).toBe('black')
  })

  it('California stays out of the picker — its category cannot be inferred', () => {
    // CIF assigns the category by region from a separate 28-page roster.
    // Auto-selecting one would emit a confidently wrong flag; adding these to
    // the picker needs the Texas class-prompt treatment first.
    for (const policy of CIF_CATEGORIES) {
      expect(Object.values(POLICIES)).not.toContain(policy)
    }
    expect(Object.keys(POLICIES)).not.toContain('cif-cat-1')
  })

  it('CIF names an online WBGT source for schools without a meter', () => {
    // The strongest evidence in this oracle that a forecast belongs in a heat
    // policy — and the reason California is marked apps-allowed.
    expect(CIF_NO_DEVICE_QUOTE).toContain('Schools without a WBGT')
    expect(CIF_NOAA_TOOL_URL).toContain('noaa.gov')
    expect(CIF_CATEGORY_1.remoteEstimatesAllowed).toBe('yes')
    // It names NOAA's map, not this site — the page must not claim otherwise.
    for (const locale of [en, es]) {
      expect(locale.california.stillNotCompliance.length).toBeGreaterThan(0)
    }
  })

  it('Florida is a statute page with no invented thresholds', () => {
    // Fla. Stat. 1006.165(2) sets NO WBGT numbers — it directs the FHSAA to
    // establish them. The FHSAA guideline document was not reachable, so no
    // Florida band table exists here and the page says why. If a POLICIES
    // entry for Florida ever appears without that document, this fails.
    expect(Object.keys(POLICIES)).not.toContain('fhsaa')
    expect(Object.keys(POLICIES)).not.toContain('florida')
    // The measurement sentence is the load-bearing one: it rules this site
    // out as the reading, and it names five variables rather than "WBGT".
    expect(FL_ONSITE_MEASUREMENT_QUOTE).toContain('at the site of the athletic activity')
    expect(FL_ONSITE_MEASUREMENT_QUOTE).not.toMatch(/WBGT|wet bulb/i)
    expect(FL_YEAR_ROUND_QUOTE).toContain('year-round')
    expect(FL_STATUTE_SOURCE.url).toContain('flsenate.gov')
    for (const locale of [en, es]) {
      // The page must keep saying that the numbers are absent and why.
      expect(locale.florida.noTableBody.length).toBeGreaterThan(0)
      expect(locale.florida.deviceWarning.length).toBeGreaterThan(0)
    }
  })

  it('MIAA boundaries match the MIAA Heat Modification Policy table', () => {
    // Massachusetts sits a full flag lower than the southern states: black
    // begins in the 86s where Georgia's begins in the 92s. These numbers came
    // off the MIAA PDF on 2026-08-10 — do not infer any of them from another
    // state's table.
    expect(flagAt(MIAA, 75.9)).toBe('green')
    expect(flagAt(MIAA, 76.1)).toBe('yellow')
    // A temperature the table NAMES keeps the band the table gives it. These
    // two previously came back one band hot, contradicting the row labels
    // printed beside them.
    expect(flagAt(MIAA, 81.0)).toBe('yellow')
    expect(flagAt(MIAA, 84.0)).toBe('orange')
    expect(flagAt(MIAA, 86.0)).toBe('red')
    expect(flagAt(MIAA, 86.05)).toBe('black')
    expect(flagAt(MIAA, 92.0)).toBe('black')
  })

  it('every MIAA row label agrees with the flag that reading produces', () => {
    // The guard that would have caught this class of bug: parse each printed
    // row range and check both its ends classify into that row's own flag.
    for (const band of MIAA.bands) {
      const range = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/.exec(band.sourceLabel)
      if (!range) continue
      const [, low, high] = range
      expect(flagAt(MIAA, Number(low)), `${band.sourceLabel} low end`).toBe(band.flag)
      expect(flagAt(MIAA, Number(high)), `${band.sourceLabel} high end`).toBe(band.flag)
    }
  })

  it('MIAA gap tenths resolve into the hotter band, never the cooler one', () => {
    // The printed table ends a band at 81.0 and starts the next at 81.1, and
    // does the same at 76, 84 and 86 — a tenth is unassigned at every
    // boundary. Each gap resolves upward (the Iowa 79.7 treatment).
    for (const [wbgt, flag] of [
      [76.05, 'yellow'],
      [81.05, 'orange'],
      [84.05, 'red'],
      [86.05, 'black'],
    ] as const) {
      expect(flagAt(MIAA, wbgt), `${wbgt} must resolve upward`).toBe(flag)
    }
  })

  it('MIAA red carries the cooling-zone requirement onto the verdict card', () => {
    // MIAA_COOLING_ZONE_WBGT_F was read from the source and then reached
    // nothing: all five bands had coolingZoneRequired false, so a Massachusetts
    // red verdict listed the time cap and equipment rules and silently dropped
    // the immersion tubs. Red is the band that opens above 84; black
    // short-circuits on noOutdoorWorkouts.
    const red = MIAA.bands.find((b) => b.flag === 'red')!
    expect(red.guideline.extraKeys).toContain('guideline.miaaCoolingZone')
    expect(MIAA_COOLING_ZONE_WBGT_F).toBe(84)
    // The rendered sentence list must actually contain it.
    const sentences = guidelineSentences('red', red.guideline, (k: string) => k)
    expect(sentences).toContain('guideline.miaaCoolingZone')
    // UIL's own cooling-zone wording is not reused for Massachusetts.
    expect(red.guideline.coolingZoneRequired).toBe(false)
    expect(sentences).not.toContain('guideline.coolingZone')
    for (const locale of [en, es]) {
      expect(locale.guideline.miaaCoolingZone).not.toMatch(/\d/)
    }
  })

  it('the MIAA table governs games, and its footnote STOPS games it modifies', () => {
    // This was backwards: the site said competition "continues where a
    // practice would already have stopped". No such range exists — practice
    // runs to 86.0 under caps — and the footnote points the other way, ending
    // games for any sport whose equipment the band modifies (81.1°F up).
    expect(MIAA_TABLE_SCOPE_QUOTE).toContain('COMPETITION')
    expect(MIAA_NO_GAMES_FOOTNOTE_QUOTE).toContain('no games should occur')
    // Equipment modification starts at orange, so that is the band the copy
    // must name as the point games stop for equipment-intensive sports.
    const orange = MIAA.bands.find((b) => b.flag === 'orange')!
    expect(orange.guideline.extraKeys).toContain('guideline.miaaEquipmentSports')
    for (const locale of [en, es]) {
      expect(locale.massachusetts.noGamesBody).toContain('{{footnote}}')
      // The old, inverted framing must not come back.
      expect(locale.massachusetts.competitionBody.toLowerCase()).not.toContain(
        'where a practice would already have stopped',
      )
      expect(locale.states.notes.ma.toLowerCase()).not.toContain('games may continue where practice would stop')
    }
  })

  it('MIAA requires an on-site instrument and treats games separately', () => {
    expect(MIAA.remoteEstimatesAllowed).toBe('device-required')
    expect(requiresOnSiteReading(MIAA)).toBe(true)
    expect(MIAA_DEVICE_QUOTE).toContain('must be utilized at each activity')
    // The competition carve-out is the one place the policy permits activity a
    // practice reading would stop — it must stay a quote, and must not be
    // mistaken for a higher practice threshold.
    expect(MIAA_COMPETITION_QUOTE).toContain('up to and including WBGT readings of 86.0')
    expect(MIAA.bands.find((b) => b.flag === 'red')!.guideline.maxPracticeMinutes).toBe(60)
    expect(MIAA_COOLING_ZONE_WBGT_F).toBe(84)
  })

  it('GHSA orange keeps conditioning stricter than practice', () => {
    // The by-law's 87.0-89.9 cell restricts practice to helmet/shoulder pads/
    // shorts AND requires all protective equipment off during conditioning.
    // The second half had no field to live in, so it shipped missing — the
    // permissive direction, on the band where football equipment first bites.
    const orange = GHSA.bands.find((b) => b.flag === 'orange')!
    expect(orange.guideline.footballEquipment).toBe('helmet-shoulder-pads-shorts')
    expect(orange.guideline.extraKeys).toContain('guideline.ghsaConditioningNoEquipment')
    // Conditioning is restricted at orange, not banned — that is red.
    expect(orange.guideline.noConditioning).toBe(false)
    expect(GHSA.bands.find((b) => b.flag === 'red')!.guideline.noConditioning).toBe(true)
  })

  it('GHSA black band prohibits outdoor workouts', () => {
    expect(GHSA.bands.find((b) => b.flag === 'black')!.guideline.noOutdoorWorkouts).toBe(true)
  })

  it('every policy has exactly the five flags ordered hottest-first', () => {
    for (const policy of Object.values(POLICIES)) {
      expect(policy.bands.map((b) => b.flag)).toEqual(['black', 'red', 'orange', 'yellow', 'green'])
    }
  })
})

describe('policy oracle — measurement/compliance stance', () => {
  it('UIL explicitly allows internet/app measurement; GHSA requires a device', () => {
    expect(UIL_CLASS_2.remoteEstimatesAllowed).toBe('yes')
    expect(UIL_CLASS_3.remoteEstimatesAllowed).toBe('yes')
    expect(GHSA.remoteEstimatesAllowed).toBe('device-required')
    expect(GENERIC_NATA.remoteEstimatesAllowed).toBe('unspecified')
  })

  it('SCHSL requires a device; Iowa and TSSAA put the reading on site', () => {
    // SCHSL: "Phone apps are not scientifically approved at this time."
    expect(SCHSL.remoteEstimatesAllowed).toBe('device-required')
    // Iowa: WBGT is "recommended", but apps "do NOT provide an accurate
    // temperature" — a weaker mandate that still blocks remote substitution.
    expect(IOWA_CATEGORY_2.remoteEstimatesAllowed).toBe('device-recommended')
    // TSSAA: the reading is obtained 'at the site of practices and
    // competitions'; a phone app is permitted only for HEAT INDEX and only
    // as a last resort — on-site is the named method for WBGT.
    expect(TSSAA.remoteEstimatesAllowed).toBe('device-recommended')
  })

  it('both device stances suppress the remote reading as a compliance substitute', () => {
    expect(requiresOnSiteReading(SCHSL)).toBe(true)
    expect(requiresOnSiteReading(IOWA_CATEGORY_2)).toBe(true)
    expect(requiresOnSiteReading(GHSA)).toBe(true)
    expect(requiresOnSiteReading(TSSAA)).toBe(true)
    expect(requiresOnSiteReading(UIL_CLASS_3)).toBe(false)
  })

  it('GHSA quotes keep the scope words the source attaches to them', () => {
    // The instrument sentence used to be cut at "at each practice", which is
    // exactly where the by-law's seasonal limit begins — a season-limited duty
    // was being shown as an open-ended one. Pin the parenthetical and the
    // sentence's real ending.
    expect(GHSA_INSTRUMENT_QUOTE).toContain('(prior to October 1)')
    expect(GHSA_INSTRUMENT_QUOTE).toMatch(/being followed properly\.$/)
    // "year-round" belongs to the POLICY sentence 2.67(a), not to the
    // instrument sentence. Copy that merges them overstates the device rule.
    expect(GHSA_POLICY_YEAR_ROUND_QUOTE).toContain('year-round')
    expect(GHSA_INSTRUMENT_QUOTE).not.toContain('year-round')
    // ...and the year-round quote must not drag the instrument in with it.
    expect(GHSA_POLICY_YEAR_ROUND_QUOTE.toLowerCase()).not.toContain('instrument')
  })

  it('GHSA carries its own range-hold ratchet, not a copy of the SCHSL one', () => {
    // Both associations happen to use a 15-minute hold. The site shipped the
    // SCHSL rule and omitted GHSA's, and the omission runs permissive: a coach
    // watching the WBGT fall back would assume the restriction lifts.
    expect(GHSA_RANGE_HOLD_MINUTES).toBe(15)
    expect(GHSA_RANGE_HOLD_QUOTE).toContain('15 consecutive minutes')
    expect(GHSA_RANGE_HOLD_QUOTE).toContain('remainder of that practice')
    // The no-revert leg is the half that carries the safety meaning.
    expect(GHSA_NO_REVERT_QUOTE).toContain('may not revert')
    expect(GHSA_ESCALATE_QUOTE).toContain('must immediately be implemented')
    // Derived from GHSA's own page: none of these may be SCHSL's wording.
    for (const quote of [GHSA_RANGE_HOLD_QUOTE, GHSA_NO_REVERT_QUOTE, GHSA_ESCALATE_QUOTE]) {
      expect(quote).not.toBe(SCHSL_CONTINUOUS_QUOTE)
      expect(quote.toLowerCase()).not.toContain('schsl')
    }
    for (const locale of [en, es]) {
      expect(locale.georgia.holdBody).toContain('{{hold}}')
      expect(locale.georgia.holdBody).toContain('{{escalate}}')
      // Numbers reach this copy only through the oracle.
      expect(locale.georgia.holdBody.replace(/\{\{\w+\}\}/g, '')).not.toMatch(/\d/)
    }
  })

  it('the Georgia page states the two documents disagree on the date limit', () => {
    // Conservative resolution (device-required all year) is only defensible if
    // the site says out loud that it chose between conflicting GHSA documents.
    for (const locale of [en, es]) {
      expect(locale.georgia.seasonNote).toContain('October 1')
      expect(locale.georgia.seasonNote.length).toBeGreaterThan(0)
    }
    expect(GHSA.remoteEstimatesAllowed).toBe('device-required')
  })

  it('administrative constants match the sources', () => {
    expect(UIL_EFFECTIVE_DATE).toBe('2026-08-01')
    expect(UIL_READING_BEFORE_PRACTICE_MAX_MINUTES).toBe(15)
    expect(UIL_READING_INTERVAL_MINUTES).toBe(30)
    expect(GHSA_READING_INTERVAL_MINUTES).toBe(30)
    expect(GHSA_CALIBRATION_INTERVAL_YEARS).toBe(2)
    expect(SCHSL_READING_INTERVAL_MINUTES).toBe(30)
    expect(SCHSL_CALIBRATION_INTERVAL_YEARS).toBe(2)
    expect(SCHSL_RANGE_HOLD_MINUTES).toBe(15)
    expect(SCHSL_COLD_IMMERSION_WBGT_F).toBe(82)
    expect(IOWA_READING_INTERVAL_MINUTES).toBe(30)
    expect(IOWA_AMBIENT_TRIGGER_F).toBe(80)
    expect(IOWA_CATEGORY_NUMBER).toBe(2)
    expect(NYSPHSAA_AMBIENT_TRIGGER_F).toBe(80)
    expect(VA_ICE_WBGT_F).toBe(80)
    expect(VA_MIN_TIERS).toBe(5)
  })

  it('NC and NY stay out of the WBGT policy picker (their scales are incompatible)', () => {
    // NCHSAA uses a different threshold family (80/85/88/90); NYSPHSAA's
    // ladder is in heat index degrees. Either one wired into classifyWbgt
    // would produce a confidently wrong flag.
    const ids = Object.keys(POLICIES)
    expect(ids).not.toContain('nchsaa')
    expect(ids).not.toContain('nysphsaa')
    expect(NCHSAA_REFERENCE.rows.length).toBeGreaterThan(0)
    expect(NYSPHSAA_HEAT_INDEX_REFERENCE.rows.length).toBeGreaterThan(0)
  })

  it('NYSPHSAA rows never prescribe less as the tier gets hotter', () => {
    // The Warning (91-95) row shipped with only four of its seven actions —
    // monitor, consider-postpone and consider-shorten were dropped — so the
    // table showed the hotter tier calling for FEWER actions than the cooler
    // Watch (86-90) tier. Rows are hottest-first, so action counts must be
    // non-increasing down the list (Alert is the exception: "no outside
    // activity" replaces the ladder rather than extending it).
    const rows = NYSPHSAA_HEAT_INDEX_REFERENCE.rows.filter((r) => r.tierKey !== 'alert')
    for (let i = 1; i < rows.length; i++) {
      expect(
        rows[i - 1].textKeys.length,
        `${rows[i - 1].tierKey} must not prescribe less than ${rows[i].tierKey}`,
      ).toBeGreaterThanOrEqual(rows[i].textKeys.length)
    }
    const warning = NYSPHSAA_HEAT_INDEX_REFERENCE.rows.find((r) => r.tierKey === 'warning')!
    for (const key of [
      'newYork.rows.monitor',
      'newYork.rows.considerPostponeMuch',
      'newYork.rows.considerShorten',
    ]) {
      expect(warning.textKeys).toContain(key)
    }
    // The source escalates its own wording between the tiers; the site keeps
    // both rather than reusing one string for two ranges.
    const watch = NYSPHSAA_HEAT_INDEX_REFERENCE.rows.find((r) => r.tierKey === 'watch')!
    expect(watch.textKeys).toContain('newYork.rows.considerPostpone')
    expect(watch.textKeys).toContain('newYork.rows.considerShorten')
    for (const locale of [en, es]) {
      expect(locale.newYork.rows.considerPostpone).not.toBe(
        locale.newYork.rows.considerPostponeMuch,
      )
    }
  })

  it('the UIL source names the chart file it was actually read from', () => {
    // The label claimed a "2026-27 ... chart". The 2026-27 plan page links
    // 25-26WBGTChart.png (200); 26-27WBGTChart.png is a 404 (checked
    // 2026-08-10). Numbers were right, the edition label was not.
    expect(UIL_CLASS_3.source.name).toContain('25-26WBGTChart.png')
    expect(UIL_CLASS_3.source.name).not.toMatch(/2026-27 WBGT Activity Guidelines chart/)
    expect(UIL_CLASS_2.source).toBe(UIL_CLASS_3.source)
  })

  it('reference tables carry a primary-source URL and verification date', () => {
    for (const table of [NCHSAA_REFERENCE, NYSPHSAA_HEAT_INDEX_REFERENCE]) {
      expect(table.source.url).toMatch(/^https:\/\//)
      expect(table.source.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('NCHSAA chart matches the current handbook: two columns, unchanged ladder', () => {
    // The 2025-26 handbook prints the chart WITHOUT the old five-colour code —
    // rows must not carry colour keys (restoring them would mean someone
    // rebuilt from the superseded 2015-era guidance PDF).
    for (const row of NCHSAA_REFERENCE.rows) {
      expect(row).not.toHaveProperty('colorKey')
    }
    expect(NCHSAA_REFERENCE.rows.map((r) => r.sourceLabel)).toEqual([
      '90 or above',
      '88 - 89.9',
      '85 - 87.9',
      '80 - 84.9',
      'Less than 80',
    ])
    // Break ladder (5 min per 15/20/25/30 min) verified unchanged in the
    // current edition.
    expect(NCHSAA_REFERENCE.rows.map((r) => r.breakEveryMinutes)).toEqual([
      null,
      15,
      20,
      25,
      30,
    ])
  })

  it('every policy carries a primary-source URL and verification date', () => {
    for (const policy of Object.values(POLICIES)) {
      expect(policy.source.url).toMatch(/^https:\/\//)
      expect(policy.source.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe('borderline advisory (conservative bias)', () => {
  it('flags readings within the margin below the next boundary', () => {
    // UIL Class 3 yellow→orange boundary is 87.0.
    expect(isBorderline(UIL_CLASS_3, 87.0 - BORDERLINE_MARGIN_F + 0.1)).toBe(true)
    expect(isBorderline(UIL_CLASS_3, 87.0 - BORDERLINE_MARGIN_F - 0.5)).toBe(false)
  })

  it('never flags the hottest band (no band above black)', () => {
    expect(isBorderline(UIL_CLASS_3, 99)).toBe(false)
    expect(nextBandBoundary(UIL_CLASS_3, classifyWbgt(UIL_CLASS_3, 99))).toBeNull()
  })

  it('Grundstein bias constants: published −1 to −3 °C range, °F derived from °C', () => {
    expect(REMOTE_UNDERESTIMATE_MIN_C).toBe(1)
    expect(REMOTE_UNDERESTIMATE_MAX_C).toBe(3)
    expect(REMOTE_UNDERESTIMATE_MIN_F).toBeCloseTo(REMOTE_UNDERESTIMATE_MIN_C * 1.8, 5)
    expect(REMOTE_UNDERESTIMATE_MAX_F).toBeCloseTo(REMOTE_UNDERESTIMATE_MAX_C * 1.8, 5)
  })
})

describe('measurement legality quotes (re-verified 2026-08-09)', () => {
  // Pinned verbatim against the fetched pages in /tmp/oraudit; any edit here
  // must re-fetch the source first. The FAQ's silence on WHAT counts as
  // "approved" is part of the claim — legality copy must keep the
  // confirm-with-your-district caveat as long as no list is published.
  it('UIL plan and FAQ sentences are verbatim, with a dated FAQ source block', () => {
    expect(UIL_INSTRUMENT_OR_INTERNET_QUOTE).toBe(
      'It is required that schools utilize a scientifically approved instrument that measures Wet Bulb Globe Temperature (WBGT) or other scientifically proven method, such as an internet-based weather station software or application, to monitor the wet bulb globe temperature.',
    )
    expect(UIL_FAQ_FORECAST_QUOTE).toBe(
      'Schools may utilize a scientifically approved on-site instrument or an approved internet-based WBGT forecasting resource.',
    )
    expect(UIL_FAQ_SOURCE.url).toContain('uiltexas.org')
    expect(UIL_FAQ_SOURCE.verifiedOn).toBe('2026-08-09')
  })

  it('UIL 2026-27 mandate is verbatim and the required/recommended asymmetry holds', () => {
    expect(UIL_MANDATE_2026_QUOTE).toBe(
      'Beginning with the 2026-2027 school year, the use of Wet Bulb Globe Temperature (WBGT) to monitor environmental conditions and guide activity modifications is no longer a recommendation, but a required standard for all UIL outdoor athletic and marching band activities.',
    )
    // Marching band is in the requirement sentence itself.
    expect(UIL_MANDATE_2026_QUOTE).toContain('marching band')
    // Record-keeping is RECOMMENDED, not required — the quote must keep saying so.
    expect(UIL_RECORDKEEPING_QUOTE).toBe(
      'It is recommended that schools record and keep on file the WBGT temperatures associated for outside practices.',
    )
    expect(UIL_RECORDKEEPING_QUOTE.toLowerCase()).toContain('recommended')
  })

  it('the cadence asymmetry is preserved: pre-practice "must", during-practice "should"', () => {
    // The plan switches modal verbs mid-paragraph. Copy that calls the whole
    // cadence "required" overstates the during-practice leg, which is the
    // same must/should blur this repo already corrected for Iowa.
    expect(UIL_READING_MUST_QUOTE).toBe(
      'WBGT readings must be taken within 15 minutes prior to the start of practice to ensure accuracy.',
    )
    expect(UIL_READING_MUST_QUOTE).toContain('must be taken')
    expect(UIL_INTERNET_CADENCE_QUOTE).toContain('should be taken every 30 minutes')
    expect(UIL_INTERNET_CADENCE_QUOTE).not.toContain('must be taken')

    // Both legs quote the same intervals the numeric constants carry, so a
    // change to one without the other would be caught here.
    expect(UIL_READING_MUST_QUOTE).toContain(String(UIL_READING_BEFORE_PRACTICE_MAX_MINUTES))
    expect(UIL_INTERNET_CADENCE_QUOTE).toContain(String(UIL_READING_INTERVAL_MINUTES))
  })

  it('UIL treats the internet lane as first-class, and the one tool it links is named', () => {
    expect(UIL_INTERNET_CADENCE_QUOTE).toBe(
      'If utilizing an internet-based application, the WBGT should also be checked within 15 minutes prior to practice. In both cases, WBGT readings should be taken every 30 minutes during practice.',
    )
    // "In both cases" is the load-bearing phrase: the plan puts the internet
    // lane under the same cadence as a meter rather than treating it as a
    // fallback. Do not trim to the first sentence.
    expect(UIL_INTERNET_CADENCE_QUOTE).toContain('In both cases')

    // A link is not an approval; the copy must never upgrade it into one.
    expect(UIL_LINKED_TOOL.url).toBe('https://convergence.unc.edu/tools/wbgt/')
    expect(UIL_LINKED_TOOL.verifiedOn).toBe('2026-08-09')
  })

  it('GHSA reminder sentences are verbatim, with a dated source block', () => {
    expect(GHSA_NO_APPS_QUOTE).toBe(
      'Phone applications are not approved for WBGT measurements at this time.',
    )
    expect(GHSA_MONITOR_EVERY_PRACTICE_QUOTE).toBe(
      'A scientifically approved Wet Bulb Globe Temperature (WBGT) monitor must be used at every outdoor practice to ensure compliance with GHSA policy.',
    )
    // Regression pin: the sentence was once truncated at "practice" and closed
    // with an invented period. The compliance tail is the load-bearing half on
    // a device-required page — it must survive.
    expect(GHSA_MONITOR_EVERY_PRACTICE_QUOTE).toContain('to ensure compliance with GHSA policy')
    expect(GHSA_REMINDER_SOURCE.url).toContain('ghsa.net')
    expect(GHSA_REMINDER_SOURCE.verifiedOn).toBe('2026-08-09')
  })
})
