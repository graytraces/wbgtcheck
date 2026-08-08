/**
 * Raw policy data — plain JS so BOTH the React app (via policyOracle.ts) and
 * scripts/prerender.mjs import the exact same objects. This is the
 * prerender↔client shared-module pattern (wiki: prerender-wrs-prosewipe) that
 * prevents copy/threshold desync between prerendered HTML and hydrated DOM.
 *
 * ORACLE RULE: every number here was cross-checked against the primary source
 * listed in its source block on the date given. See policyOracle.ts for the
 * full doctrine. Do NOT add states without fetching their primary document.
 *
 * Primary sources verified 2026-08-09:
 *  - UIL: https://www.uiltexas.org/health/info/heat-stress-and-athletic-participation
 *         chart: https://www.uiltexas.org/files/athletics/25-26WBGTChart.png
 *  - GHSA By-law 2.67:
 *         https://www.ghsa.net/sites/default/files/documents/sports-medicine/HeatHumidity.pdf
 *  - NATA position statement Table 5:
 *         https://www.nata.org/sites/default/files/exertional_heat_illnesses.pdf
 */

// --- UIL (Texas) administrative constants ---------------------------------

export const UIL_EFFECTIVE_DATE = '2026-08-01'
export const UIL_READING_BEFORE_PRACTICE_MAX_MINUTES = 15
export const UIL_READING_INTERVAL_MINUTES = 30
export const UIL_APP_MEASUREMENT_QUOTE =
  'an internet-based weather station software or application'

// --- GHSA (Georgia) administrative constants ------------------------------

export const GHSA_READING_INTERVAL_MINUTES = 30
export const GHSA_READING_LEAD_MINUTES = 30
export const GHSA_CALIBRATION_INTERVAL_YEARS = 2
export const GHSA_INSTRUMENT_QUOTE =
  'A scientifically-approved instrument that measures the Wet Bulb Globe Temperature must be utilized at each practice'

/**
 * GHSA Heat Policy FAQ: "A WBGT reading of 92 is somewhat comparable to a
 * Heat Index reading of 104-105 degrees."
 * https://www.ghsa.net/sites/default/files/documents/sports-medicine/HEAT_POLICY_FAQs_2019.pdf
 * (verified 2026-08-09)
 */
export const GHSA_FAQ_WBGT_HI_COMPARISON = { wbgtF: 92, heatIndexMinF: 104, heatIndexMaxF: 105 }

// --- Grundstein remote-estimate bias + borderline nudge -------------------
// Published range: remote estimates −1 to −3 °C vs on-site measurement
// (Grundstein 2025 GeoHealth, doi:10.1029/2025GH001347). All UI copy showing
// these numbers interpolates from the °C constants; the °F pair is derived.

export const REMOTE_UNDERESTIMATE_MIN_C = 1
export const REMOTE_UNDERESTIMATE_MAX_C = 3
export const REMOTE_UNDERESTIMATE_MIN_F = REMOTE_UNDERESTIMATE_MIN_C * 1.8
export const REMOTE_UNDERESTIMATE_MAX_F = REMOTE_UNDERESTIMATE_MAX_C * 1.8
export const BORDERLINE_MARGIN_F = 2.0

// --- Band guideline blocks ------------------------------------------------

const UIL_GREEN = {
  maxPracticeMinutes: null,
  restBreaksPerHour: 3,
  restBreakMinMinutes: 3,
  restMinutesPerHour: null,
  footballEquipment: null,
  noConditioning: false,
  coolingZoneRequired: false,
  noOutdoorWorkouts: false,
}

const UIL_YELLOW = {
  maxPracticeMinutes: null,
  restBreaksPerHour: 3,
  restBreakMinMinutes: 4,
  restMinutesPerHour: null,
  footballEquipment: null,
  noConditioning: false,
  coolingZoneRequired: true, // "MANDATORY ONSITE RAPID COOLING ZONE (INCLUDING TUB OR TARP)"
  noOutdoorWorkouts: false,
}

const UIL_ORANGE = {
  maxPracticeMinutes: 120,
  restBreaksPerHour: 4,
  restBreakMinMinutes: 4,
  restMinutesPerHour: null,
  footballEquipment: 'helmet-shoulder-pads-shorts',
  noConditioning: false,
  coolingZoneRequired: true,
  noOutdoorWorkouts: false,
}

const UIL_RED = {
  maxPracticeMinutes: 60,
  restBreaksPerHour: null,
  restBreakMinMinutes: null,
  restMinutesPerHour: 20,
  footballEquipment: 'none',
  noConditioning: true,
  coolingZoneRequired: true,
  noOutdoorWorkouts: false,
}

const UIL_BLACK = {
  maxPracticeMinutes: 0,
  restBreaksPerHour: null,
  restBreakMinMinutes: null,
  restMinutesPerHour: null,
  footballEquipment: null,
  noConditioning: true,
  coolingZoneRequired: false,
  noOutdoorWorkouts: true, // "No outdoor workouts. Delay practices until a cooler WBGT is reached."
}

