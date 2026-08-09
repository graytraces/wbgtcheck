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
 *  - SCHSL Heat and Acclimatization Guidelines (Updated April 2024):
 *         https://schsl.org/wp-content/uploads/2024/07/Heat-Guidelines-Updated_-April-2024-3.pdf
 *  - Iowa IHSAA/IGHSAU/IHSMA/IHSSA WBGT Heat Modification Guidance (8.5.24):
 *         https://ihsma.org/wp-content/uploads/2025/07/WBGT-Guidance8.5.24.pdf
 *  - TSSAA Heat Policy (Revised October 2024):
 *         https://cms-files.tssaa.org/documents/tssaa/health-safety-information/2025-26TSSAAHeatPolicy.pdf
 *  - NCHSAA heat and humidity guidelines (handbook pp. 114-117):
 *         https://www.nchsaa.org/wp-content/uploads/2015/03/handbook-heat-humidity.pdf
 *  - NYSPHSAA Heat Index Procedures (Approved 2010-05-01, Updated 2023-05-03):
 *         https://s3.amazonaws.com/nysphsaa.org/documents/2023/5/5/Heat_Index_Procedure_5_23.pdf
 *  - Code of Virginia § 22.1-271.10 (2025, cc. 478, 493):
 *         https://law.lis.virginia.gov/vacode/title22.1/chapter14/section22.1-271.10/
 */

// --- UIL (Texas) administrative constants ---------------------------------

export const UIL_EFFECTIVE_DATE = '2026-08-01'
export const UIL_READING_BEFORE_PRACTICE_MAX_MINUTES = 15
export const UIL_READING_INTERVAL_MINUTES = 30
export const UIL_APP_MEASUREMENT_QUOTE =
  'an internet-based weather station software or application'

/**
 * 2026-27 heat-stress plan + FAQ, re-fetched and quote-verified 2026-08-09:
 *  - Plan: https://www.uiltexas.org/health/info/heat-stress-and-athletic-participation
 *  - FAQ:  https://www.uiltexas.org/health/info/2026-2027-heat-stress-athletic-participation-required-plan
 * Neither document defines "approved" or publishes a list of approved
 * internet resources — that ABSENCE is itself the verified fact the legality
 * copy leans on. Do not paraphrase these quotes.
 */
export const UIL_INSTRUMENT_OR_INTERNET_QUOTE =
  'It is required that schools utilize a scientifically approved instrument that measures Wet Bulb Globe Temperature (WBGT) or other scientifically proven method, such as an internet-based weather station software or application, to monitor the wet bulb globe temperature.'
export const UIL_FAQ_FORECAST_QUOTE =
  'Schools may utilize a scientifically approved on-site instrument or an approved internet-based WBGT forecasting resource.'
export const UIL_FAQ_SOURCE = {
  name: 'UIL 2026-2027 Heat Stress FAQ',
  url: 'https://www.uiltexas.org/health/info/2026-2027-heat-stress-athletic-participation-required-plan',
  verifiedOn: '2026-08-09',
}

// Same plan page, same 2026-08-09 verification.
//
// The asymmetry is the point, and it runs in TWO directions that copy must not
// blur. Between activities: the standard is required, keeping a written record
// is only recommended. WITHIN the cadence: the pre-practice reading "must be
// taken", while the during-practice readings "should be taken" — the plan
// switches modal verbs mid-paragraph and the FAQ uses "should" for both. Do not
// describe the whole cadence as required.
export const UIL_MANDATE_2026_QUOTE =
  'Beginning with the 2026-2027 school year, the use of Wet Bulb Globe Temperature (WBGT) to monitor environmental conditions and guide activity modifications is no longer a recommendation, but a required standard for all UIL outdoor athletic and marching band activities.'
export const UIL_RECORDKEEPING_QUOTE =
  'It is recommended that schools record and keep on file the WBGT temperatures associated for outside practices.'
/** The "must" leg of the cadence — pre-practice only. */
export const UIL_READING_MUST_QUOTE =
  'WBGT readings must be taken within 15 minutes prior to the start of practice to ensure accuracy.'
/**
 * The plan's own instructions for the internet lane, which it treats as a
 * first-class method rather than a fallback: the same 15-minute pre-practice
 * check and the same 30-minute in-practice interval as a physical meter. This
 * is the sentence that makes a forecast tool coherent with UIL's cadence.
 */
