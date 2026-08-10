/**
 * Every guide page this site publishes, in one list. Plain JS so
 * scripts/prerender.mjs and the React app share one copy — the policyData.js
 * pattern, for the same reason.
 *
 * This existed in six places before: STATE_GUIDES, AIR_GUIDES and GUIDE_SLUGS
 * were each written out twice, once in States.tsx and once in prerender.mjs,
 * with nothing tying the copies together. Deleting kentucky and
 * oregon-air-quality from the prerender copies failed zero tests. Since the
 * nav dropped to five items, /states is the only hub, so a guide missing from
 * the prerendered copy is a guide that does not exist for a reader whose JS
 * failed — exactly the reader the prerender is for.
 *
 * Order is by abbreviation, and both the hub list and the directory table use
 * it, so the two agree. Sorting by the visible label was the obvious
 * alternative and is wrong here: every Spanish label begins "Guía …", so
 * label order carries no information in ES and would differ from EN, taking
 * the prerender mirror with it.
 */

/**
 * A state guide. `abbr` joins to STATE_DIRECTORY and to the detected location;
 * `seoKey` joins to pageSEO; `slug` is the URL.
 */
export const STATE_GUIDES = [
  { abbr: 'CA', slug: 'california', seoKey: 'california', labelKey: 'states.californiaLink' },
  { abbr: 'FL', slug: 'florida', seoKey: 'florida', labelKey: 'states.floridaLink' },
  { abbr: 'GA', slug: 'georgia', seoKey: 'georgia', labelKey: 'states.georgiaLink' },
  { abbr: 'IA', slug: 'iowa', seoKey: 'iowa', labelKey: 'states.iowaLink' },
  { abbr: 'KY', slug: 'kentucky', seoKey: 'kentucky', labelKey: 'states.kentuckyLink' },
  { abbr: 'MA', slug: 'massachusetts', seoKey: 'massachusetts', labelKey: 'states.massachusettsLink' },
  { abbr: 'NC', slug: 'north-carolina', seoKey: 'northCarolina', labelKey: 'states.northCarolinaLink' },
  { abbr: 'NY', slug: 'new-york', seoKey: 'newYork', labelKey: 'states.newYorkLink' },
  { abbr: 'SC', slug: 'south-carolina', seoKey: 'southCarolina', labelKey: 'states.southCarolinaLink' },
  { abbr: 'TN', slug: 'tennessee', seoKey: 'tennessee', labelKey: 'states.tennesseeLink' },
  { abbr: 'TX', slug: 'texas', seoKey: 'texas', labelKey: 'states.texasLink' },
  { abbr: 'VA', slug: 'virginia', seoKey: 'virginia', labelKey: 'states.virginiaLink' },
]

/** Air-quality guides. Same shape; `abbr` is the state they cover. */
export const AIR_GUIDES = [
  { abbr: 'CA', slug: 'california-air-quality', seoKey: 'californiaAir', labelKey: 'states.californiaAirLink' },
  { abbr: 'OR', slug: 'oregon-air-quality', seoKey: 'oregonAir', labelKey: 'states.oregonAirLink' },
  { abbr: 'WA', slug: 'washington-air-quality', seoKey: 'washingtonAir', labelKey: 'states.washingtonAirLink' },
]

/**
 * Abbreviation → slug, for the directory table's per-row link and for the
 * home page, which knows the visitor's state but not their policy id.
 */
export const GUIDE_SLUG_BY_ABBR = Object.fromEntries(
  STATE_GUIDES.map((guide) => [guide.abbr, guide.slug]),
)
