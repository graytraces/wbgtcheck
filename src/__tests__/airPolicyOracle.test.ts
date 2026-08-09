import { describe, it, expect } from 'vitest'
import {
  AQI_CATEGORIES,
  AIR_POLICIES,
  WA_AIR_POLICY,
  OR_AIR_POLICY,
  CA_AIR_POLICY,
  CA_REFRAIN_AT_OR_ABOVE_AQI,
  CA_RULE_QUOTE,
  WA_INDOOR_PM25_THRESHOLD_UG_M3,
  NFHS_LANDMARK_MILES,
  NFHS_INDOOR_WORSE_QUOTE,
  NFHS_531_QUOTE,
  NFHS_RECHECK_QUOTE,
  NFHS_SCOPE_QUOTE,
  NFHS_AIR_SOURCE,
  AIRNOW_SOURCE,
  AIRNOW_PRELIMINARY_QUOTE,
  AIRNOW_CREDIT_QUOTE,
  AIRNOW_NOT_FOR_DECISIONS_QUOTE,
  AIRNOW_PROGRAM_CREDIT,
  EPA_AQI_SOURCE,
  classifyAqi,
  classifyAirBand,
  airActionFor,
  airActionQuote,
  airPolicyForState,
  ACTIVITY_IDS,
} from '../data/airPolicyOracle'
import { AQI_SWATCH } from '../utils/aqiStyles'
import en from '../locales/en.json'
import es from '../locales/es.json'

/**
 * Air oracle ↔ primary source pins.
 *
 * These assertions ARE the cross-check record: each number below was read off
 * the primary document named in airPolicyData.js on 2026-08-09. A failure here
 * means someone changed a regulated number — re-fetch the source before
 * touching the test.
 */

describe('EPA AQI categories (TAD Tables 1-2)', () => {
  it('has the six categories with the printed breakpoints', () => {
    expect(AQI_CATEGORIES.map((c) => [c.minAqi, c.maxAqi])).toEqual([
      [0, 50],
      [51, 100],
      [101, 150],
      [151, 200],
      [201, 300],
      [301, null],
    ])
  })

  it('carries the required standard RGB colors verbatim (TAD Table 2)', () => {
    // R G B triplets required by the AirNow Data Exchange Guidelines.
    expect(AQI_CATEGORIES.map((c) => c.rgb)).toEqual([
      [0, 228, 0],
      [255, 255, 0],
      [255, 126, 0],
      [255, 0, 0],
      [143, 63, 151],
      [126, 0, 35],
    ])
  })

  it('hex values are exactly the RGB triplets (no re-tinting)', () => {
    const toHex = (rgb: number[]) =>
      '#' + rgb.map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()
    for (const c of AQI_CATEGORIES) {
      expect(c.hex.toUpperCase(), `hex drift on ${c.id}`).toBe(toHex(c.rgb))
    }
  })

  it('the rendered swatch uses the EPA hex unmodified', () => {
    for (const c of AQI_CATEGORIES) {
      expect(AQI_SWATCH[c.color].backgroundColor).toBe(c.hex)
    }
  })

  it('uses six distinct colors including purple and maroon', () => {
    const colors = AQI_CATEGORIES.map((c) => c.color)
    expect(new Set(colors).size).toBe(6)
    expect(colors).toContain('purple')
    expect(colors).toContain('maroon')
  })

  it('classifyAqi lands on the right category at every breakpoint edge', () => {
    expect(classifyAqi(0).id).toBe('good')
    expect(classifyAqi(50).id).toBe('good')
    expect(classifyAqi(51).id).toBe('moderate')
    expect(classifyAqi(100).id).toBe('moderate')
    expect(classifyAqi(101).id).toBe('unhealthySensitive')
    expect(classifyAqi(150).id).toBe('unhealthySensitive')
    expect(classifyAqi(151).id).toBe('unhealthy')
    expect(classifyAqi(200).id).toBe('unhealthy')
    expect(classifyAqi(201).id).toBe('veryUnhealthy')
    expect(classifyAqi(300).id).toBe('veryUnhealthy')
    expect(classifyAqi(301).id).toBe('hazardous')
    // TAD FAQ: everything above 300 stays Hazardous, including above 500.
    expect(classifyAqi(600).id).toBe('hazardous')
  })
})

