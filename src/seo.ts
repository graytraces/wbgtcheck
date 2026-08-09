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
  wbgtVsHeatIndex: { path: 'wbgt-vs-heat-index', key: 'wbgtVsHeatIndex' },
  states: { path: 'states', key: 'states' },
  privacy: { path: 'privacy', key: 'privacy' },
  disclaimer: { path: 'disclaimer', key: 'disclaimer' },
}
