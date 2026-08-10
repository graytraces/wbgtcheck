export const SITE_URL = 'https://wbgtcheck.com'

export interface PageSEO {
  path: string
  /** i18n namespace under seo.* holding title/description/keywords. */
  key: string
}

// NOTE: Each entry MUST list `path:` first — the graytraces canonical-drift
// audit extracts the registered pageKey set with a regex that requires
// `{ path:` directly after the key.
export const pageSEO: Record<string, PageSEO> = {
  home: { path: '', key: 'home' },
  texas: { path: 'texas', key: 'texas' },
  georgia: { path: 'georgia', key: 'georgia' },
  southCarolina: { path: 'south-carolina', key: 'southCarolina' },
  tennessee: { path: 'tennessee', key: 'tennessee' },
  iowa: { path: 'iowa', key: 'iowa' },
  northCarolina: { path: 'north-carolina', key: 'northCarolina' },
  newYork: { path: 'new-york', key: 'newYork' },
  virginia: { path: 'virginia', key: 'virginia' },
  massachusetts: { path: 'massachusetts', key: 'massachusetts' },
  florida: { path: 'florida', key: 'florida' },
  california: { path: 'california', key: 'california' },
  kentucky: { path: 'kentucky', key: 'kentucky' },
  wbgtVsHeatIndex: { path: 'wbgt-vs-heat-index', key: 'wbgtVsHeatIndex' },
  // Cross-state topical guides. Neither belongs in STATE_GUIDES: they are not
  // a state's ladder, they are the two questions a reader asks ACROSS the
  // twelve — may a forecast be the reading, and does any of this cover the
  // band. They reach readers from /states like the air guides do.
  forecastOrDevice: { path: 'forecast-or-device', key: 'forecastOrDevice' },
  marchingBand: { path: 'marching-band-heat-rules', key: 'marchingBand' },
  states: { path: 'states', key: 'states' },
  // Air-quality guides. Slug is "<state>-air-quality" rather than the bare
  // state name used by the heat guides (/texas, /georgia): the two axes will
  // eventually both exist for the same state, and "air-quality" is also the
  // phrase these pages are searched with.
  washingtonAir: { path: 'washington-air-quality', key: 'washingtonAir' },
  oregonAir: { path: 'oregon-air-quality', key: 'oregonAir' },
  californiaAir: { path: 'california-air-quality', key: 'californiaAir' },
  privacy: { path: 'privacy', key: 'privacy' },
  disclaimer: { path: 'disclaimer', key: 'disclaimer' },
}

/** Air policy id → the pageSEO key of its guide page. */
export const airPageKeyByPolicy: Record<string, string> = {
  'wa-doh': 'washingtonAir',
  'or-osaa': 'oregonAir',
  'ca-cif': 'californiaAir',
}

/**
 * Heat policy id → the pageSEO key of its guide page — the heat-axis mirror of
 * airPageKeyByPolicy. Without it the tool linked the same four pages whichever
 * policy was selected, so choosing SCHSL, TSSAA or Iowa gave no route to that
 * state's guide at all. 'generic' is deliberately absent: NATA is not a
 * jurisdiction and has no guide page; /states is the fallback there.
 */
export const statePageKeyByPolicy: Record<string, string> = {
  'uil-class-2': 'texas',
  'uil-class-3': 'texas',
  ghsa: 'georgia',
  schsl: 'southCarolina',
  tssaa: 'tennessee',
  iowa: 'iowa',
  miaa: 'massachusetts',
}

/**
 * The guide pages whose ladder a reader can actually SELECT in the picker,
 * derived from the map above rather than listed by hand.
 *
 * This is the gate for the home page's fallback notice, which says the state's
 * own scale is not one of the picker's options. Gating on
 * `policyId === 'generic'` said that in Tennessee, where TSSAA IS an option
 * and simply is not auto-selected — and said it to a Texas reader who switched
 * the picker to NATA by hand. Both are false, and both close here.
 */
export const pickerLadderPageKeys: ReadonlySet<string> = new Set(
  Object.values(statePageKeyByPolicy),
)
