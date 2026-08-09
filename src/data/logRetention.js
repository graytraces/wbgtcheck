/**
 * How much of the reading log this site keeps on the user's device.
 *
 * Plain JS for the same reason as policyData.js and feedbackContact.js: the
 * privacy policy states this number and scripts/prerender.mjs renders that
 * page, so both the React app and the prerender must read the identical value.
 * A privacy policy that quotes a retention limit the code no longer honours is
 * the drift this pattern exists to prevent.
 */
export const MAX_LOG_ENTRIES = 200
