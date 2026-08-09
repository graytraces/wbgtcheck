/**
 * GA4 event instrumentation. The measurement ID lives in index.html as
 * G-PLACEHOLDER until the property is created; these events queue into
 * dataLayer regardless, so instrumentation is live the moment the real ID
 * replaces the placeholder.
 */

type GtagFn = (...args: unknown[]) => void

declare global {
  interface Window {
    gtag?: GtagFn
  }
}

function track(event: string, params: Record<string, string>) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', event, params)
  }
}

/** A verdict card was rendered for a policy. */
export function trackVerdictView(state: string, category: string) {
  track('verdict_view', { state, category })
}

/** The share card was exported. */
export function trackShareCard(format: 'download' | 'share') {
  track('share_card', { format })
}

/** The user set a location. */
export function trackLocationSet(method: 'zip' | 'geolocation' | 'saved') {
  track('location_set', { method })
}

/** A reading was saved to the session log. */
export function trackWbgtLogSave(source: 'forecast' | 'onsite') {
  track('wbgt_log_save', { source })
}