const GHSA_BLACK = {
  maxPracticeMinutes: 0,
  restBreaksPerHour: null,
  restBreakMinMinutes: null,
  restMinutesPerHour: null,
  footballEquipment: null,
  noConditioning: true,
  coolingZoneRequired: false,
  noOutdoorWorkouts: true,
}

const GHSA_RED = {
  maxPracticeMinutes: 60,
  restBreaksPerHour: null,
  restBreakMinMinutes: null,
  restMinutesPerHour: 20,
  footballEquipment: 'none',
  noConditioning: true,
  coolingZoneRequired: false,
  noOutdoorWorkouts: false,
}

const GHSA_ORANGE = {
  maxPracticeMinutes: 120,
  restBreaksPerHour: 4,
  restBreakMinMinutes: 4,
  restMinutesPerHour: null,
  footballEquipment: 'helmet-shoulder-pads-shorts',
  noConditioning: false,
  coolingZoneRequired: false,
  noOutdoorWorkouts: false,
}

const GHSA_YELLOW = {
  maxPracticeMinutes: null,
  restBreaksPerHour: 3,
  restBreakMinMinutes: 4,
  restMinutesPerHour: null,
  footballEquipment: null,
  noConditioning: false,
  coolingZoneRequired: false,
  noOutdoorWorkouts: false,
}

const GHSA_GREEN = {
  maxPracticeMinutes: null,
  restBreaksPerHour: 3,
  restBreakMinMinutes: 3,
  restMinutesPerHour: null,
  footballEquipment: null,
  noConditioning: false,
  coolingZoneRequired: false,
  noOutdoorWorkouts: false,
}

// --- Policies (bands ordered hottest first) -------------------------------

const UIL_SOURCE = {
  name: 'UIL Heat Stress & Athletic Participation (2026-27 WBGT Activity Guidelines chart)',
  url: 'https://www.uiltexas.org/health/info/heat-stress-and-athletic-participation',
  verifiedOn: '2026-08-09',
}

export const UIL_CLASS_3 = {
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

export const UIL_CLASS_2 = {
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

export const GHSA = {
  id: 'ghsa',
  source: {
    name: 'GHSA Constitution By-law 2.67 — Practice Policy for Heat and Humidity',
    url: 'https://www.ghsa.net/sites/default/files/documents/sports-medicine/HeatHumidity.pdf',
    verifiedOn: '2026-08-09',
  },
  remoteEstimatesAllowed: 'device-required',
  bands: [
    // By-law prints red as "90.0 - 92.0" and black as "Over 92.0": 92.0 itself is red.
    { flag: 'black', minF: 92.0, minInclusive: false, sourceLabel: 'Over 92.0', guideline: GHSA_BLACK },
    { flag: 'red', minF: 90.0, minInclusive: true, sourceLabel: '90.0 - 92.0', guideline: GHSA_RED },
    { flag: 'orange', minF: 87.0, minInclusive: true, sourceLabel: '87.0 - 89.9', guideline: GHSA_ORANGE },
    { flag: 'yellow', minF: 82.0, minInclusive: true, sourceLabel: '82.0 - 86.9', guideline: GHSA_YELLOW },
    { flag: 'green', minF: null, minInclusive: true, sourceLabel: 'Under 82.0', guideline: GHSA_GREEN },
  ],
}

export const GENERIC_NATA = {
  id: 'generic',
  source: {
    name: 'NATA Position Statement: Exertional Heat Illnesses (2015), Table 5',
    url: 'https://www.nata.org/sites/default/files/exertional_heat_illnesses.pdf',
    verifiedOn: '2026-08-09',
  },
  remoteEstimatesAllowed: 'unspecified',
  bands: [
    // NATA prints red as "90.0–92.0" and black as "Over 92.1", leaving
    // 92.0–92.1 unassigned in the source. Resolved upward (>92.0 → black) —
    // consistent with this site's treat-borderline-as-higher stance.
    { flag: 'black', minF: 92.0, minInclusive: false, sourceLabel: 'Over 92.1', guideline: GHSA_BLACK },
    { flag: 'red', minF: 90.0, minInclusive: true, sourceLabel: '90.0 - 92.0', guideline: GHSA_RED },
    { flag: 'orange', minF: 87.0, minInclusive: true, sourceLabel: '87.0 - 89.9', guideline: GHSA_ORANGE },
    { flag: 'yellow', minF: 82.0, minInclusive: true, sourceLabel: '82.0 - 86.9', guideline: GHSA_YELLOW },
    { flag: 'green', minF: null, minInclusive: true, sourceLabel: 'Under 82.0', guideline: GHSA_GREEN },
  ],
}

export const POLICIES = {
  'uil-class-2': UIL_CLASS_2,
  'uil-class-3': UIL_CLASS_3,
  ghsa: GHSA,
  generic: GENERIC_NATA,
}
