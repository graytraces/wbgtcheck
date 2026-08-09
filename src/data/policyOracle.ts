/**
 * Policy oracle — the single source of truth for every WBGT threshold and
 * activity-modification number shown anywhere on this site.
 *
 * ORACLE RULE (workspace content policy): every number was cross-checked
 * against the primary source listed in its `source` block on the date given.
 * UI copy and tests must DERIVE from these constants — never hardcode a
 * threshold in copy or assert a copied string in a test.
 *
 * The raw data lives in ./policyData.js (plain JS) so scripts/prerender.mjs
 * imports the identical objects — prerendered HTML and hydrated DOM cannot
 * drift apart. This module adds the types and classification functions.
 */

import {
  POLICIES as POLICIES_RAW,
  UIL_CLASS_2 as UIL_CLASS_2_RAW,
  UIL_CLASS_3 as UIL_CLASS_3_RAW,
  GHSA as GHSA_RAW,
  SCHSL as SCHSL_RAW,
  TSSAA as TSSAA_RAW,
  IOWA_CATEGORY_2 as IOWA_CATEGORY_2_RAW,
  GENERIC_NATA as GENERIC_NATA_RAW,
  NCHSAA_REFERENCE as NCHSAA_REFERENCE_RAW,
  NYSPHSAA_HEAT_INDEX_REFERENCE as NYSPHSAA_HEAT_INDEX_REFERENCE_RAW,
} from './policyData.js'

export {
  UIL_EFFECTIVE_DATE,
  UIL_READING_BEFORE_PRACTICE_MAX_MINUTES,
  UIL_READING_INTERVAL_MINUTES,
  UIL_APP_MEASUREMENT_QUOTE,
  UIL_INSTRUMENT_OR_INTERNET_QUOTE,
  UIL_FAQ_FORECAST_QUOTE,
  UIL_FAQ_SOURCE,
  UIL_MANDATE_2026_QUOTE,
  UIL_RECORDKEEPING_QUOTE,
  UIL_READING_MUST_QUOTE,
  UIL_INTERNET_CADENCE_QUOTE,
  UIL_LINKED_TOOL,
  UIL_REGION_MAP_URL,
  GHSA_NO_APPS_QUOTE,
  GHSA_MONITOR_EVERY_PRACTICE_QUOTE,
  GHSA_REMINDER_SOURCE,
  GHSA_READING_INTERVAL_MINUTES,
  GHSA_READING_LEAD_MINUTES,
  GHSA_CALIBRATION_INTERVAL_YEARS,
  GHSA_INSTRUMENT_QUOTE,
  GHSA_FAQ_WBGT_HI_COMPARISON,
  SCHSL_READING_INTERVAL_MINUTES,
  SCHSL_READING_LEAD_MINUTES,
  SCHSL_CALIBRATION_INTERVAL_YEARS,
  SCHSL_RANGE_HOLD_MINUTES,
  SCHSL_COLD_IMMERSION_WBGT_F,
  SCHSL_DEVICE_QUOTE,
  SCHSL_APP_QUOTE,
  SCHSL_REQUIRED_QUOTE,
  SCHSL_TOP_BOUNDARY_TEXT_QUOTE,
  SCHSL_CONTINUOUS_QUOTE,
  TSSAA_REVISION,
  TSSAA_WBGT_FIRST_CHOICE_QUOTE,
  TSSAA_APP_QUOTE,
  TSSAA_EITHER_QUOTE,
  TSSAA_COLD_TUB_QUOTE,
  TSSAA_HEAT_INDEX_BANDS,
  IOWA_READING_INTERVAL_MINUTES,
  IOWA_ACCLIMATIZE_DEVICE_MIN_MINUTES,
  IOWA_ACCLIMATIZE_DEVICE_MAX_MINUTES,
  IOWA_DEVICE_HEIGHT_FEET,
  IOWA_AMBIENT_TRIGGER_F,
  IOWA_CATEGORY_NUMBER,
  IOWA_RECOMMENDED_QUOTE,
  IOWA_APP_QUOTE,
  NCHSAA_DEVICE_QUOTE,
  NCHSAA_CADENCE_QUOTE,
  NCHSAA_MANDATE_QUOTE,
  NYSPHSAA_APPROVED_ON,
  NYSPHSAA_UPDATED_ON,
  NYSPHSAA_CHECK_LEAD_HOURS,
  NYSPHSAA_AMBIENT_TRIGGER_F,
  NYSPHSAA_WARNING_BREAK_INTERVAL_MINUTES,
  NYSPHSAA_APP_QUOTE,
  NYSPHSAA_ZIP_QUOTE,
  VA_CODE_SECTION,
  VA_CODE_CITATION,
  VA_ICE_WBGT_F,
  VA_MIN_TIERS,
  VA_CONSISTENCY_QUOTE,
  VA_CANCEL_QUOTE,
  VA_STATUTE_SOURCE,
  REMOTE_UNDERESTIMATE_MIN_C,
  REMOTE_UNDERESTIMATE_MAX_C,
  REMOTE_UNDERESTIMATE_MIN_F,
  REMOTE_UNDERESTIMATE_MAX_F,
  BORDERLINE_MARGIN_F,
} from './policyData.js'

import { BORDERLINE_MARGIN_F } from './policyData.js'

export type FlagColor = 'green' | 'yellow' | 'orange' | 'red' | 'black'

export type PolicyId =
  | 'uil-class-2'
  | 'uil-class-3'
  | 'ghsa'
  | 'schsl'
  | 'tssaa'
  | 'iowa'
  | 'generic'