export const UIL_INTERNET_CADENCE_QUOTE =
  'If utilizing an internet-based application, the WBGT should also be checked within 15 minutes prior to practice. In both cases, WBGT readings should be taken every 30 minutes during practice.'
/**
 * The only internet-based WBGT tool the plan page links by name. A link is not
 * an approval — UIL publishes no approval list (see above) — but it is the one
 * concrete example the plan itself points at, so naming it is more honest than
 * leaving readers to guess what "approved" might mean.
 */
export const UIL_LINKED_TOOL = {
  name: 'UNC Convergence WBGT tool',
  url: 'https://convergence.unc.edu/tools/wbgt/',
  verifiedOn: '2026-08-09',
}

/**
 * UIL's own regional class map — the only authoritative way for a school to
 * learn whether it is Class 2 or Class 3. We do not derive the class from the
 * county: no machine-readable county→class list is published (README backlog),
 * and guessing it in the permissive direction is the failure mode this site
 * exists to prevent. Every surface that asks a Texas user for their class
 * links here. (verified 2026-08-09)
 */
export const UIL_REGION_MAP_URL = 'https://www.uiltexas.org/files/health/WBGTMap.jpg'

// --- GHSA (Georgia) administrative constants ------------------------------

export const GHSA_READING_INTERVAL_MINUTES = 30
export const GHSA_READING_LEAD_MINUTES = 30
export const GHSA_CALIBRATION_INTERVAL_YEARS = 2
/**
 * By-law 2.67, p.31, verbatim and complete (verified 2026-08-09, re-read
 * 2026-08-10):
 *
 *   "A scientifically-approved instrument that measures the Wet Bulb Globe
 *   Temperature must be utilized at each practice (prior to October 1) to
 *   ensure that the written policy is being followed properly. WBGT readings
 *   should be taken at a minimum of every 30 minutes, beginning 30 minutes
 *   prior to the start of practice. All WBGT monitors shall be calibrated, at
 *   a minimum, every two (2) years or earlier if recommended by the
 *   manufacturer."
 *
 * The quote below is that first sentence in full. It previously stopped at
 * "at each practice" — cutting exactly at the parenthesis, which turned a
 * season-limited instrument duty into an open-ended one. The following two
 * sentences are not repeated here because their numbers already live in the
 * GHSA_READING and GHSA_CALIBRATION constants that render beside the quote.
 *
 * DOCUMENT CONFLICT, resolved conservatively (same treatment as the SCHSL top
 * boundary and the Iowa 79.7 gap): the by-law attaches "(prior to October 1)"
 * to the instrument sentence, while GHSA's own practice-policy reminder page
 * states "A scientifically approved Wet Bulb Globe Temperature (WBGT) monitor
 * must be used at every outdoor practice to ensure compliance with GHSA
 * policy" with NO date limit. Two GHSA documents, two scopes. This site keeps
 * GHSA at `device-required` year-round — the stricter reading — and says so on
 * the Georgia page rather than picking the permissive document silently.
 * Note also that the by-law's "year-round" language attaches to the POLICY,
 * not to the instrument sentence; copy must not merge the two.
 */
export const GHSA_INSTRUMENT_QUOTE =
  'A scientifically-approved instrument that measures the Wet Bulb Globe Temperature must be utilized at each practice (prior to October 1) to ensure that the written policy is being followed properly.'
/**
 * Where "year-round" actually comes from — by-law 2.67(a), whose full sentence
 * reads (p.31, re-read from the PDF 2026-08-10):
 *
 *   "Schools must follow the statewide policy for conducting practices and
 *   voluntary conditioning workouts (this policy is year-round, including
 *   during the summer) in all sports during times of extremely high heat
 *   and/or humidity that will be signed by each head coach at the beginning of
 *   each season and distributed to all players and their parents or
 *   guardians."
 *
 * The parenthetical below is quoted on its own because it is the part copy
 * needs and it stands alone without distortion. It qualifies THE POLICY. The
 * by-law's date limits live elsewhere: on the instrument sentence 2.67(c), and
 * on the football-only acclimatization heading 2.67(b) ("Football Only:
 * Acclimatization and Re-Acclimatization (prior to October 1st)"). Three
 * different scopes; never merge them into one sentence.
 */
export const GHSA_POLICY_YEAR_ROUND_QUOTE =
  'this policy is year-round, including during the summer'

