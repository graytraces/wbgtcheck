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
  MIAA as MIAA_RAW,
  CIF_CATEGORY_1 as CIF_CATEGORY_1_RAW,
  CIF_CATEGORY_2 as CIF_CATEGORY_2_RAW,
  CIF_CATEGORY_3 as CIF_CATEGORY_3_RAW,
  CIF_CATEGORIES as CIF_CATEGORIES_RAW,
  GENERIC_NATA as GENERIC_NATA_RAW,
  NCHSAA_REFERENCE as NCHSAA_REFERENCE_RAW,
  NYSPHSAA_HEAT_INDEX_REFERENCE as NYSPHSAA_HEAT_INDEX_REFERENCE_RAW,
  KHSAA_WBGT_REFERENCE as KHSAA_WBGT_REFERENCE_RAW,
  VHSL_REFERENCE as VHSL_REFERENCE_RAW,
  FHSAA_PRACTICE_REFERENCE as FHSAA_PRACTICE_REFERENCE_RAW,
  NYSPHSAA_WBGT_CATEGORIES as NYSPHSAA_WBGT_CATEGORIES_RAW,
  NYSPHSAA_WBGT_ACTIONS as NYSPHSAA_WBGT_ACTIONS_RAW,
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
  GHSA_RANGE_HOLD_MINUTES,
  GHSA_RANGE_HOLD_QUOTE,
  GHSA_NO_REVERT_QUOTE,
  GHSA_ESCALATE_QUOTE,
  GHSA_MONITOR_EVERY_PRACTICE_QUOTE,
  GHSA_REMINDER_SOURCE,
  GHSA_READING_INTERVAL_MINUTES,
  GHSA_READING_LEAD_MINUTES,
  GHSA_CALIBRATION_INTERVAL_YEARS,
  GHSA_INSTRUMENT_QUOTE,
  GHSA_POLICY_YEAR_ROUND_QUOTE,
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
  MIAA_DEVICE_QUOTE,
  MIAA_INDOOR_QUOTE,
  MIAA_COMPETITION_QUOTE,
  MIAA_TABLE_SCOPE_QUOTE,
  MIAA_NO_GAMES_FOOTNOTE_QUOTE,
  MIAA_COOLING_ZONE_WBGT_F,
  MIAA_SOURCE,
  KY_RECHECK_INTERVAL_MINUTES,
  KY_REVISION,
  KY_REVISION_ISO,
  KY_LOWEST_BAND_FLOOR,
  KY_ONSITE_ONLY_QUOTE,
  KY_OFFSITE_INVALID_QUOTE,
  KY_FOOTBALL_ONSITE_QUOTE,
  CIF_LEGAL_BASIS,
  CIF_AIR_BYLAW_CITATION,
  CIF_BYLAW_L_SUBJECT,
  CIF_GAP_EXAMPLE_LOWER,
  CIF_GAP_EXAMPLE_UPPER,
  CIF_GAP_EXAMPLE_SKIPPED,
  CIF_WBGT_REQUIRED_QUOTE,
  CIF_NO_DEVICE_QUOTE,
  CIF_NOAA_TOOL_URL,
  CIF_CANCEL_QUOTE,
  CIF_CATEGORY_ROSTER_URL,
  CIF_ACCLIMATIZATION_DAYS_MIN,
  CIF_ACCLIMATIZATION_DAYS_MAX,
  CIF_ACCLIMATIZATION_PERIOD_DAYS,
  CIF_ACCLIMATIZATION_MAX_PRACTICES_PER_DAY,
  CIF_ACCLIMATIZATION_PRACTICE_MAX_HOURS,
  CIF_FOOTBALL_HELMET_ONLY_DAYS,
  CIF_FOOTBALL_SHOULDER_PAD_DAYS,
  CIF_FOOTBALL_FULL_PADS_DAY,
  CIF_FIVE_DAY_QUOTE,
  CIF_ONE_PRACTICE_QUOTE,
  CIF_FOOTBALL_EQUIPMENT_QUOTE,
  CIF_COOLING_METHOD_QUOTE,
  CIF_HEAT_SOURCE,
  FL_STATUTE_SECTION,
  FL_STATUTE_CITATION,
  FL_ONSITE_MEASUREMENT_QUOTE,
  FL_MODIFY_QUOTE,
  FL_COOLING_ZONE_QUOTE,
  FL_EAP_QUOTE,
  FL_YEAR_ROUND_QUOTE,
  FL_TRAINING_QUOTE,
  FL_STATUTE_SOURCE,
  VA_CODE_SECTION,
  VA_CODE_CITATION,
  VA_ICE_WBGT_F,
  VA_MIN_TIERS,
  VA_CONSISTENCY_QUOTE,
  VA_CANCEL_QUOTE,
  VA_STATUTE_SOURCE,
  VHSL_SOURCE,
  VHSL_CANCEL_WBGT_F,
  VHSL_LEVEL_COUNT,
  VHSL_CANCEL_QUOTE,
  VHSL_TABLE_TITLE_QUOTE,
  VHSL_ICE_LEVEL,
  FHSAA_SOURCE,
  FHSAA_NO_OUTDOOR_WBGT_F,
  FHSAA_SECTION,
  FHSAA_PURPOSE_QUOTE,
  FHSAA_NO_OUTDOOR_QUOTE,
  FHSAA_DEVICE_MANDATE_QUOTE,
  FHSAA_TRIGGER_WBGT_F,
  FHSAA_TRIGGER_QUOTE,
  FHSAA_MONITOR_INTERVAL_MINUTES,
  FHSAA_CONTEST_SECTION,
  FHSAA_CONTEST_TOP_BAND_MIN_F,
  FHSAA_CONTEST_SPORT_COUNT,
  FHSAA_CONTEST_REFERENCE_QUOTE,
  FHSAA_CONTEST_POSTPONE_QUOTE,
  NYSPHSAA_WBGT_SOURCE,
  NYSPHSAA_EITHER_SCALE_QUOTE,
  NYSPHSAA_SUSPEND_BOTH_SCALES_QUOTE,
  NYSPHSAA_WBGT_BLACK_QUOTE,
  NYSPHSAA_WBGT_BLACK_MIN_F,
  NYSPHSAA_CATEGORY_LOOKUP_URL,
  NYSPHSAA_CATEGORY_LOOKUP_QUOTE,
  NYSPHSAA_REGION_FIGURE_CAPTION,
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
  | 'miaa'
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

