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
 * A "qualifying visit" is a local calendar DAY on which a verdict was actually
 * rendered on this device — not a page load, which counts bounces, and not a
 * tab, which counts neither people nor days. Storage blocked means every visit
 * reads as the first, which is the honest degradation: we cannot tell them
 * apart, so we do not claim to.
 */
const VISIT_COUNT_KEY = 'wbgt-visit-count'
const FIRST_SEEN_KEY = 'wbgt-first-seen'
/**
 * Which local calendar day this TAB last counted a visit on.
 *
 * Session storage, so it dies with the tab — which is why it cannot be the
 * whole answer, and why the day below it exists.
 */
const COUNTED_KEY = 'wbgt-visit-counted'
/**
 * Which local calendar day this DEVICE last counted a visit on.
 *
 * The dedupe used to live only in the session key above, and a session is a
 * TAB: six visits in six fresh tabs counted 1→6 on one afternoon while three
 * reloads inside one tab counted nothing. Neither number is the thing the
 * ~09-30 readout is asking for. The question is whether a coach comes back
 * ACROSS DAYS, and a tab is not a day in either direction — it over-counts the
 * reader who opens the site from three different links this afternoon and
 * gives no shape at all to the reader who keeps one tab open.
 *
 * So a visit is at most one per local calendar day per device, and this is
 * where that is remembered. localStorage, because the fact being recorded —
 * "this device has already been counted today" — is a fact about the device
 * and has to outlive the tab that established it.
 *
 * The session key stays. It is the guard when localStorage is blocked or
 * full: without it a browser with no durable storage would count every
 * verdict render in the tab, inflating a single afternoon into a season.
 */
const VISIT_DAY_KEY = 'wbgt-visit-day'

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
function lastCountedDayInTab(): number {
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
 * Counts this visit at most once per local calendar day per DEVICE, and
 * returns where it sits.
 *
 * Both halves matter. A tab that stays open across midnight is a reader coming
 * back, and counting it as the same visit is what made the season-long habit
 * invisible; a second tab opened this afternoon is the SAME reader on the same
 * day, and counting it again is what made a single afternoon look like a
 * season. The unit is the day, so `ordinal` reads as "separate days this
 * browser has reached a verdict on" — which is the retention question, stated
 * in the only terms this site can honestly answer it in.
 */
export function recordVisit(): VisitStanding {
  const now = Date.now()
  const today = localCalendarDay(now)
  // Already counted only if it was counted TODAY, in this tab or in any other
  // one on this device. Anything earlier is the next morning.
  const counted = lastCountedDayInTab() >= today || readNumber(VISIT_DAY_KEY) >= today
  const prior = priorVisitCount()
  const ordinal = counted ? Math.max(prior, 1) : prior + 1
  const first = readNumber(FIRST_SEEN_KEY) || now
  try {
    if (!counted) {
      window.localStorage.setItem(VISIT_COUNT_KEY, String(ordinal))
      window.localStorage.setItem(VISIT_DAY_KEY, String(today))
      if (!readNumber(FIRST_SEEN_KEY)) window.localStorage.setItem(FIRST_SEEN_KEY, String(now))
    }
  } catch {
    // Blocked storage: the ordinal below is still true of this load, and the
    // session key below still stops this tab counting itself twice.
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