/**
 * GHSA Heat Policy FAQ: "A WBGT reading of 92 is somewhat comparable to a
 * Heat Index reading of 104-105 degrees."
 * https://www.ghsa.net/sites/default/files/documents/sports-medicine/HEAT_POLICY_FAQs_2019.pdf
 * (verified 2026-08-09)
 */
export const GHSA_FAQ_WBGT_HI_COMPARISON = { wbgtF: 92, heatIndexMinF: 104, heatIndexMaxF: 105 }

/**
 * GHSA practice-policy reminder, re-fetched and quote-verified 2026-08-09:
 * https://www.ghsa.net/reminder-practice-policy-heat-and-humidity
 * These are GHSA's own flat sentences on apps and per-practice monitors —
 * quote them verbatim, never paraphrase toward the permissive side.
 */
export const GHSA_NO_APPS_QUOTE =
  'Phone applications are not approved for WBGT measurements at this time.'
/**
 * GHSA's range-hold rule, from the same reminder page under "Important Policy
 * Clarifications" (quotes re-fetched verbatim 2026-08-10).
 *
 * This is the ratchet: restrictions lock in after the hold and only ever move
 * up. The site shipped the equivalent SCHSL rule but not this one, and the
 * omission runs the dangerous way — a coach watching the WBGT drop back below
 * a boundary could reasonably assume the restriction lifts, which is the one
 * thing GHSA says twice that it does not.
 *
 * Derived from GHSA's own sentences, NOT from the SCHSL copy: the two
 * associations happen to share a 15-minute hold, and paraphrasing one state's
 * rule into another state's page is how a wrong number travels.
 */
export const GHSA_RANGE_HOLD_MINUTES = 15
export const GHSA_RANGE_HOLD_QUOTE =
  'Once a WBGT reading reaches a specific range and remains there for 15 consecutive minutes, the practice restrictions for that range must be followed for the remainder of that practice.'
export const GHSA_NO_REVERT_QUOTE =
  'Schools may not revert to a lower restriction level, even if the WBGT reading later decreases.'
export const GHSA_ESCALATE_QUOTE =
  'If, during the same practice, the WBGT increases into a higher range and remains there for 15 consecutive minutes, the restrictions for the higher range must immediately be implemented.'
// Full sentence: it does not stop at "practice". Truncating it there and
// closing with an invented period reads as a flat equipment rule; the tail is
// what ties the instrument to GHSA compliance, which is the whole point on a
// device-required page.
export const GHSA_MONITOR_EVERY_PRACTICE_QUOTE =
  'A scientifically approved Wet Bulb Globe Temperature (WBGT) monitor must be used at every outdoor practice to ensure compliance with GHSA policy.'
export const GHSA_REMINDER_SOURCE = {
  name: 'GHSA — Reminder: Practice Policy for Heat and Humidity',
  url: 'https://www.ghsa.net/reminder-practice-policy-heat-and-humidity',
  verifiedOn: '2026-08-09',
}

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

// --- SCHSL (South Carolina) administrative constants ----------------------
// Source: SCHSL Heat and Acclimatization Guidelines (Updated April 2024).

export const SCHSL_READING_INTERVAL_MINUTES = 30
export const SCHSL_READING_LEAD_MINUTES = 30
export const SCHSL_CALIBRATION_INTERVAL_YEARS = 2
/** A reading must hold a range this long before the range's restrictions lock in. */
export const SCHSL_RANGE_HOLD_MINUTES = 15
/** Cold immersion must be immediately available at or above this WBGT. */
export const SCHSL_COLD_IMMERSION_WBGT_F = 82
export const SCHSL_DEVICE_QUOTE =
  'A scientifically approved WBGT thermometer should be on site and utilized. Do not rely on local weather updates or weather apps as they do not provide an accurate reading for your specific venue.'
export const SCHSL_APP_QUOTE = 'Phone apps are not scientifically approved at this time.'
export const SCHSL_REQUIRED_QUOTE =
  'All schools are required to use a 1) scientifically approved on-site Wet Bulb Globe Thermometer (WBGT), 2) cold immersion tub or other effective cooling devices, and 3) have a venue-specific Emergency Action Plan in place'
/**
 * The source's prose wording for its top boundary, which disagrees with the
 * table label (see the SCHSL black band comment). Lives here rather than in
 * locale copy so the threshold-literal guard stays satisfiable.
 */