/**
 * Numbers a row interpolates into its own sentences. Rows carry these instead
 * of the sentences carrying digits, so a threshold cannot drift in translation
 * and cannot be edited without touching the oracle.
 *
 * `| undefined` because each row carries only the keys ITS sentences use — the
 * hottest VHSL row has no work/rest split and the coolest has no ice interval.
 * Reading an absent one back is a programming error, not a threshold of zero.
 */
export type RowVars = Record<string, number | undefined>

export interface VarsReferenceRow extends ReferenceRow {
  vars: RowVars
}

/** VHSL prints a Level number beside each WBGT range; the page shows both. */
export interface VhslReferenceRow extends VarsReferenceRow {
  level: number
}

export interface ReferenceTable<Row> {
  id: string
  source: PolicySource
  rows: Row[]
}

/** One of NYSPHSAA's three regional WBGT ladders. Never a HeatPolicy — see below. */
export interface NyWbgtCategory {
  id: string
  categoryNumber: number
  bands: Array<{ flag: FlagColor; sourceLabel: string }>
}

/** The Activity Guidelines column, shared by all three NYSPHSAA ladders. */
export interface NyWbgtAction {
  flag: FlagColor
  textKeys: string[]
  vars: RowVars
}

export const UIL_CLASS_2 = UIL_CLASS_2_RAW as HeatPolicy
export const UIL_CLASS_3 = UIL_CLASS_3_RAW as HeatPolicy
export const GHSA = GHSA_RAW as HeatPolicy
export const SCHSL = SCHSL_RAW as HeatPolicy
export const TSSAA = TSSAA_RAW as HeatPolicy
export const IOWA_CATEGORY_2 = IOWA_CATEGORY_2_RAW as HeatPolicy
export const MIAA = MIAA_RAW as HeatPolicy

/**
 * California's three regional ladders. HeatPolicy objects, so they render
 * through the same table as every other state — but deliberately NOT in
 * POLICIES: CIF assigns a school's category by region from a separate roster,
 * and picking one for the user would be the confidently-wrong flag this site
 * exists to avoid. Wiring them into the picker needs the Texas class-prompt
 * treatment first. policyOracle.test.ts pins the exclusion.
 */
export const CIF_CATEGORY_1 = CIF_CATEGORY_1_RAW as HeatPolicy
export const CIF_CATEGORY_2 = CIF_CATEGORY_2_RAW as HeatPolicy
export const CIF_CATEGORY_3 = CIF_CATEGORY_3_RAW as HeatPolicy
export const CIF_CATEGORIES = CIF_CATEGORIES_RAW as HeatPolicy[]
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
/**
 * Kentucky is a contest-alteration matrix, not a practice ladder — four bands
 * and per-sport actions. Feeding it to classifyWbgt would dress four bands up
 * as this site's five flags, so it renders only as its own table.
 */
export const KHSAA_WBGT_REFERENCE = KHSAA_WBGT_REFERENCE_RAW as ReferenceTable<ReferenceRow>

/**
 * Virginia, Florida and New York's own tables — the three this site spent a
 * day telling readers did not exist.
 *
 * All three are ReferenceTables rather than POLICIES entries, each for its own
 * reason. VHSL prints six levels with duration caps and work/rest splits, not
 * five flags. FHSAA's §41.8 governs PRACTICES only, and §41.9 adds a separate
 * per-sport contest index the tool would have to ask about before choosing.
 * NYSPHSAA's ladder depends on a regional category this site cannot determine.
 * Feeding any of them to classifyWbgt would print a confident verdict its own
 * association contradicts.
 */
export const VHSL_REFERENCE = VHSL_REFERENCE_RAW as ReferenceTable<VhslReferenceRow>
export const FHSAA_PRACTICE_REFERENCE =
  FHSAA_PRACTICE_REFERENCE_RAW as ReferenceTable<VarsReferenceRow>
export const NYSPHSAA_WBGT_CATEGORIES = NYSPHSAA_WBGT_CATEGORIES_RAW as NyWbgtCategory[]
export const NYSPHSAA_WBGT_ACTIONS = NYSPHSAA_WBGT_ACTIONS_RAW as NyWbgtAction[]

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
