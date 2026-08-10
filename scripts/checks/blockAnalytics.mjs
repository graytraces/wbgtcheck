/**
 * Every check script serves the real dist/, and the real dist/ carries the
 * real measurement ID. A page load here is indistinguishable from a visitor's
 * at the GA4 end: gtag/js loads, `gtag('config', ...)` fires, and a page_view
 * lands in the production property. The hscroll sweep alone opens 168 pages
 * per run.
 *
 * Nothing filters operator traffic — not in this code, not in the GA4
 * property — so those hits are simply counted as real ones, and the site has
 * a reading due at the end of September. Blocking at the network layer is the
 * only place this can be stopped, because the tag is in the shipped HTML by
 * design and must stay there.
 *
 * Call this on EVERY context or page that will load app HTML, before the
 * first navigation. Both hosts are blocked: googletagmanager serves the
 * loader, google-analytics receives the beacons. Killing the loader is
 * normally enough, but the second route means an inlined or hardcoded beacon
 * cannot quietly reintroduce the problem.
 */
export async function blockAnalytics(target) {
  await target.route('**googletagmanager.com/**', (route) => route.abort())
  await target.route('**google-analytics.com/**', (route) => route.abort())
}
