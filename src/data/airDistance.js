/**
 * How far an AirNow reporting area may sit from the user's field before this
 * site stops speaking for it.
 *
 * NOT ORACLE VALUES. Every number in airPolicyData.js is cross-checked against
 * a primary document; these two are not, because no agency publishes a
 * representativeness radius for a reporting-area value. They are this
 * product's editorial line, chosen by us, and they live in their own file so
 * nobody later mistakes them for regulation or "re-verifies" them against a
 * source that does not exist. UI copy built on them must not sound
 * authoritative either — it says what this site will and will not claim, not
 * what any agency requires.
 *
 * Reporting areas are area-wide values from the nearest agency monitor. In the
 * populated parts of the country that monitor is usually a few miles away; in
 * eastern Oregon, Nevada and similar coverage gaps the nearest one can be a
 * hundred miles or more, and a 2 MB national file will still cheerfully return
 * it as "nearest".
 */

/** Past this, the card says the monitor is far and to check your own sky. */
export const AIR_AREA_FAR_KM = 40

/**
 * Past this, the card stops attaching a policy verdict to the number at all.
 *
 * 80 km is a judgement call, not a finding. The reasoning: at this range a
 * single area value routinely sits on the far side of terrain and weather from
 * the field, and the failure that matters is a distant GOOD reading being read
 * as clearance to practise. Suppressing the activity sentence removes the part
 * that looks like an instruction while the number itself stays visible with
 * its caveat — the gate never clears anyone anyway (air.notClearance), and the
 * heat flag is untouched either way.
 */
export const AIR_AREA_MAX_REPRESENTATIVE_KM = 80
