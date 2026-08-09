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
  wbgtVsHeatIndex: { path: 'wbgt-vs-heat-index', key: 'wbgtVsHeatIndex' },
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