export const SCHSL_TOP_BOUNDARY_TEXT_QUOTE = 'at 92.1 or above'
/**
 * Red-band (90.0-92.0) sentence for continuous-effort events where the
 * prescribed breaks cannot happen — cross country is the source's example.
 */
export const SCHSL_CONTINUOUS_QUOTE =
  'Competitions involving high intensity effort, in which breaks are not possible (e.g. Cross Country meets), should be delayed until WBGT reading is below 90 or canceled.'

// --- Iowa administrative constants ---------------------------------------
// Source: IHSAA/IGHSAU/IHSMA/IHSSA WBGT Heat Modification Guidance (8.5.24).

export const IOWA_READING_INTERVAL_MINUTES = 30
export const IOWA_ACCLIMATIZE_DEVICE_MIN_MINUTES = 15
export const IOWA_ACCLIMATIZE_DEVICE_MAX_MINUTES = 20
export const IOWA_DEVICE_HEIGHT_FEET = 3
/** WBGT use is recommended year-round above this ambient air temperature. */
export const IOWA_AMBIENT_TRIGGER_F = 80
/** Iowa states it derives its numbers from the national Category 2 region set. */
export const IOWA_CATEGORY_NUMBER = 2
export const IOWA_RECOMMENDED_QUOTE =
  'The use of WBGT is recommended throughout the calendar year when the ambient temperature is above 80 degrees (indoors or outdoors).'
export const IOWA_APP_QUOTE =
  'Using local news weather forecasts, weather apps on your phone or smart device do NOT provide an accurate temperature for where your conducting your outdoor or non climate controlled activity.'

// --- SCHSL band guidelines ------------------------------------------------
// SCHSL's table is structurally the same as GHSA's, with one addition: cold
// immersion must be available at or above SCHSL_COLD_IMMERSION_WBGT_F (82), so
// every band from yellow up carries coolingZoneRequired.

const SCHSL_GREEN = {
  maxPracticeMinutes: null,
  restBreaksPerHour: 3,
  restBreakMinMinutes: 3,
  restBreakMaxMinutes: null,
  restMinutesPerHour: null,
  footballEquipment: null,
  noConditioning: false,
  coolingZoneRequired: false,
  noOutdoorWorkouts: false,
}

const SCHSL_YELLOW = {
  maxPracticeMinutes: null,
  restBreaksPerHour: 3,
  restBreakMinMinutes: 4,
  restBreakMaxMinutes: null,
  restMinutesPerHour: null,
  footballEquipment: null,
  noConditioning: false,
  coolingZoneRequired: true,
  noOutdoorWorkouts: false,
}

const SCHSL_ORANGE = {
  maxPracticeMinutes: 120,
  restBreaksPerHour: 4,
  restBreakMinMinutes: 4,
  restBreakMaxMinutes: null,
  restMinutesPerHour: null,
  footballEquipment: 'helmet-shoulder-pads-shorts',
  noConditioning: false,
  coolingZoneRequired: true,
  noOutdoorWorkouts: false,
}

const SCHSL_RED = {
  maxPracticeMinutes: 60,
  restBreaksPerHour: null,
  restBreakMinMinutes: null,
  restBreakMaxMinutes: null,
  restMinutesPerHour: 20,
  footballEquipment: 'none',
  noConditioning: true,
  coolingZoneRequired: true,
  noOutdoorWorkouts: false,
}

const SCHSL_BLACK = {
  maxPracticeMinutes: 0,
  restBreaksPerHour: null,
  restBreakMinMinutes: null,
  restBreakMaxMinutes: null,
  restMinutesPerHour: null,
  footballEquipment: null,
  noConditioning: true,
  coolingZoneRequired: true,
  noOutdoorWorkouts: true,
}

// --- Iowa band guidelines -------------------------------------------------
// Iowa prints rest breaks as a RANGE ("3-5 minutes each"), so these bands use
// restBreakMaxMinutes. Equipment language per Appendix C's football mapping.

const IOWA_GREEN = {
  maxPracticeMinutes: null,
  restBreaksPerHour: 3,
  restBreakMinMinutes: 3,
  restBreakMaxMinutes: 5,
  restMinutesPerHour: null,
  footballEquipment: null,
  noConditioning: false,
  coolingZoneRequired: false,
  noOutdoorWorkouts: false,
}