export interface BandGuideline {
  /** Practice length cap in minutes; null = no cap stated at this band. */
  maxPracticeMinutes: number | null
  /** Number of separate rest breaks per hour; null = not stated. */
  restBreaksPerHour: number | null
  /** Minimum duration of each rest break in minutes; null = not stated. */
  restBreakMinMinutes: number | null
  /**
   * Upper end when the source prints a rest-break RANGE ("3-5 minutes each",
   * as Iowa does) rather than a floor. Absent/null = the source states a
   * minimum only.
   */
  restBreakMaxMinutes?: number | null
  /**
   * Locale keys for source requirements the fields above cannot express (e.g.
   * TSSAA's contact-only football equipment rule). These strings must stay
   * number-free — any number in copy has to interpolate from the oracle.
   */
  extraKeys?: string[]
  /** Total rest minutes distributed through each hour (red bands); null = not stated. */
  restMinutesPerHour: number | null
  /** Football equipment restriction at this band; null = not stated. */
  footballEquipment: 'full' | 'helmet-shoulder-pads-shorts' | 'none' | null
  /** True when conditioning activities are prohibited. */
  noConditioning: boolean
  /** True when the source mandates an on-site rapid cooling zone at this band. */
  coolingZoneRequired: boolean
  /** True when outdoor workouts are prohibited outright. */
  noOutdoorWorkouts: boolean
}

export interface PolicyBand {
  flag: FlagColor
  /** Lower WBGT bound in °F; null = open-ended cold side (the green band). */
  minF: number | null
  /** True: bound belongs to this band (>=). False: strictly greater (>). */
  minInclusive: boolean
  /** Band range exactly as the source table prints it. */
  sourceLabel: string
  guideline: BandGuideline
}

export interface PolicySource {
  name: string
  url: string
  /** Date the numbers were cross-checked against this URL. */
  verifiedOn: string
}

export interface HeatPolicy {
  id: PolicyId
  /** Bands ordered hottest first — classifyWbgt scans top-down. */
  bands: PolicyBand[]
  source: PolicySource
  /**
   * Whether the governing body accepts internet/app-based WBGT estimates for
   * compliance. 'yes' — explicitly permitted; 'device-required' — an on-site
   * scientifically-approved instrument is mandated, so a web estimate cannot
   * satisfy the policy; 'device-recommended' — an on-site instrument is the
   * recommended (not mandated) method AND the source states that phone/web
   * readings are inaccurate for the venue, so a remote estimate still must not
   * stand in for it; 'unspecified' — the source does not say.
   */
  remoteEstimatesAllowed: 'yes' | 'device-required' | 'device-recommended' | 'unspecified'
}

/** True when a remote estimate cannot substitute for the policy's own reading. */
export function requiresOnSiteReading(policy: HeatPolicy): boolean {
  return (
    policy.remoteEstimatesAllowed === 'device-required' ||
    policy.remoteEstimatesAllowed === 'device-recommended'
  )
}

export interface ReferenceRow {
  /** Range exactly as the source table prints it. */
  sourceLabel: string
  /** Locale keys holding this row's number-free requirement sentences. */
  textKeys: string[]
}

export interface NcReferenceRow extends ReferenceRow {
  breakMinutes: number | null
  breakEveryMinutes: number | null
}

export interface NyReferenceRow extends ReferenceRow {
  /** NYSPHSAA's own banner for the row (Caution / Watch / Warning / Alert). */
  tierKey: string
  required: boolean
}

export interface ReferenceTable<Row> {
  id: string
  source: PolicySource
  rows: Row[]
}

export const UIL_CLASS_2 = UIL_CLASS_2_RAW as HeatPolicy
export const UIL_CLASS_3 = UIL_CLASS_3_RAW as HeatPolicy
export const GHSA = GHSA_RAW as HeatPolicy
export const SCHSL = SCHSL_RAW as HeatPolicy
export const TSSAA = TSSAA_RAW as HeatPolicy
export const IOWA_CATEGORY_2 = IOWA_CATEGORY_2_RAW as HeatPolicy
export const GENERIC_NATA = GENERIC_NATA_RAW as HeatPolicy
export const POLICIES = POLICIES_RAW as Record<PolicyId, HeatPolicy>

/**
 * North Carolina and New York are deliberately NOT HeatPolicy entries.
 * NCHSAA's thresholds are a different family from this site's flag bands
 * (80/85/88/90 vs 82/87/90/92); NYSPHSAA's ladder is in HEAT INDEX degrees.
 * Either one, fed to classifyWbgt, would produce a confidently wrong verdict,
 * so both render only as their own reference tables.
 */
export const NCHSAA_REFERENCE = NCHSAA_REFERENCE_RAW as ReferenceTable<NcReferenceRow>
export const NYSPHSAA_HEAT_INDEX_REFERENCE =
  NYSPHSAA_HEAT_INDEX_REFERENCE_RAW as ReferenceTable<NyReferenceRow>

export function classifyWbgt(policy: HeatPolicy, wbgtF: number): PolicyBand {
  for (const band of policy.bands) {
    if (band.minF === null) return band
    if (band.minInclusive ? wbgtF >= band.minF : wbgtF > band.minF) return band
  }
  return policy.bands[policy.bands.length - 1]
}

/** The next-hotter band's lower edge, or null when already in the hottest band. */
export function nextBandBoundary(policy: HeatPolicy, band: PolicyBand): number | null {
  const idx = policy.bands.indexOf(band)
  if (idx <= 0) return null
  return policy.bands[idx - 1].minF
}

/** True when the reading is close enough under the next boundary to warrant the upgrade advisory. */
export function isBorderline(policy: HeatPolicy, wbgtF: number): boolean {
  const band = classifyWbgt(policy, wbgtF)
  const boundary = nextBandBoundary(policy, band)
  if (boundary === null) return false
  return boundary - wbgtF <= BORDERLINE_MARGIN_F
}
