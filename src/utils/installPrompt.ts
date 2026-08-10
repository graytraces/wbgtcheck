/**
 * Catches `beforeinstallprompt` at module scope, because nothing that mounts
 * later can.
 *
 * Chrome fires the event once, shortly after load, and never again for that
 * page. The add-to-home-screen hint used to render unconditionally at the
 * bottom of the page, so its own listener was installed on the first commit
 * and was always in place in time. It is now gated on a rendered verdict —
 * which waits on a two-hop NWS round trip (points, then gridpoint) — and on a
 * returning-reader check, so by the time it mounts the event has come and
 * gone. The listener that would have caught it does not exist yet, and there
 * is no second chance: the hint simply never appeared on Android/Chrome, the
 * majority mobile platform for this site and the only one where an install API
 * exists at all. (iOS is unaffected — it takes the Share-menu branch and needs
 * no event.)
 *
 * So the event is caught here, at import time, and stored. The component reads
 * what was caught instead of hoping to be mounted at the right instant.
 *
 * `preventDefault()` stays with the capture: it is what stops the browser
 * running its own install prompt alongside ours, and it has to happen inside
 * the handler — deferring it to whenever the component mounts is exactly the
 * race this module exists to remove.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

let deferred: BeforeInstallPromptEvent | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
  })
}

/** The stored event, or null if the browser never offered one. */
export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferred
}

/**
 * Drops the stored event. A `beforeinstallprompt` is single-use — once
 * `prompt()` has been called the browser will not honour it again — so the
 * hint clears it after firing rather than leaving a dead handle for the next
 * mount to offer a second, silent "Add" button.
 */
export function clearDeferredInstallPrompt(): void {
  deferred = null
}
