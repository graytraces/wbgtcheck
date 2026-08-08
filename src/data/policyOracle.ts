/**
 * Policy oracle — the single source of truth for every WBGT threshold and
 * activity-modification number shown anywhere on this site.
 *
 * ORACLE RULE (workspace content policy): every number here was cross-checked
 * against the primary source listed in its `source` block on the date given.
 * UI copy and tests must DERIVE from these constants — never hardcode a
 * threshold in copy or assert a copied string in a test.
 *
 * Primary sources verified 2026-08-09:
 *  - UIL: https://www.uiltexas.org/health/info/heat-stress-and-athletic-participation
 *         chart: https://www.uiltexas.org/files/athletics/25-26WBGTChart.png
 *  - GHSA By-law 2.67:
 *         https://www.ghsa.net/sites/default/files/documents/sports-medicine/HeatHumidity.pdf
 *  - NATA position statement (generic fallback, Table 5 "Example of WBGT Guidelines"):
 *         https://www.nata.org/sites/default/files/exertional_heat_illnesses.pdf
 *
 * Do NOT add thresholds for other states without fetching and verifying the
 * association's primary document first.
 */

export type FlagColor = 'green' | 'yellow' | 'orange' | 'red' | 'black'

export type PolicyId = 'uil-class-2' | 'uil-class-3' | 'ghsa' | 'generic'

export interface BandGuideline {
  /** Practice length cap in minutes; null = no cap stated at this band. */
  maxPracticeMinutes: number | null
  /** Number of separate rest breaks per hour; null = not stated. */
  restBreaksPerHour: number | null
  /** Minimum duration of each rest break in minutes; null = not stated. */
  restBreakMinMinutes: number | null
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
   * satisfy the policy; 'unspecified' — the source does not say.
   */
  remoteEstimatesAllowed: 'yes' | 'device-required' | 'unspecified'
}

// ---------------------------------------------------------------------------
// UIL (Texas) — mandatory for all UIL outdoor athletics AND marching band.
// ---------------------------------------------------------------------------

/** UIL WBGT requirement effective date ("required standard" from 2026-27). */
export const UIL_EFFECTIVE_DATE = '2026-08-01'
/** "WBGT readings must be taken within 15 minutes prior to the start of practice" */
export const UIL_READING_BEFORE_PRACTICE_MAX_MINUTES = 15
/** Re-measurement interval during practice (minutes). */
export const UIL_READING_INTERVAL_MINUTES = 30
/**
 * UIL explicitly permits app/web measurement: "a scientifically approved
 * instrument that measures Wet Bulb Globe Temperature (WBGT) or other
 * scientifically proven method, such as an internet-based weather station
 * software or application."
 */
export const UIL_APP_MEASUREMENT_QUOTE =
  'an internet-based weather station software or application'

const UIL_SOURCE: PolicySource = {
  name: 'UIL Heat Stress & Athletic Participation (2026-27 WBGT Activity Guidelines chart)',
  url: 'https://www.uiltexas.org/health/info/heat-stress-and-athletic-participation',
  verifiedOn: '2026-08-09',
}

const UIL_GREEN: BandGuideline = {
  maxPracticeMinutes: null,
  restBreaksPerHour: 3,
  restBreakMinMinutes: 3,
  restMinutesPerHour: null,
  footballEquipment: null,
  noConditioning: false,
  coolingZoneRequired: false,
  noOutdoorWorkouts: false,
}

const UIL_YELLOW: BandGuideline = {
  maxPracticeMinutes: null,
  restBreaksPerHour: 3,
  restBreakMinMinutes: 4,
  restMinutesPerHour: null,
  footballEquipment: null,
  noConditioning: false,
  coolingZoneRequired: true, // "MANDATORY ONSITE RAPID COOLING ZONE (INCLUDING TUB OR TARP)"
  noOutdoorWorkouts: false,
}

