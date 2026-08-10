/**
 * Removes the prerendered copy once React has taken over.
 *
 * `:not(script)` is load-bearing. scripts/prerender.mjs marks its JSON-LD with
 * the same `data-prerender` attribute it puts on prose, so an unqualified
 * sweep deleted every Article and BreadcrumbList on the site the moment React
 * mounted — measured at 1-2 blocks in the served HTML and 0 in the post-JS
 * DOM, on every page. Google reads structured data from the rendered DOM, so
 * those schemas had been invalid since launch. Canonical and description
 * survive only because <SEO> re-emits them; JSON-LD has no such re-emitter, so
 * it must simply not be removed.
 *
 * The prose wipe is unaffected: prerendered body copy is what this exists to
 * clear, and none of it is a <script>.
 *
 * This lives in its own module so the tests can call the real thing. They used
 * to render a local component with the effect copied into it, which passed
 * whatever App.tsx happened to say.
 */
export function clearPrerenderedCopy(doc: Document = document): void {
  doc.querySelectorAll('[data-prerender]:not(script)').forEach((el) => el.remove())
}
