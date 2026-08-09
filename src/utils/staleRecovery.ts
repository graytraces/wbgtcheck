/**
 * Recovery from a stale deploy: a tab whose HTML references hashed assets a
 * newer deploy has removed. Observed failure modes on iOS: a lazy route
 * chunk 404s on navigation (router error page the user reads as a white
 * screen), or cached entry JS boots while the entry stylesheet 404s (the
 * app renders unstyled). One fresh navigation fixes every variant — the
 * reload fetches current HTML with current asset hashes — so all detection
 * paths funnel into the same one-shot reload guard.
 */

const RELOAD_FLAG_KEY = 'wbgt-stale-reload'
/** A second reload inside this window means reloading is not fixing it. */
const RELOAD_WINDOW_MS = 60_000

/** True for the failed-dynamic-import wording of Chrome, Safari and Firefox. */
export function isStaleChunkError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    message,
  )
}

/**
 * Reload the page once per RELOAD_WINDOW_MS. Returns false (without
 * reloading) when a recent reload already ran — a second failure that fast
 * means the server is actually broken and the retry UI should show instead
 * of a reload loop. `reload` is injectable for tests only.
 */
export function reloadOnceForStaleAssets(
  reload: () => void = () => window.location.reload(),
): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_FLAG_KEY) ?? '0')
    if (Date.now() - last < RELOAD_WINDOW_MS) return false
    window.sessionStorage.setItem(RELOAD_FLAG_KEY, String(Date.now()))
  } catch {
    // Storage blocked: without the loop guard a broken deploy would reload
    // forever, so fall through to the visible error UI instead.
    return false
  }
  reload()
  return true
}
