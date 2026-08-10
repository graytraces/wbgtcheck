/**
 * GA4 event instrumentation. The measurement ID (G-NL5JKVRNS1) is configured
 * in index.html, which also denies all three advertising consent signals in
 * every region — this site runs no ads. Events queue into dataLayer whether or
 * not gtag has loaded, so a blocked or slow tag never throws here.
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

/**
 * Visit accounting, on this device only.
 *
 * The ~09-30 readout is supposed to answer whether coaches COME BACK, and
 * `verdict_view` and `location_set` count events, not people: nothing in the
 * property distinguishes one coach's twentieth check of the season from twenty
 * coaches' first. So each verdict view carries where this browser is in its
 * own sequence.
 *
 * A "qualifying visit" is a tab session in which a verdict was actually
 * rendered — not a page load, which counts bounces. Storage blocked means
 * every visit reads as the first, which is the honest degradation: we cannot
 * tell them apart, so we do not claim to.
 */
const VISIT_COUNT_KEY = 'wbgt-visit-count'
const FIRST_SEEN_KEY = 'wbgt-first-seen'
/**
 * Which local calendar day this tab last counted a visit on.
 *
 * It held '1' and meant only "this tab has been counted", which under-counted
 * exactly the reader the product is betting on. Session storage survives a
 * reload, so a coach who leaves the tab open and checks it every morning —
 * the habit the whole hypothesis rests on — counted once for the season:
 * measured, six visits in six fresh tabs went 1→6 while three reloads inside
 * one tab moved nothing. And because the add-to-home-screen hint waits for
 * `priorVisitCount() >= 1`, that same coach was never offered the shortcut
 * either. The ~09-30 readout was instrumented against the hypothesis it
 * exists to test.
 *
 * Holding the DAY instead of a bare flag keeps the within-session dedupe
 * unchanged and lets the next morning through. Still one value, still session
 * storage, still never sent — the privacy disclosure describes it as it is.
 */
const COUNTED_KEY = 'wbgt-visit-counted'

const DAY_MS = 86_400_000

/**
 * A local calendar date as a sortable number (2026-08-11 → 20260811).
 *
 * Local, not UTC: "a different day" has to mean what it means to the person
 * holding the phone, or a 7am check in Texas would share a day with the
 * previous evening's.
 */
export function localCalendarDay(ms: number): number {
  const at = new Date(ms)
  return at.getFullYear() * 10_000 + (at.getMonth() + 1) * 100 + at.getDate()
}

/**
 * The calendar day this tab last counted a visit on, or 0 if it has not.
 *
 * A tab that was already open when this shipped holds the old '1' marker,
 * which reads as an earlier day than any real one — so it counts once and then
 * behaves normally.
 */
function lastCountedDay(): number {
  try {
    const day = Number(window.sessionStorage.getItem(COUNTED_KEY))
    return Number.isFinite(day) && day > 0 ? day : 0
  } catch {
    // No session storage: the visit may be counted twice in one load, which
    // inflates a returning reader by one rather than inventing a new one.
    return 0
  }
}

function readNumber(key: string): number {
  try {
    const n = Number(window.localStorage.getItem(key))
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

/**
 * Qualifying visits recorded BEFORE this one — 0 the first time this browser
 * reaches a verdict. Reads nothing into the future and writes nothing, so a
 * caller can render from it.
 */
export function priorVisitCount(): number {
  return Math.trunc(readNumber(VISIT_COUNT_KEY))
}

export interface VisitStanding {
  /** 1 on this browser's first qualifying visit. */
  ordinal: number
  /** Whole days from the first qualifying visit to this one. */
  daysSinceFirst: number
}

/**
 * Counts this visit at most once per tab session PER DAY, and returns where it
 * sits. The second half matters: a tab that stays open across midnight is a
 * reader coming back, and counting it as the same visit is what made the
 * season-long habit invisible.
 */
export function recordVisit(): VisitStanding {
  const now = Date.now()
  const today = localCalendarDay(now)
  // Already counted only if it was counted TODAY. Anything earlier is the next
  // morning in a tab that was never closed.
  const counted = lastCountedDay() >= today
  const prior = priorVisitCount()
  const ordinal = counted ? Math.max(prior, 1) : prior + 1
  const first = readNumber(FIRST_SEEN_KEY) || now
  try {
    if (!counted) {
      window.localStorage.setItem(VISIT_COUNT_KEY, String(ordinal))
      if (!readNumber(FIRST_SEEN_KEY)) window.localStorage.setItem(FIRST_SEEN_KEY, String(now))
    }
  } catch {
    // Blocked storage: the ordinal below is still true of this load.
  }
  try {
    if (!counted) window.sessionStorage.setItem(COUNTED_KEY, String(today))
  } catch {
    // see above
  }
  return { ordinal, daysSinceFirst: Math.max(0, Math.floor((now - first) / DAY_MS)) }
}

/** A verdict card was rendered for a policy. */
export function trackVerdictView(state: string, category: string) {
  // Recording here rather than at page load is what makes the visit
  // "qualifying": the reader got as far as a verdict.
  const { ordinal, daysSinceFirst } = recordVisit()
  track('verdict_view', {
    state,
    category,
    visit_ordinal: String(ordinal),
    days_since_first: String(daysSinceFirst),
  })
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
