/**
 * Typed access to the site's single inbound contact address. The raw values
 * live in ../data/feedbackContact.js (plain JS) so scripts/prerender.mjs
 * uses the identical address — route every new contact surface through
 * this module, never a literal.
 */
export { FEEDBACK_EMAIL, feedbackMailto } from '../data/feedbackContact.js'
