export const SUPPORTED_LANGS = ['en', 'es'] as const

// Content page slugs that map 1:1 to a React route under /:lang/<slug>.
// Keep this set in sync with src/App.tsx route children. Worker pre-validates
// against this for /:lang/<slug> requests; missing entries → 404 even for
// existing React routes.
export const VALID_TOOLS = new Set([
  'texas',
  'georgia',
  'wbgt-vs-heat-index',
  'states',
])

export const VALID_PAGES = new Set(['privacy', 'disclaimer'])

export function isValidPath(pathname: string): boolean {
  if (pathname === '/') return true
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return true
  const [lang, second] = segments
  if (!(SUPPORTED_LANGS as readonly string[]).includes(lang)) return false
  if (segments.length === 1) return true
  if (segments.length === 2) return VALID_TOOLS.has(second) || VALID_PAGES.has(second)
  return false
}