const UIL_ORANGE: BandGuideline = {
  maxPracticeMinutes: 120,
  restBreaksPerHour: 4,
  restBreakMinMinutes: 4,
  restMinutesPerHour: null,
  footballEquipment: 'helmet-shoulder-pads-shorts',
  noConditioning: false,
  coolingZoneRequired: true,
  noOutdoorWorkouts: false,
}

const UIL_RED: BandGuideline = {
  maxPracticeMinutes: 60,
  restBreaksPerHour: null,
  restBreakMinMinutes: null,
  restMinutesPerHour: 20,
  footballEquipment: 'none',
  noConditioning: true,
  coolingZoneRequired: true,
  noOutdoorWorkouts: false,
}

const UIL_BLACK: BandGuideline = {
  maxPracticeMinutes: 0,
  restBreaksPerHour: null,
  restBreakMinMinutes: null,
  restMinutesPerHour: null,
  footballEquipment: null,
  noConditioning: true,
  coolingZoneRequired: false,
  noOutdoorWorkouts: true, // "No outdoor workouts. Delay practices until a cooler WBGT is reached."
}

/** UIL Class 3 (hotter regions of Texas per the UIL WBGT map). */
export const UIL_CLASS_3: HeatPolicy = {
  id: 'uil-class-3',
  source: UIL_SOURCE,
  remoteEstimatesAllowed: 'yes',
  bands: [
    { flag: 'black', minF: 92.1, minInclusive: true, sourceLabel: '≥92.1', guideline: UIL_BLACK },
    { flag: 'red', minF: 90.1, minInclusive: true, sourceLabel: '90.1 - 92.0', guideline: UIL_RED },
    { flag: 'orange', minF: 87.0, minInclusive: true, sourceLabel: '87.0 - 90.0', guideline: UIL_ORANGE },
    { flag: 'yellow', minF: 82.0, minInclusive: true, sourceLabel: '82.0 - 86.9', guideline: UIL_YELLOW },
    { flag: 'green', minF: null, minInclusive: true, sourceLabel: '< 82.0', guideline: UIL_GREEN },
  ],
}

/** UIL Class 2 (cooler regions of Texas per the UIL WBGT map). */
export const UIL_CLASS_2: HeatPolicy = {
  id: 'uil-class-2',
  source: UIL_SOURCE,
  remoteEstimatesAllowed: 'yes',
  bands: [
    { flag: 'black', minF: 89.8, minInclusive: true, sourceLabel: '≥89.8', guideline: UIL_BLACK },
    { flag: 'red', minF: 87.7, minInclusive: true, sourceLabel: '87.7 - 89.7', guideline: UIL_RED },
    { flag: 'orange', minF: 84.7, minInclusive: true, sourceLabel: '84.7 - 87.6', guideline: UIL_ORANGE },
    { flag: 'yellow', minF: 79.7, minInclusive: true, sourceLabel: '79.7 - 84.6', guideline: UIL_YELLOW },
    { flag: 'green', minF: null, minInclusive: true, sourceLabel: '<79.7', guideline: UIL_GREEN },
  ],
}

// ---------------------------------------------------------------------------
// GHSA (Georgia) — By-law 2.67. DEVICE-ONLY state: "A scientifically-approved
// instrument that measures the Wet Bulb Globe Temperature must be utilized at
// each practice". A web/app estimate cannot satisfy GHSA compliance.
// ---------------------------------------------------------------------------

/** "WBGT readings should be taken at a minimum of every 30 minutes" */
export const GHSA_READING_INTERVAL_MINUTES = 30
/** "...beginning 30 minutes prior to the start of practice." */
export const GHSA_READING_LEAD_MINUTES = 30
/** "All WBGT monitors shall be calibrated, at a minimum, every two (2) years" */
export const GHSA_CALIBRATION_INTERVAL_YEARS = 2
export const GHSA_INSTRUMENT_QUOTE =
  'A scientifically-approved instrument that measures the Wet Bulb Globe Temperature must be utilized at each practice'