describe('WA — DOH 334-332 (April 2022)', () => {
  it('is keyed to the PM2.5 sub-index, as the table heading states', () => {
    expect(WA_AIR_POLICY.indexBasis).toBe('pm25')
  })

  it('varies by activity and covers all three printed rows', () => {
    expect(WA_AIR_POLICY.variesByActivity).toBe(true)
    for (const band of WA_AIR_POLICY.bands) {
      for (const activity of ACTIVITY_IDS) {
        expect(
          airActionFor(band, activity as 'recess' | 'pe' | 'athletics'),
          `WA ${band.id}/${activity}`,
        ).toBeTruthy()
      }
    }
  })

  it('cancels athletics from the 101-150 band upward', () => {
    const athletics = (aqi: number) =>
      airActionFor(classifyAirBand(WA_AIR_POLICY, aqi), 'athletics')
    expect(athletics(50)).toBe('noRestrictions')
    expect(athletics(100)).toBe('sensitiveMayOptOut')
    // "Cancel children's outdoor athletic events and practices or move them…"
    expect(athletics(101)).toBe('cancelOrMove')
    expect(athletics(150)).toBe('cancelOrMove')
    expect(athletics(151)).toBe('cancelOrMoveConsiderTransit')
    expect(athletics(250)).toBe('cancelOrMoveFilteredConsiderTransit')
  })

  it('quotes the source wording for the 101-150 athletics cell', () => {
    const quote = airActionQuote(WA_AIR_POLICY, 'cancelOrMove')!
    expect(quote).toContain('Cancel')
    expect(quote).toContain('outdoor athletic events and practices')
    expect(quote).toContain('safer air quality')
  })

  it("keeps the guide's top band as a single >200 column (not split at 301)", () => {
    // WA does not separate EPA's Very Unhealthy and Hazardous.
    expect(classifyAirBand(WA_AIR_POLICY, 250).id).toBe('veryUnhealthyHazardous')
    expect(classifyAirBand(WA_AIR_POLICY, 400).id).toBe('veryUnhealthyHazardous')
  })

  it('pins the indoor PM2.5 escape-hatch concentration', () => {
    expect(WA_INDOOR_PM25_THRESHOLD_UG_M3).toBe(35.5)
  })
})

describe('OR — OSAA handbook §5 (Revised February 2024)', () => {
  it('states no action below the moderate band', () => {
    // The OSAA chart's first row starts at 51; inventing a 0-50 action would
    // be fabrication.
    const band = classifyAirBand(OR_AIR_POLICY, 30)
    expect(band.id).toBe('notStated')
    expect(airActionFor(band, 'athletics')).toBeNull()
  })

  it('cancels all outdoor activity from 151 upward', () => {
    const action = (aqi: number) => airActionFor(classifyAirBand(OR_AIR_POLICY, aqi), 'athletics')
    expect(action(100)).toBe('sensitiveConsiderIndoor')
    expect(action(150)).toBe('addRestBreaksConsiderReschedule')
    expect(action(151)).toBe('cancelOrMoveLowerAqi')
    expect(action(250)).toBe('cancelOrMoveLowerAqi')
  })

  it('uses the mandatory "shall be canceled" wording at 151+', () => {
    const quote = airActionQuote(OR_AIR_POLICY, 'cancelOrMoveLowerAqi')!
    expect(quote).toContain('shall be canceled or moved to an area with a lower AQI')
  })

  it('carries OSAA’s published AQI↔visibility mapping', () => {
    const visibility = Object.fromEntries(
      OR_AIR_POLICY.bands.filter((b) => b.visibilityLabel).map((b) => [b.sourceLabel, b.visibilityLabel]),
    )
    expect(visibility).toEqual({
      '51-100': '5-15 Miles',
      '101-150': '3-5 Miles',
      '151-200': '1-3 Miles',
      '>200': '1 Mile',
    })
  })

  it('does not vary by activity type', () => {
    expect(OR_AIR_POLICY.variesByActivity).toBe(false)
  })
})

describe('CA — CIF Bylaw 503.K(2)(a) (approved January 2019)', () => {
  it('is a single hard threshold at 151', () => {
    expect(CA_REFRAIN_AT_OR_ABOVE_AQI).toBe(151)
    expect(airActionFor(classifyAirBand(CA_AIR_POLICY, 150), 'athletics')).toBeNull()
    expect(airActionFor(classifyAirBand(CA_AIR_POLICY, 151), 'athletics')).toBe('refrainOutdoor')
    expect(airActionFor(classifyAirBand(CA_AIR_POLICY, 500), 'athletics')).toBe('refrainOutdoor')
  })

  it('quotes the bylaw sentence verbatim and derives the threshold from it', () => {
    expect(CA_RULE_QUOTE).toContain('must refrain from outdoor practice and/or competition')
    // The copy and the constant cannot drift apart: the number appears in the
    // quoted sentence, so the constant must be readable out of it.
    expect(CA_RULE_QUOTE).toContain(String(CA_REFRAIN_AT_OR_ABOVE_AQI))
  })

  it('is a membership bylaw, not health-department guidance', () => {
    expect(CA_AIR_POLICY.instrumentType).toBe('association-bylaw')
  })
})