const IOWA_YELLOW = {
  maxPracticeMinutes: null,
  restBreaksPerHour: 3,
  restBreakMinMinutes: 4,
  restBreakMaxMinutes: 6,
  restMinutesPerHour: null,
  footballEquipment: null,
  noConditioning: false,
  coolingZoneRequired: true,
  noOutdoorWorkouts: false,
}

const IOWA_ORANGE = {
  maxPracticeMinutes: 120,
  restBreaksPerHour: 4,
  restBreakMinMinutes: 4,
  restBreakMaxMinutes: 6,
  restMinutesPerHour: null,
  footballEquipment: 'helmet-shoulder-pads-shorts',
  noConditioning: false,
  coolingZoneRequired: true,
  noOutdoorWorkouts: false,
}

const IOWA_RED = {
  maxPracticeMinutes: 60,
  restBreaksPerHour: null,
  restBreakMinMinutes: null,
  restBreakMaxMinutes: null,
  restMinutesPerHour: 20,
  footballEquipment: 'none',
  noConditioning: true,
  coolingZoneRequired: true,
  noOutdoorWorkouts: false,
}

const IOWA_BLACK = {
  maxPracticeMinutes: 0,
  restBreaksPerHour: null,
  restBreakMinMinutes: null,
  restBreakMaxMinutes: null,
  restMinutesPerHour: null,
  footballEquipment: null,
  noConditioning: true,
  coolingZoneRequired: false,
  noOutdoorWorkouts: true,
}

export const SCHSL = {
  id: 'schsl',
  source: {
    name: 'SCHSL Heat and Acclimatization Guidelines (Updated April 2024)',
    url: 'https://schsl.org/wp-content/uploads/2024/07/Heat-Guidelines-Updated_-April-2024-3.pdf',
    verifiedOn: '2026-08-09',
  },
  remoteEstimatesAllowed: 'device-required',
  bands: [
    // The source is internally inconsistent at the top boundary: the table
    // prints "Over 92.1", §3.d says "at 92.1 or above", §3.e.iv says ">92.1".
    // Resolved conservatively (>92.0 → black), matching GENERIC_NATA above.
    { flag: 'black', minF: 92.0, minInclusive: false, sourceLabel: 'Over 92.1', guideline: SCHSL_BLACK },
    { flag: 'red', minF: 90.0, minInclusive: true, sourceLabel: '90.0-92.0', guideline: SCHSL_RED },
    { flag: 'orange', minF: 87.0, minInclusive: true, sourceLabel: '87.0-89.9', guideline: SCHSL_ORANGE },
    { flag: 'yellow', minF: 82.0, minInclusive: true, sourceLabel: '82.0-86.9', guideline: SCHSL_YELLOW },
    { flag: 'green', minF: null, minInclusive: true, sourceLabel: 'Under 82.0', guideline: SCHSL_GREEN },
  ],
}

export const IOWA_CATEGORY_2 = {
  id: 'iowa',
  source: {
    name: 'Iowa IHSAA/IGHSAU/IHSMA/IHSSA WBGT Heat Modification Guidance (8.5.24)',
    url: 'https://ihsma.org/wp-content/uploads/2025/07/WBGT-Guidance8.5.24.pdf',
    verifiedOn: '2026-08-09',
  },
  // WBGT is "recommended", not mandated — but the same document states that
  // phone weather apps "do NOT provide an accurate temperature" for the venue,
  // so remote estimates cannot stand in for the on-site reading Iowa describes.
  remoteEstimatesAllowed: 'device-recommended',
  bands: [
    // Appendix C labels this band "89.8 or greater (BLACK)"; the main table
    // prints "> 89.7". Same boundary, both as printed.
    { flag: 'black', minF: 89.7, minInclusive: false, sourceLabel: '> 89.7', guideline: IOWA_BLACK },
    { flag: 'red', minF: 87.7, minInclusive: true, sourceLabel: '87.7 – 89.7', guideline: IOWA_RED },
    { flag: 'orange', minF: 84.7, minInclusive: true, sourceLabel: '84.7 – 87.6', guideline: IOWA_ORANGE },
    // Source prints "< 79.7" then "79.8 – 84.6", leaving 79.7 itself
    // unassigned. Resolved upward (≥79.7 → yellow), the safe direction.
    { flag: 'yellow', minF: 79.7, minInclusive: true, sourceLabel: '79.8 – 84.6', guideline: IOWA_YELLOW },
    { flag: 'green', minF: null, minInclusive: true, sourceLabel: '< 79.7', guideline: IOWA_GREEN },
  ],
}