/**
 * GHSA Heat Policy FAQ: "A WBGT reading of 92 is somewhat comparable to a
 * Heat Index reading of 104-105 degrees." Used on the education page to show
 * the scales do not line up. Source:
 * https://www.ghsa.net/sites/default/files/documents/sports-medicine/HEAT_POLICY_FAQs_2019.pdf
 * (verified 2026-08-09)
 */
export const GHSA_FAQ_WBGT_HI_COMPARISON = { wbgtF: 92, heatIndexMinF: 104, heatIndexMaxF: 105 }

const GHSA_SOURCE: PolicySource = {
  name: 'GHSA Constitution By-law 2.67 — Practice Policy for Heat and Humidity',
  url: 'https://www.ghsa.net/sites/default/files/documents/sports-medicine/HeatHumidity.pdf',
  verifiedOn: '2026-08-09',
}

export const GHSA: HeatPolicy = {
  id: 'ghsa',
  source: GHSA_SOURCE,
  remoteEstimatesAllowed: 'device-required',
  bands: [
    // By-law prints red as "90.0 - 92.0" and black as "Over 92.0": 92.0 itself is red.
    {
      flag: 'black',
      minF: 92.0,
      minInclusive: false,
      sourceLabel: 'Over 92.0',
      guideline: {
        maxPracticeMinutes: 0,
        restBreaksPerHour: null,
        restBreakMinMinutes: null,
        restMinutesPerHour: null,
        footballEquipment: null,
        noConditioning: true,
        coolingZoneRequired: false,
        noOutdoorWorkouts: true,
      },
    },
    {
      flag: 'red',
      minF: 90.0,
      minInclusive: true,
      sourceLabel: '90.0 - 92.0',
      guideline: {
        maxPracticeMinutes: 60,
        restBreaksPerHour: null,
        restBreakMinMinutes: null,
        restMinutesPerHour: 20,
        footballEquipment: 'none',
        noConditioning: true,
        coolingZoneRequired: false,
        noOutdoorWorkouts: false,
      },
    },
    {
      flag: 'orange',
      minF: 87.0,
      minInclusive: true,
      sourceLabel: '87.0 - 89.9',
      guideline: {
        maxPracticeMinutes: 120,
        restBreaksPerHour: 4,
        restBreakMinMinutes: 4,
        restMinutesPerHour: null,
        footballEquipment: 'helmet-shoulder-pads-shorts',
        noConditioning: false,
        coolingZoneRequired: false,
        noOutdoorWorkouts: false,
      },
    },
    {
      flag: 'yellow',
      minF: 82.0,
      minInclusive: true,
      sourceLabel: '82.0 - 86.9',
      guideline: {
        maxPracticeMinutes: null,
        restBreaksPerHour: 3,
        restBreakMinMinutes: 4,
        restMinutesPerHour: null,
        footballEquipment: null,
        noConditioning: false,
        coolingZoneRequired: false,
        noOutdoorWorkouts: false,
      },
    },
    {
      flag: 'green',
      minF: null,
      minInclusive: true,
      sourceLabel: 'Under 82.0',
      guideline: {
        maxPracticeMinutes: null,
        restBreaksPerHour: 3,
        restBreakMinMinutes: 3,
        restMinutesPerHour: null,
        footballEquipment: null,
        noConditioning: false,
        coolingZoneRequired: false,
        noOutdoorWorkouts: false,
      },
    },
  ],
}

// ---------------------------------------------------------------------------
// Generic fallback — NATA 2015 position statement (Exertional Heat Illnesses),
// Table 5 "Example of Wet-Bulb Globe Temperature (WBGT) Guidelines".
// Explicitly labeled an EXAMPLE by NATA; shown when no state policy is
// selected, always with a "check your association" caveat.
// ---------------------------------------------------------------------------

const NATA_SOURCE: PolicySource = {
  name: 'NATA Position Statement: Exertional Heat Illnesses (2015), Table 5',
  url: 'https://www.nata.org/sites/default/files/exertional_heat_illnesses.pdf',
  verifiedOn: '2026-08-09',
}