describe('air policy registry', () => {
  it('maps only the three verified jurisdictions', () => {
    expect(Object.keys(AIR_POLICIES).sort()).toEqual(['ca-cif', 'or-osaa', 'wa-doh'])
    expect(airPolicyForState('WA')?.id).toBe('wa-doh')
    expect(airPolicyForState('or')?.id).toBe('or-osaa')
    expect(airPolicyForState('CA')?.id).toBe('ca-cif')
  })

  it('returns null for unverified states — EPA category only, no policy verdict', () => {
    for (const state of ['TX', 'GA', 'CO', 'UT', 'MN', 'WI', 'NY']) {
      expect(airPolicyForState(state), `${state} must not get a policy verdict`).toBeNull()
    }
    expect(airPolicyForState(null)).toBeNull()
  })

  it('bands stay ascending by minAqi (classifyAirBand walks them in reverse)', () => {
    // The WBGT oracle orders bands hottest-first; this one is the opposite.
    // Reordering these arrays without changing the classifier would silently
    // return the wrong band for every reading.
    for (const policy of Object.values(AIR_POLICIES)) {
      const mins = policy.bands.map((b) => b.minAqi)
      expect(mins, `${policy.id} bands must be ascending`).toEqual(
        [...mins].sort((a, b) => a - b),
      )
      expect(mins[0], `${policy.id} must start at 0`).toBe(0)
      expect(new Set(mins).size, `${policy.id} has duplicate band edges`).toBe(mins.length)
    }
  })

  it('every policy names a primary source with a verification date', () => {
    for (const policy of Object.values(AIR_POLICIES)) {
      expect(policy.source.url).toMatch(/^https:\/\//)
      expect(policy.source.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(policy.source.name.length).toBeGreaterThan(10)
    }
  })

  it('every action code a band references has source wording to quote', () => {
    for (const policy of Object.values(AIR_POLICIES)) {
      for (const band of policy.bands) {
        const codes = band.actions
          ? Object.values(band.actions)
          : band.action
            ? [band.action]
            : []
        for (const code of codes) {
          expect(airActionQuote(policy, code), `${policy.id}/${code} has no quote`).toBeTruthy()
        }
      }
    }
  })
})

describe('NFHS 5-3-1 visibility method (April 2023)', () => {
  it('carries the three landmark distances and no invented AQI mapping', () => {
    expect(NFHS_LANDMARK_MILES).toEqual([1, 3, 5])
    // NFHS describes the method but maps no AQI numbers onto the distances.
    // Only OSAA publishes such a mapping, and it lives on OR_BANDS.
    expect(NFHS_531_QUOTE).not.toMatch(/AQI\s*\d/)
  })

  it('keeps the indoor-may-be-worse warning', () => {
    expect(NFHS_INDOOR_WORSE_QUOTE).toContain('MAY BE WORSE than the outdoor air')
  })

  it('quotes the method and the at-least-hourly recheck verbatim', () => {
    expect(NFHS_531_QUOTE).toContain('1 mile away, 3 miles away and 5 miles away')
    expect(NFHS_531_QUOTE).toContain('sun behind you')
    expect(NFHS_RECHECK_QUOTE).toContain('at least hourly')
  })

  it('scope quote includes marching band (added in the April 2023 revision)', () => {
    // This product's second audience is band directors; the 2019 statement did
    // not name them and the 2023 one does, which is why we cite 2023.
    expect(NFHS_SCOPE_QUOTE).toContain('marching band')
    expect(NFHS_AIR_SOURCE.name).toContain('April 2023')
  })
})

describe('AirNow data conditions bind the displayed copy', () => {
  it('pins the three obligations we act on, verbatim', () => {
    expect(AIRNOW_PRELIMINARY_QUOTE).toContain('should be considered preliminary')
    expect(AIRNOW_CREDIT_QUOTE).toContain('Credit should first be given')
    expect(AIRNOW_NOT_FOR_DECISIONS_QUOTE).toContain('act as guidance')
    expect(AIRNOW_SOURCE.url).toContain('DataUseGuidelines')
  })

  it('the preliminary notice we display carries the source clause', () => {
    // The guidelines require displays to "indicate that these data are
    // preliminary"; our EN notice quotes the operative wording.
    expect(en.air.preliminaryNotice).toContain('not fully verified or validated')
    expect(en.air.preliminaryNotice.toLowerCase()).toContain('preliminary')
    expect(es.air.preliminaryNotice.toLowerCase()).toContain('preliminar')
  })

  it('the credit line names the agencies before the EPA program', () => {
    for (const locale of [en, es]) {
      expect(locale.air.creditLabel).toContain('{{agencies}}')
      expect(locale.air.creditLabel).toContain('EPA AirNow')
      expect(locale.air.creditLabel.indexOf('{{agencies}}')).toBeLessThan(
        locale.air.creditLabel.indexOf('EPA AirNow'),
      )
    }
    expect(AIRNOW_PROGRAM_CREDIT).toBe('EPA AirNow')
  })

  it('EPA color spec is cited as the authority for the palette', () => {
    expect(EPA_AQI_SOURCE.name).toContain('Air Quality Index')
    expect(EPA_AQI_SOURCE.url).toMatch(/^https:\/\//)
    expect(EPA_AQI_SOURCE.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
