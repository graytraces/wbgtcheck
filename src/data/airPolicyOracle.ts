/**
 * Air-quality oracle — types + classification over ./airPolicyData.js.
 *
 * Mirrors policyOracle.ts for the air axis. Deliberately shares nothing with
 * the WBGT oracle: the air gate is displayed ALONGSIDE the heat flag and may
 * never soften it. There is no function here that takes a WBGT value, and
 * airQualityGateTest.ts asserts the two modules never import each other.
 */

import {
  AQI_CATEGORIES as AQI_CATEGORIES_RAW,
  AIR_POLICIES as AIR_POLICIES_RAW,
  WA_AIR_POLICY as WA_RAW,
  OR_AIR_POLICY as OR_RAW,
  CA_AIR_POLICY as CA_RAW,
  AIR_POLICY_BY_STATE as AIR_POLICY_BY_STATE_RAW,
  // Imported as well as re-exported: `export … from` creates no local binding,
  // and aqiCategoryName below reads this map.
  AQI_CATEGORY_NAME_ES as AQI_CATEGORY_NAME_ES_RAW,
} from './airPolicyData.js'

export {
  ACTIVITY_IDS,
  ACTIVITY_SOURCE_LABELS,
  ACTIVITY_EXAMPLE_QUOTES,
  DEFAULT_ACTIVITY_ID,
  EPA_AQI_SOURCE,
  WA_SENSITIVE_GROUP_QUOTE,
  WA_DATA_SOURCE_QUOTE,
  WA_SMOKE_BLOG,
  OR_CONSERVATIVE_METRIC_QUOTE,
  CA_REFRAIN_AT_OR_ABOVE_AQI,
  CA_RULE_QUOTE,
  CA_READING_SOURCE_QUOTE,
  NFHS_LANDMARK_MILES,
  NFHS_531_QUOTE,
  NFHS_RECHECK_QUOTE,
  NFHS_INDOOR_WORSE_QUOTE,
  NFHS_SCOPE_QUOTE,
  NFHS_AIR_SOURCE,
  AIRNOW_SOURCE,
  AIRNOW_PRELIMINARY_QUOTE,
  AIRNOW_NOT_FOR_DECISIONS_QUOTE,
  AIRNOW_CREDIT_QUOTE,
  AIRNOW_PROGRAM_CREDIT,
  AIR_OBSERVATION_STALE_MINUTES,
  AQI_CATEGORY_NAME_ES,
  AQI_CATEGORY_NAME_ES_SOURCE,
} from './airPolicyData.js'

// Product-chosen distance limits, deliberately not part of the source-checked
// oracle — see ./airDistance.js. Re-exported here so components have one
// import site for the air layer.
export { AIR_AREA_FAR_KM, AIR_AREA_MAX_REPRESENTATIVE_KM } from './airDistance.js'

/**
 * AQI category colors. Separate from the WBGT FlagColor union on purpose —
 * the AQI scale has six steps including purple and maroon, and the two
 * palettes must never be substituted for one another.
 */
export type AqiColor = 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'maroon'

export type AqiCategoryId =
  | 'good'
  | 'moderate'
  | 'unhealthySensitive'
  | 'unhealthy'
  | 'veryUnhealthy'
  | 'hazardous'

/** WA's duration columns: 15 min-1 h / 1-4 h / >4 h. */
export type ActivityId = 'short' | 'medium' | 'long'

export type AirPolicyId = 'wa-doh' | 'or-osaa' | 'ca-cif'

export interface AqiCategory {
  id: AqiCategoryId
  color: AqiColor
  minAqi: number
  /** null on the open-ended Hazardous category. */
  maxAqi: number | null
  rgb: [number, number, number]
  hex: string
  /** Range exactly as the EPA table prints it. */
  sourceLabel: string
}

export interface AirPolicySource {
  name: string
  url: string
  verifiedOn: string
}

export interface AirPolicyBand {
  id: string
  /** Lower AQI bound, inclusive. */
  minAqi: number
  /** Range as the source table prints it; '' where the source states none. */
  sourceLabel: string
  /** Single action code, or null where the source states no action. */
  action?: string | null
  /** Per-activity action codes (WA only). */
  actions?: Record<ActivityId, string>
  /** OSAA's published 5-3-1 visibility range for this band. */
  visibilityLabel?: string | null
}

export interface AirPolicy {
  id: AirPolicyId
  stateAbbr: string
  /**
   * Which index the source's thresholds are keyed to. WA's table is headed
   * "Outside Air Quality Index: PM2.5"; OR and CA cite the AQI generally.
   */
  indexBasis: 'pm25' | 'overall'
  variesByActivity: boolean
  instrumentType: 'health-guidance' | 'association-policy' | 'association-bylaw'
  bands: AirPolicyBand[]
  actionQuotes: Record<string, string>
  source: AirPolicySource
}

export const AQI_CATEGORIES = AQI_CATEGORIES_RAW as AqiCategory[]
export const WA_AIR_POLICY = WA_RAW as AirPolicy
export const OR_AIR_POLICY = OR_RAW as AirPolicy
export const CA_AIR_POLICY = CA_RAW as AirPolicy
export const AIR_POLICIES = AIR_POLICIES_RAW as Record<AirPolicyId, AirPolicy>
export const AIR_POLICY_BY_STATE = AIR_POLICY_BY_STATE_RAW as Record<string, AirPolicyId>

/** The EPA category containing `aqi`. Values are clamped at both ends. */
export function classifyAqi(aqi: number): AqiCategory {
  const rounded = Math.round(aqi)
  for (let i = AQI_CATEGORIES.length - 1; i >= 0; i--) {
    if (rounded >= AQI_CATEGORIES[i].minAqi) return AQI_CATEGORIES[i]
  }
  return AQI_CATEGORIES[0]
}

/** The policy band containing `aqi`, scanning from the top band down. */
export function classifyAirBand(policy: AirPolicy, aqi: number): AirPolicyBand {
  const rounded = Math.round(aqi)
  for (let i = policy.bands.length - 1; i >= 0; i--) {
    if (rounded >= policy.bands[i].minAqi) return policy.bands[i]
  }
  return policy.bands[0]
}

/** The action code a band prescribes for `activity`, or null when none. */
export function airActionFor(band: AirPolicyBand, activity: ActivityId): string | null {
  if (band.actions) return band.actions[activity] ?? null
  return band.action ?? null
}

/** The source's own wording for an action code, for attributed quoting. */
export function airActionQuote(policy: AirPolicy, action: string | null): string | null {
  if (!action) return null
  return policy.actionQuotes[action] ?? null
}

export function airPolicyForState(stateAbbr: string | null): AirPolicy | null {
  if (!stateAbbr) return null
  const id = AIR_POLICY_BY_STATE[stateAbbr.toUpperCase()]
  return id ? AIR_POLICIES[id] : null
}

/**
 * The category name to show a reader, in their language.
 *
 * `feedName` is whatever AirNow sent (always English). It is returned
 * unchanged unless the locale is Spanish AND the feed's text matches the
 * category we classified the value into — so an unfamiliar or reworded feed
 * string is passed through rather than relabelled with a name EPA might not
 * have meant.
 */
export function aqiCategoryName(
  categoryId: string,
  feedName: string,
  lang: string,
): string {
  if (!lang.startsWith('es')) return feedName
  const spanish = (AQI_CATEGORY_NAME_ES_RAW as Record<string, string>)[categoryId]
  return spanish ?? feedName
}