export const GENERIC_NATA: HeatPolicy = {
  id: 'generic',
  source: NATA_SOURCE,
  remoteEstimatesAllowed: 'unspecified',
  bands: [
    // NATA prints red as "90.0–92.0" and black as "Over 92.1", leaving
    // 92.0–92.1 unassigned in the source. We resolve the gap upward (>92.0 →
    // black) — consistent with this site's treat-borderline-as-higher stance.
    {
      flag: 'black',
      minF: 92.0,
      minInclusive: false,
      sourceLabel: 'Over 92.1',
      guideline: {
        maxPracticeMinutes: 0,
        restBreaksPerHour: null,
        restBreakMinMinutes: null,
        restMinutesPerHour: null,
        footballEquipment: null,
        noConditioning: true,
        coolingZoneRequired: false,
        noOutdoorWorkouts: true,
      },
    },
    {
      flag: 'red',
      minF: 90.0,
      minInclusive: true,
      sourceLabel: '90.0 - 92.0',
      guideline: {
        maxPracticeMinutes: 60,
        restBreaksPerHour: null,
        restBreakMinMinutes: null,
        restMinutesPerHour: 20,
        footballEquipment: 'none',
        noConditioning: true,
        coolingZoneRequired: false,
        noOutdoorWorkouts: false,
      },
    },
    {
      flag: 'orange',
      minF: 87.0,
      minInclusive: true,
      sourceLabel: '87.0 - 89.9',
      guideline: {
        maxPracticeMinutes: 120,
        restBreaksPerHour: 4,
        restBreakMinMinutes: 4,
        restMinutesPerHour: null,
        footballEquipment: 'helmet-shoulder-pads-shorts',
        noConditioning: false,
        coolingZoneRequired: false,
        noOutdoorWorkouts: false,
      },
    },
    {
      flag: 'yellow',
      minF: 82.0,
      minInclusive: true,
      sourceLabel: '82.0 - 86.9',
      guideline: {
        maxPracticeMinutes: null,
        restBreaksPerHour: 3,
        restBreakMinMinutes: 4,
        restMinutesPerHour: null,
        footballEquipment: null,
        noConditioning: false,
        coolingZoneRequired: false,
        noOutdoorWorkouts: false,
      },
    },
    {
      flag: 'green',
      minF: null,
      minInclusive: true,
      sourceLabel: 'Under 82.0',
      guideline: {
        maxPracticeMinutes: null,
        restBreaksPerHour: 3,
        restBreakMinMinutes: 3,
        restMinutesPerHour: null,
        footballEquipment: null,
        noConditioning: false,
        coolingZoneRequired: false,
        noOutdoorWorkouts: false,
      },
    },
  ],
}

// ---------------------------------------------------------------------------
// Registry + classification
// ---------------------------------------------------------------------------

export const POLICIES: Record<PolicyId, HeatPolicy> = {
  'uil-class-2': UIL_CLASS_2,
  'uil-class-3': UIL_CLASS_3,
  ghsa: GHSA,
  generic: GENERIC_NATA,
}

/**
 * Conservative remote-estimate bias, from Grundstein et al. 2025 (GeoHealth,
 * doi:10.1029/2025GH001347): app/remote estimates averaged -1.04 °C (~-1.9 °F)
 * vs on-site measurement, reaching -2 to -3 °C above WBGT 32 °C. Surfaced
 * permanently in the verdict UI; also drives the borderline nudge below.
 */
export const REMOTE_UNDERESTIMATE_MIN_F = 1.9
export const REMOTE_UNDERESTIMATE_MAX_F = 5.4

/**
 * When a reading sits within this margin below a band boundary, the UI keeps
 * the classified flag but tells the coach to treat it as the band above
 * (remote estimates run low in exactly this direction).
 */
export const BORDERLINE_MARGIN_F = 2.0

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
