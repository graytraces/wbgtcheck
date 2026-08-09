/**
 * fetch with a deadline.
 *
 * Every external call in this app previously had none, and a hung upstream is
 * worse here than a failed one: `status` stays 'loading', the UI shows
 * "Loading…" indefinitely, and both recovery affordances a user has — the
 * retry button and the stale banner — live inside the 'ready' branch, so
 * neither ever appears. NWS returning nothing slowly locked the page in a
 * state with no way out except a manual reload.
 *
 * A timeout turns that into the ordinary error path, which already offers a
 * retry. AbortSignal is supported by both the browser and the Workers runtime.
 */

/** Client-side deadline. Matches the geolocation timeout already used. */
export const CLIENT_FETCH_TIMEOUT_MS = 15_000

/**
 * Worker-side deadline for upstream calls. Shorter than the client's so the
 * proxy fails before the caller does and can return a clean status rather than
 * having the connection cut under it.
 */
export const UPSTREAM_FETCH_TIMEOUT_MS = 10_000

export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs: number = CLIENT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  // No AbortController (very old runtime, or a test stub): the call still
  // works, it just has no deadline — better than throwing on a missing global.
  if (typeof AbortController === 'undefined') return fetch(input, init)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
