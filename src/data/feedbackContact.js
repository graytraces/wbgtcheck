/**
 * The ONLY inbound contact address for this site. Hard rule: the operator's
 * personal address must never appear anywhere in the built output — a
 * negative test scans dist for it. Plain JS so scripts/prerender.mjs and
 * React share the identical address (same pattern as policyData.js).
 */
export const FEEDBACK_EMAIL = 'cardi.workshop@gmail.com'

/** @param {string} subject */
export function feedbackMailto(subject) {
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}`
}