// --- TSSAA (Tennessee) administrative constants ---------------------------
// Source: TSSAA Heat Policy (Revised October 2024).

export const TSSAA_REVISION = 'October 2024'
export const TSSAA_WBGT_FIRST_CHOICE_QUOTE =
  "Wet Bulb Globe Temperature (WBGT) takes into account more environmental factors than heat index and should be a school's first choice when evaluating conditions and planning activities."
export const TSSAA_APP_QUOTE =
  'The use of a weather app on a cell phone is permissible to measure heat index if no other instrument is available to measure heat index at the site of the practice or competition.'
export const TSSAA_EITHER_QUOTE =
  'Each school is responsible for obtaining either a Wet Bulb Globe Temperature or Heat Index reading at the site of practices and competitions.'
/** Bolded in the source; a should-recommendation that spans EVERY band. */
export const TSSAA_COLD_TUB_QUOTE =
  'A cold water immersion tub or other form of rapid on-site cooling should be available for all warm weather practices. If exertional heat stroke is suspected, use immersion for on-site cooling before transporting to the hospital. Access to water should be available to all athletes at all times.'

const TSSAA_GREEN = {
  maxPracticeMinutes: null,
  restBreaksPerHour: null,
  restBreakMinMinutes: null,
  restBreakMaxMinutes: null,
  restMinutesPerHour: null,
  footballEquipment: null,
  noConditioning: false,
  coolingZoneRequired: false,
  noOutdoorWorkouts: false,
  // TSSAA's table starts at 82.0 — it states nothing below that.
  extraKeys: ['guideline.notAddressedBelow'],
}

const TSSAA_YELLOW = {
  maxPracticeMinutes: null,
  restBreaksPerHour: 3,
  restBreakMinMinutes: 3,
  restBreakMaxMinutes: null,
  restMinutesPerHour: null,
  footballEquipment: null,
  noConditioning: false,
  coolingZoneRequired: false,
  noOutdoorWorkouts: false,
}

const TSSAA_ORANGE = {
  maxPracticeMinutes: 120,
  restBreaksPerHour: 4,
  restBreakMinMinutes: 4,
  restBreakMaxMinutes: null,
  restMinutesPerHour: null,
  // TSSAA differs from UIL/GHSA here: full pads ARE allowed during contact at
  // this band; the restriction applies to non-contact and conditioning work.
  footballEquipment: null,
  noConditioning: false,
  coolingZoneRequired: false,
  noOutdoorWorkouts: false,
  extraKeys: ['guideline.tssaaFootballContactAllowed'],
}

const TSSAA_RED = {
  maxPracticeMinutes: 60,
  restBreaksPerHour: null,
  restBreakMinMinutes: null,
  restBreakMaxMinutes: null,
  restMinutesPerHour: 20,
  footballEquipment: null,
  noConditioning: true,
  coolingZoneRequired: false,
  noOutdoorWorkouts: false,
  extraKeys: ['guideline.tssaaFootballNonContactNoEquipment'],
}

const TSSAA_BLACK = {
  maxPracticeMinutes: 0,
  restBreaksPerHour: null,
  restBreakMinMinutes: null,
  restBreakMaxMinutes: null,
  restMinutesPerHour: null,
  footballEquipment: null,
  noConditioning: true,
  coolingZoneRequired: false,
  noOutdoorWorkouts: true,
}

export const TSSAA = {
  id: 'tssaa',
  source: {
    name: 'TSSAA Heat Policy (Revised October 2024)',
    url: 'https://cms-files.tssaa.org/documents/tssaa/health-safety-information/2025-26TSSAAHeatPolicy.pdf',
    verifiedOn: '2026-08-09',
  },
  // The policy's first sentence puts the reading "at the site of practices
  // and competitions"; a phone weather app is permitted only to read HEAT
  // INDEX and only when no other instrument is available. On-site is the
  // named method, so the verdict card carries the on-site caveat.
  remoteEstimatesAllowed: 'device-recommended',
  bands: [
    { flag: 'black', minF: 92.0, minInclusive: false, sourceLabel: 'Above 92.0', guideline: TSSAA_BLACK },
    { flag: 'red', minF: 90.0, minInclusive: true, sourceLabel: '90 to 92', guideline: TSSAA_RED },
    { flag: 'orange', minF: 87.0, minInclusive: true, sourceLabel: '87 to 89.9', guideline: TSSAA_ORANGE },
    { flag: 'yellow', minF: 82.0, minInclusive: true, sourceLabel: '82.0 – 86.9', guideline: TSSAA_YELLOW },
    { flag: 'green', minF: null, minInclusive: true, sourceLabel: '< 82.0', guideline: TSSAA_GREEN },
  ],
}

/**
 * TSSAA's alternative Heat Index ladder, printed alongside the WBGT bands. Kept
 * separate from the WBGT bands so a heat-index number can never be classified
 * against a WBGT threshold. Labels are exactly as the source prints them.
 */
export const TSSAA_HEAT_INDEX_BANDS = [
  { sourceLabel: 'Under 95', pairsWithWbgt: '82.0 – 86.9' },
  { sourceLabel: '95 Degrees to 99 Degrees', pairsWithWbgt: '87 to 89.9' },
  { sourceLabel: '100 Degrees to 104 Degrees', pairsWithWbgt: '90 to 92' },
  { sourceLabel: 'Above 104 Degrees', pairsWithWbgt: 'Above 92.0' },
]

// --- NCHSAA (North Carolina) reference table ------------------------------
// NOT a POLICIES entry, deliberately. NCHSAA's thresholds are a different
// family from this site's flag bands (80/85/88/90 vs 82/87/90/92): wiring
// them into classifyWbgt would print a verdict the association's own chart
// contradicts, so North Carolina renders as its own two-column table only.
//
// Rebuilt 2026-08-09 against the CURRENT 2025-26 handbook (§2.3.5 and
// §2.3.3(g)). The 2015-era guidance PDF this section previously cited was a
// superseded document: it carried a five-colour code and a weather-station/
// airport fallback clause, and the current handbook has NEITHER — do not
// restore them from old copies.

/** §2.3.5(a) — measurement is device-based; no remote-fallback clause exists. */
export const NCHSAA_DEVICE_QUOTE =
  'WBGT should be measured (using a scientifically approved device) for all sports when student-athletes may be at risk for exertional heat illness (EHI).'
/** §2.3.5(a), same paragraph — the reading cadence. */
export const NCHSAA_CADENCE_QUOTE =
  'WBGT should be accessed every hour beginning 30 minutes before the beginning of practice.'
/** §2.3.3(g) — the handbook's own mandate sentence for the containing policy. */
export const NCHSAA_MANDATE_QUOTE =
  'All schools should have a heat illness prevention and management policy for all sanctioned activities and this policy must be followed.'

export const NCHSAA_REFERENCE = {
  id: 'nchsaa',
  source: {
    name: 'NCHSAA Handbook 2025-26, §2.3.5 Prevention of Heat Illness — WBGT Index and Athletic Activity Chart',
    url: 'https://nchsaa.org/wp-content/uploads/2025/08/25-26-NCHSAA-Handbook-Print-Version.pdf',
    verifiedOn: '2026-08-09',
  },
  /** Rows hottest first, matching the reversed-render convention elsewhere. */
  rows: [
    { sourceLabel: '90 or above', breakMinutes: null, breakEveryMinutes: null, textKeys: ['northCarolina.rows.suspend'] },
    { sourceLabel: '88 - 89.9', breakMinutes: 5, breakEveryMinutes: 15, textKeys: ['northCarolina.rows.observation', 'northCarolina.rows.removePads', 'northCarolina.rows.immersion'] },
    { sourceLabel: '85 - 87.9', breakMinutes: 5, breakEveryMinutes: 20, textKeys: ['northCarolina.rows.reducedIntensity', 'northCarolina.rows.immersion'] },
    { sourceLabel: '80 - 84.9', breakMinutes: 5, breakEveryMinutes: 25, textKeys: ['northCarolina.rows.normal'] },
    { sourceLabel: 'Less than 80', breakMinutes: 5, breakEveryMinutes: 30, textKeys: ['northCarolina.rows.unlimited'] },
  ],
}

// --- NYSPHSAA (New York) reference table ----------------------------------
// HEAT INDEX degrees, not WBGT. Never feed these numbers to classifyWbgt.

export const NYSPHSAA_APPROVED_ON = '2010-05-01'
export const NYSPHSAA_UPDATED_ON = '2023-05-03'
export const NYSPHSAA_CHECK_LEAD_HOURS = 1
export const NYSPHSAA_AMBIENT_TRIGGER_F = 80
export const NYSPHSAA_WARNING_BREAK_INTERVAL_MINUTES = 15
export const NYSPHSAA_APP_QUOTE =
  'Download WeatherBug app to your phone or log into www.weatherbug.com.'
export const NYSPHSAA_ZIP_QUOTE =
  'Enter zip code or city and state in the location section of the app or on-line or determine the THI by using a Wet Bulb Globe Temperature Indicator.'

export const NYSPHSAA_HEAT_INDEX_REFERENCE = {
  id: 'nysphsaa',
  source: {
    name: 'NYSPHSAA Heat Index Procedures (updated May 3, 2023)',
    url: 'https://s3.amazonaws.com/nysphsaa.org/documents/2023/5/5/Heat_Index_Procedure_5_23.pdf',
    verifiedOn: '2026-08-09',
  },
  /** Rows hottest first. `tier` is the source's own banner for the row. */
  rows: [
    { sourceLabel: '96 degrees or greater', tierKey: 'alert', required: true, textKeys: ['newYork.rows.noOutside'] },
    // The source's REQUIRED banner covers only the 96+ Alert tier; the 91-95
    // Warning tier is printed under RECOMMENDED (vertical side label).
    // Rows list their actions in the source's own order. The Warning row's
    // monitor/postpone/shorten lines were missing entirely (re-read from the
    // PDF 2026-08-10), which made the table say the 91-95 tier called for
    // FEWER actions than the cooler 86-90 tier — a table that reads "the
    // hotter it gets, the less you do". Note the source escalates its own
    // wording between the two tiers: Watch says "lower", Warning "much lower",
    // so they are separate strings and must not be collapsed.
    { sourceLabel: '91 degrees to 95 degrees', tierKey: 'warning', required: false, textKeys: ['newYork.rows.breaks15', 'newYork.rows.monitor', 'newYork.rows.considerPostponeMuch', 'newYork.rows.considerShorten', 'newYork.rows.recovery', 'newYork.rows.clothing', 'newYork.rows.helmetsOnly'] },
    { sourceLabel: '86 degrees to 90 degrees', tierKey: 'watch', required: false, textKeys: ['newYork.rows.water', 'newYork.rows.considerPostpone', 'newYork.rows.considerShorten', 'newYork.rows.recovery'] },
    { sourceLabel: '80 degrees to 85 degrees', tierKey: 'caution', required: false, textKeys: ['newYork.rows.water', 'newYork.rows.considerShorten'] },
    { sourceLabel: 'under 79 degrees', tierKey: 'full', required: false, textKeys: ['newYork.rows.fullActivity'] },
  ],
}

// --- Virginia statute constants ------------------------------------------
// Code of Virginia § 22.1-271.10 (2025, cc. 478, 493). The statute sets NO
// activity thresholds — school boards do. The only number it fixes is the
// WBGT level at which ice must be provided.

export const VA_CODE_SECTION = '§ 22.1-271.10'
export const VA_CODE_CITATION = '2025, cc. 478, 493'
export const VA_ICE_WBGT_F = 80
export const VA_MIN_TIERS = 5
export const VA_CONSISTENCY_QUOTE =
  'Be consistent with any heat guidelines based on Wet Bulb Globe Temperature (WBGT) levels developed by an organization or entity whose purpose it is to regulate or govern interscholastic athletics programs in the Commonwealth'
export const VA_CANCEL_QUOTE =
  'Include parameters relating to the scheduling of outdoor athletics practices or games during different WBGT levels and establishing the WBGT levels at which outdoor athletics practices or games shall be cancelled'

export const VA_STATUTE_SOURCE = {
  name: 'Code of Virginia § 22.1-271.10 — Guidelines and policies on student-athlete extreme heat safety and protection',
  url: 'https://law.lis.virginia.gov/vacode/title22.1/chapter14/section22.1-271.10/',
  verifiedOn: '2026-08-09',
}

export const POLICIES = {
  'uil-class-2': UIL_CLASS_2,
  'uil-class-3': UIL_CLASS_3,
  ghsa: GHSA,
  schsl: SCHSL,
  tssaa: TSSAA,
  iowa: IOWA_CATEGORY_2,
  generic: GENERIC_NATA,
}
