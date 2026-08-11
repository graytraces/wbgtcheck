import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { act, screen, fireEvent, waitFor, within } from '@testing-library/react'
import i18n from '../i18n'
import en from '../locales/en.json'
import {
  installMemoryStorage,
  stubForecastFetch,
  renderHome,
  aqiFixture,
  awayTimeZone,
  wbgtFixture,
  AUSTIN_TX,
} from '../test/homeFixture'
import { buildHourlySeries } from '../utils/nws'
import { annotateHours, currentVerdict, restOfDayPeak, nextDayPeak } from '../utils/verdict'
import { formatWbgtF } from '../utils/units'
import { STATE_GUIDES, TOPIC_GUIDES } from '../data/guideRegistry'
import { pageSEO, statePageKeyByPolicy, pickerLadderPageKeys } from '../seo'
import { defaultPolicyFor } from '../hooks/useWbgt'
import { WBGT_LOG_KEY, type WbgtLogEntry } from '../hooks/useWbgtLog'
import { UIL_CLASS_3, classifyWbgt } from '../data/policyOracle'
import { feedbackMailto } from '../utils/feedback'

/**
 * What the HOME PAGE renders — not what a test-local re-implementation of its
 * branches would render.
 *
 * guideReachability.test.tsx proves the registry and the strings agree, but it
 * never mounts Home: it re-derives the notice in a helper of its own. That is
 * why reverting the gate to `policyId === 'generic'` — the round-3 regression
 * that told Tennessee and Texas readers their own association "is not one of
 * the picker's options" — passed the whole suite. The claim is about what is on
 * the screen, so the test has to be about what is on the screen.
 */

let store: Map<string, string>

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  store = installMemoryStorage()
  stubForecastFetch({ aqi: aqiFixture() })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Puts a located, already-answered reader in `abbr` and renders Home. */
async function homeIn(abbr: string, label: string) {
  store.clear()
  // Answered, so the Texas class prompt never stands between the reader and
  // the notice under test.
  store.set('wbgt-uil-class', JSON.stringify('uil-class-3'))
  store.set(
    'wbgt-location',
    JSON.stringify({ lat: AUSTIN_TX.lat, lon: AUSTIN_TX.lon, label, stateAbbr: abbr }),
  )
  const view = renderHome()
  await waitFor(() => expect(screen.getByText(en.verdict.todayHeading)).toBeInTheDocument())
  return view
}

/** The three "your state publishes its own ladder and it is not on screen"
    variants. Which of the three is chosen is guideReachability's business. */
const LADDER_HEADINGS = [
  en.home.stateLadderHeading,
  en.home.stateScaleHeading,
  en.home.stateNoNumbersHeading,
]

const shownLadderNotice = () => LADDER_HEADINGS.filter((h) => screen.queryByText(h) !== null)

/** The fourth variant: the ladder IS pickable, the picker is just not on it. */
const shownNotSelected = (abbr: string) =>
  screen.queryByText(i18n.t('home.stateNotSelectedHeading', { state: abbr }))

/**
 * The guide link the DETECTED STATE puts under the verdict.
 *
 * Matched on its exact label, because two other things on the page link the
 * same slug: the prose row at the foot ("Georgia GHSA") and the picker's own
 * "Read the {{policy}} guide" link. An href query — or a substring match —
 * cannot tell the three apart, and the whole point of this section is that it
 * appears where the picker's link does NOT.
 */
function guideLink(guide: (typeof STATE_GUIDES)[number]): Element | null {
  const label = `${i18n.t(guide.labelKey)} →`
  return (
    [...document.querySelectorAll(`a[href="/en/${guide.slug}"]`)].find(
      (a) => a.textContent?.trim() === label,
    ) ?? null
  )
}

describe('the fallback notice, as the page renders it', () => {
  it('does not tell a state the picker offers that the picker does not', async () => {
    // Tennessee: TSSAA is a picker option that simply is not auto-selected, so
    // policyId is 'generic' here. Gating on that said, in as many words, that
    // Tennessee's own scale is not one of the picker's options.
    const view = await homeIn('TN', 'Nashville, TN')
    const tennessee = STATE_GUIDES.find((g) => g.abbr === 'TN')!
    expect(guideLink(tennessee), 'no route to the guide').toBeTruthy()
    expect(shownLadderNotice(), 'a false notice is on the Tennessee page').toEqual([])
    // What IS true here, and what the page used to say nothing about: the flag
    // on screen is the NATA fallback, and TSSAA's ladder is one tap away.
    expect(shownNotSelected('TN')).toBeInTheDocument()
    view.unmount()
  })

  it('shows the ladder notice in a state the picker does not offer', async () => {
    // Kentucky has a guide and no picker entry, so the flag above it really
    // does come from the NATA fallback.
    //
    // This case used to be California, and moving it is the point rather than
    // a convenience: CIF's three ladders entered the picker, so the notice —
    // "your state publishes its own thresholds, and they are not one of the
    // picker's options" — stopped being true there and had to stop rendering.
    // That it did is asserted in the next case; this keeps the notice itself
    // covered by a state where it still says something true.
    const view = await homeIn('KY', 'Louisville, KY')
    expect(guideLink(STATE_GUIDES.find((g) => g.abbr === 'KY')!)).toBeTruthy()
    expect(screen.getByText(en.home.stateLadderHeading)).toBeInTheDocument()
    expect(screen.getByText(en.home.stateLadderBody)).toBeInTheDocument()
    view.unmount()
  })

  it('and no longer shows it in California, whose ladders the picker now has', async () => {
    const view = await homeIn('CA', 'Los Angeles, CA')
    // The flag on screen IS California's own ladder, so there is nothing to
    // warn about — the same silence a Texas or Georgia reader gets.
    expect(shownLadderNotice(), 'a stale notice survived the picker change').toEqual([])
    expect(shownNotSelected('CA'), 'a CIF ladder is auto-selected here').toBeNull()
    view.unmount()
  })

  it('warns a Texas reader who moves the picker to NATA by hand', async () => {
    // The old gate asked "is this state's ladder pickable" — a fact about the
    // picker. The reader's question is whether the flag ON SCREEN is their
    // state's, and for a Texas or Georgia reader who switched to NATA the
    // answer was no and the page said nothing.
    const view = await homeIn('TX', 'Austin, TX')
    expect(shownNotSelected('TX'), 'UIL is auto-selected here').toBeNull()
    expect(shownLadderNotice()).toEqual([])

    fireEvent.change(screen.getByLabelText(en.policies.pickerLabel), {
      target: { value: 'generic' },
    })

    expect(shownNotSelected('TX')).toBeInTheDocument()
    expect(
      screen.getByText(
        i18n.t('home.stateNotSelectedBody', { state: 'TX', policy: en.policies.generic }),
      ),
    ).toBeInTheDocument()
    view.unmount()
  })

  it('renders no un-interpolated placeholder in whichever variant it picks', async () => {
    // The helper in guideReachability drops the {{setBy}} interpolation Home
    // performs, so a variant needing it could ship reading "set by {{setBy}}".
    const view = await homeIn('KY', 'Louisville, KY')
    const notice = screen.getByText(en.home.stateLadderHeading).closest('section')!
    expect(notice.textContent).not.toMatch(/\{\{|\}\}/)
    view.unmount()
  })

  it('matches the picker for every guide state, on the rendered page', async () => {
    for (const guide of STATE_GUIDES) {
      const pickerKey = statePageKeyByPolicy[defaultPolicyFor(guide.abbr)]
      const pickerSlug = pickerKey ? pageSEO[pickerKey].path : null
      // The flag on screen is not this state's own ladder.
      const flagIsNotTheirs = guide.slug !== pickerSlug
      // …and WHY not: because the picker cannot offer it, or because it can
      // and is not showing it. Two different sentences, and the second one
      // used to be silence.
      const expectLadder = flagIsNotTheirs && !pickerLadderPageKeys.has(guide.seoKey)
      const expectNotSelected = flagIsNotTheirs && pickerLadderPageKeys.has(guide.seoKey)

      const view = await homeIn(guide.abbr, `Somewhere, ${guide.abbr}`)
      expect(guideLink(guide) !== null, `${guide.abbr}: guide link presence`).toBe(flagIsNotTheirs)
      expect(shownLadderNotice().length > 0, `${guide.abbr}: ladder notice`).toBe(expectLadder)
      expect(shownNotSelected(guide.abbr) !== null, `${guide.abbr}: not-selected notice`).toBe(
        expectNotSelected,
      )
      view.unmount()
    }
  })
})

/**
 * The 34 states this site does NOT cover got less warning than the 12 it does.
 *
 * A coach in Ohio or Alabama entered a ZIP and got a full-bleed NATA flag with
 * no notice section at all — the same screen a Georgia coach gets from GHSA's
 * own table — while Kentucky and California got an explicit orange-bordered
 * warning that the flag is not theirs. /en/states lists 16 states; "Ohio" and
 * "Alabama" appear on it zero times. The site was warning where it knew more
 * and staying silent where it knew less, which is backwards.
 */
describe('a state with no verified policy is told so', () => {
  it('names the state, disclaims the flag, and offers both ways out', async () => {
    const view = await homeIn('OH', 'Columbus, OH')
    expect(STATE_GUIDES.find((g) => g.abbr === 'OH'), 'Ohio grew a guide').toBeUndefined()

    // The heading said "this state" while the body two lines under it said
    // "not OH's own rule". One notice, one voice: both name it.
    const heading = screen.getByText(i18n.t('home.stateUnverifiedHeading', { state: 'OH' }))
    expect(heading.textContent, 'the heading still refuses to name the state').toContain('OH')
    const notice = heading.closest('section')!
    expect(notice.textContent).toContain('OH')
    expect(notice.textContent).not.toMatch(/\{\{|\}\}/)
    // It disclaims the flag rather than claiming anything about Ohio's rules.
    expect(notice.textContent).toContain(
      i18n.t('home.stateUnverifiedBody', { state: 'OH' }),
    )
    // Both routes out: the directory, and the one person who can close the gap.
    expect(notice.querySelector('a[href="/en/states"]')).not.toBeNull()
    const report = notice.querySelector<HTMLAnchorElement>('a[href^="mailto:"]')!
    expect(report.getAttribute('href')).toBe(feedbackMailto('wbgtcheck state policy: OH'))
    view.unmount()
  })

  /**
   * The majority case, and it was a dead end. 43215 was told the site cannot
   * help and handed a table Ohio is not in — /states lists 16 states — with
   * nothing to plan against meanwhile and no route to the page that answers
   * the question a reader in an uncovered state actually has: what to ask
   * their association for.
   *
   * The verdict card links /forecast-or-device only where the policy requires
   * an on-site reading, and the NATA fallback an uncovered state gets answers
   * 'unspecified', so this is not a second entry point competing with that
   * one — on an Ohio screen it is the only one.
   */
  it('points an uncovered state at the measurement guide and says what to do meanwhile', async () => {
    const view = await homeIn('OH', 'Columbus, OH')
    const notice = screen
      .getByText(i18n.t('home.stateUnverifiedHeading', { state: 'OH' }))
      .closest('section')!

    const guide = TOPIC_GUIDES.find((g) => g.seoKey === 'forecastOrDevice')!
    const link = notice.querySelector<HTMLAnchorElement>(`a[href="/en/${guide.slug}"]`)
    expect(link, 'no route out but a table Ohio is not in').not.toBeNull()
    // Ahead of the directory: it is the one of the two that answers something.
    const states = notice.querySelector('a[href="/en/states"]')!
    expect(
      link!.compareDocumentPosition(states) & Node.DOCUMENT_POSITION_FOLLOWING,
      'the dead-end link still comes first',
    ).toBeTruthy()

    // And the copy replaces the number it removes: the reader is told what to
    // plan against until their association answers.
    expect(notice.textContent).toMatch(/plan against the NATA ladder in the meantime/i)
    expect(notice.textContent).toMatch(/higher flag/i)
    view.unmount()
  })

  it('offers the measurement guide only where no state guide exists', async () => {
    // Georgia has its own guide and a policy that already carries the device
    // notice on the card. A second link to the same page under the notice
    // would be the competing entry point this fix was told to avoid.
    const guide = TOPIC_GUIDES.find((g) => g.seoKey === 'forecastOrDevice')!
    const view = await homeIn('KY', 'Louisville, KY')
    const notice = screen.getByText(en.home.stateLadderHeading).closest('section')!
    expect(notice.querySelector(`a[href="/en/${guide.slug}"]`)).toBeNull()
    view.unmount()
  })

  it('claims nothing about a state it cannot name', async () => {
    // The geolocation path sets stateAbbr null until NWS reports one. "We have
    // not verified 's policy" is not a sentence, and neither is a claim about
    // a state we have not identified.
    store.clear()
    store.set('wbgt-uil-class', JSON.stringify('uil-class-3'))
    store.set(
      'wbgt-location',
      JSON.stringify({ lat: AUSTIN_TX.lat, lon: AUSTIN_TX.lon, label: 'Somewhere', stateAbbr: null }),
    )
    const view = renderHome()
    await waitFor(() => expect(screen.getByText(en.verdict.todayHeading)).toBeInTheDocument())
    expect(screen.queryByText(en.home.stateUnverifiedHeading)).not.toBeInTheDocument()
    view.unmount()
  })

  it('says nothing about verification where the state IS verified', async () => {
    const view = await homeIn('GA', 'Atlanta, GA')
    expect(screen.queryByText(en.home.stateUnverifiedHeading)).not.toBeInTheDocument()
    view.unmount()
  })
})

/**
 * Opening the inline location editor threw in every test that tried it:
 * jsdom 26 has no `Element.prototype.scrollIntoView` and Home calls it. The
 * flow was guarded only by grepping Home.tsx for the string "scrollIntoView",
 * which cannot tell whether the editor opens, or where focus lands.
 */
/**
 * The fold, at the hour it is actually read.
 *
 * The audit measured this live at 8-9am local: Austin's headline said 80.0
 * YELLOW "Use discretion" on a day peaking 93.2 BLACK "No outdoor workouts";
 * Miami 83.0 YELLOW against 90.0 RED. The coach is deciding about 4pm, and the
 * peak sat 1.7-2.5 screens down in a strip showing 5 of 14 hours on a phone.
 *
 * The clock is pinned so the fixture's sine lands somewhere known: at 08:00
 * CDT the current hour is on the rising limb and the day's peak is four hours
 * out, which is the shape the finding is about.
 */
describe('the fold answers the question the coach is asking', () => {
  const AT_8AM_CDT = Date.parse('2026-08-10T13:00:00+00:00')

  afterEach(() => {
    vi.useRealTimers()
  })

  it('names the peak still ahead, its flag and its hour, under the big number', async () => {
    vi.setSystemTime(AT_8AM_CDT)
    store.clear()
    store.set('wbgt-uil-class', JSON.stringify('uil-class-3'))
    store.set('wbgt-policy', JSON.stringify('uil-class-3'))
    store.set('wbgt-location', JSON.stringify(AUSTIN_TX))
    vi.unstubAllGlobals()
    stubForecastFetch({ aqi: aqiFixture() })

    renderHome()
    await waitFor(() => expect(screen.getByText(en.verdict.todayHeading)).toBeInTheDocument())

    // What the fold showed before: the current hour, YELLOW. (The reading also
    // appears on its own hourly chip and on the log button, hence getAllBy.)
    expect(screen.getAllByText('86.7').length).toBeGreaterThan(0)
    expect(classifyWbgt(UIL_CLASS_3, 86.7).flag).toBe('yellow')

    // What it shows now, one line under it: the hour that decides practice.
    const peakFlag = classifyWbgt(UIL_CLASS_3, 91.4).flag
    expect(peakFlag, 'the fixture no longer crosses a band by the afternoon').not.toBe('yellow')
    const line = screen.getByText(
      i18n.t('verdict.peakAhead', {
        value: '91.4',
        flag: en.flags[peakFlag].label,
        time: new Intl.DateTimeFormat('en', {
          timeZone: 'America/Chicago',
          hour: 'numeric',
        }).format(new Date(AT_8AM_CDT + 4 * 3_600_000)),
      }),
    )
    expect(line).toBeInTheDocument()

    // It sits above the hourly strip it points at, and reaches it.
    const link = line.closest('a')!
    expect(link).toHaveAttribute('href', '#hourly-view')
    const hourly = screen.getByText(en.verdict.todayHeading)
    expect(link.compareDocumentPosition(hourly) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  /**
   * The constraint that makes this line safe to ship.
   *
   * `days` is memoised on [data, policy, timeZone] and `buildHourlySeries`
   * starts at the hour of the FETCH, so `days[0].peak` is "the peak still
   * ahead" only at load. A tab left open — which is what a phone in a pocket
   * between periods is — keeps that memo while the hours go by, and the line
   * would go on naming an afternoon peak the reader has already stood through.
   *
   * So the anchor is the hour the card is showing, which tracks the minute
   * tick. Five hours on, the fixture's afternoon has passed its peak, and
   * nothing on the card may still call that number something ahead of the
   * reader TODAY. (What the chip says instead — tomorrow — is the evening case
   * below; this test is only about the stale claim.)
   */
  it('stops naming the peak once it has been and gone', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(AT_8AM_CDT)
    store.clear()
    store.set('wbgt-uil-class', JSON.stringify('uil-class-3'))
    store.set('wbgt-policy', JSON.stringify('uil-class-3'))
    store.set('wbgt-location', JSON.stringify(AUSTIN_TX))
    vi.unstubAllGlobals()
    stubForecastFetch({ aqi: aqiFixture() })

    renderHome()
    await waitFor(() => expect(screen.getByText(en.verdict.todayHeading)).toBeInTheDocument())
    const peakLine = () => document.querySelector('a[href="#hourly-view"]')
    expect(peakLine()?.textContent, 'the line is not there to begin with').toContain('91.4')

    // Five hours later, same payload, no refetch: the minute tick moves the
    // card's hour past the peak the line was naming.
    await act(async () => {
      vi.setSystemTime(AT_8AM_CDT + 5 * 3_600_000)
      vi.advanceTimersByTime(60_000)
    })

    // The 12pm peak is still on the hourly strip, where it belongs as history.
    expect(screen.getAllByText('91.4').length).toBeGreaterThan(0)
    // It is no longer being announced as something still ahead of the reader
    // today. The lead-in comes from the string itself, so a chip that names
    // ANY reading as the rest of today's peak fails this — which is what a
    // revert to days[0].peak produces.
    const restOfToday = en.verdict.peakAhead.split('{{')[0].trim()
    expect(peakLine()?.textContent ?? '', 'the peak line drifted').not.toContain(restOfToday)
  })
})

/**
 * The other check, and the site's own copy calls it the primary one: "plan
 * tomorrow's practice with the forecast the night before."
 *
 * The peak chip correctly hides once the day's peak is behind the reader
 * (verified live: shown in Honolulu at 11am, gone in Atlanta at 5pm) — and
 * nothing replaced it, so tomorrow's peak lived only in the week strip ~2.5
 * screens down. The morning call got a one-screen answer and the PLANNING call
 * did not.
 */
describe('the evening, which the copy calls the primary use', () => {
  // 23:00 CDT on 2026-08-10: one hour left in the local day, so the hottest
  // hour still ahead today IS the hour on the card and the today chip is
  // right to hide.
  const AT_11PM_CDT = Date.parse('2026-08-11T04:00:00+00:00')
  const TZ = 'America/Chicago'

  afterEach(() => {
    vi.useRealTimers()
  })

  /** The same series Home builds — not a second model of it. */
  const series = () =>
    annotateHours(buildHourlySeries(wbgtFixture(AT_11PM_CDT - 2 * 3_600_000)), UIL_CLASS_3, TZ)

  const seedEvening = async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(AT_11PM_CDT)
    store.clear()
    store.set('wbgt-uil-class', JSON.stringify('uil-class-3'))
    store.set('wbgt-policy', JSON.stringify('uil-class-3'))
    store.set('wbgt-location', JSON.stringify(AUSTIN_TX))
    vi.unstubAllGlobals()
    stubForecastFetch({ aqi: aqiFixture() })
    renderHome()
    await waitFor(() => expect(screen.getByText(en.verdict.weekHeading)).toBeInTheDocument())
  }

  it('answers with tomorrow once today has no peak left to name', async () => {
    await seedEvening()
    const hours = series()
    const current = currentVerdict(hours, AT_11PM_CDT)!
    // The premise. Without it this test would pass on the today chip.
    expect(restOfDayPeak(hours, current), 'today still has a peak ahead').toBe(current)

    const peak = nextDayPeak(hours, current)!
    expect(peak.localDate).not.toBe(current.localDate)
    const expected = i18n.t('verdict.peakTomorrow', {
      value: formatWbgtF(peak.wbgtF),
      flag: en.flags[classifyWbgt(UIL_CLASS_3, peak.wbgtF).flag].label,
      time: new Intl.DateTimeFormat('en', { timeZone: TZ, hour: 'numeric' }).format(
        new Date(peak.time),
      ),
    })
    expect(
      screen.getByText(expected),
      'the evening reader is still sent to the week strip',
    ).toBeInTheDocument()
  })

  it('sends the reader to tomorrow\'s hours, not to what is left of today', async () => {
    await seedEvening()
    // Move the strip off tomorrow first, the way a reader browsing the week
    // does — otherwise the default already sits there and a link that did
    // nothing would look right.
    const days = within(screen.getByLabelText(en.verdict.weekHeading)).getAllByRole('button')
    fireEvent.click(days[days.length - 1])
    expect(screen.queryByText(en.verdict.tomorrowHeading)).not.toBeInTheDocument()

    fireEvent.click(document.querySelector('a[href="#hourly-view"]')!)
    expect(
      screen.getByText(en.verdict.tomorrowHeading),
      'the chip named tomorrow and pointed at another day',
    ).toBeInTheDocument()
  })
})

/**
 * /forecast-or-device and /marching-band-heat-rules shipped with exactly one
 * route in — /states — while the home page argued for both of them and linked
 * neither. `home.sections[2]` names marching band in UIL's 2026-27 standard;
 * `home.sections[3]` is the measurement question end to end ("Texas UIL
 * explicitly accepts internet-based readings; Georgia GHSA requires a
 * calibrated on-site instrument").
 */
describe('the two newest guides have a route in from the tool', () => {
  it('links each one from the section that argues for it', async () => {
    renderHome()
    for (const [index, seoKey] of [
      [2, 'marchingBand'],
      [3, 'forecastOrDevice'],
    ] as const) {
      const guide = TOPIC_GUIDES.find((g) => g.seoKey === seoKey)!
      const heading = screen.getByText(en.home.sections[index].heading)
      const block = heading.parentElement!
      const link = block.querySelector<HTMLAnchorElement>(`a[href="/en/${guide.slug}"]`)
      expect(link, `${guide.slug} has no link from the section about it`).not.toBeNull()
      // The label comes from the registry, so the URL and the words cannot
      // drift from the page they name.
      expect(link!.textContent).toContain(i18n.t(guide.labelKey))
    }
  })

  it('does not hang a guide link off a section that is not about one', async () => {
    renderHome()
    for (const index of [0, 1]) {
      const block = screen.getByText(en.home.sections[index].heading).parentElement!
      expect(block.querySelectorAll('a')).toHaveLength(0)
    }
  })
})

/**
 * The log and the card have to be on one clock, and Home is where that is
 * decided.
 *
 * 7af97f7 gave WbgtLog an optional `timeZone` prop and tested the component
 * with it — but Home never passed it, so the shipped page still stamped every
 * row in the device's zone while the card two screens above stamped the
 * field's. Same Atlanta session on a phone set to UTC+9: card "RIGHT NOW · AT
 * 9:00 AM", row "Aug 10, 2026 at 10:05 PM". A component test cannot see a
 * missing prop at the call site, which is exactly how this survived its own fix.
 */
describe('the reading log runs on the same clock as the card above it', () => {
  const STAMP = Date.parse('2026-08-10T13:05:00Z')
  const TZ = awayTimeZone(STAMP)

  const entry: WbgtLogEntry = {
    id: 'row-1',
    timestamp: STAMP,
    wbgtF: 88.4,
    source: 'forecast',
    flagKey: 'flags.red.label',
    policyKey: 'policies.generic',
    locationLabel: 'Atlanta, GA',
  }

  const stampedIn = (timeZone?: string) =>
    new Date(STAMP).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short', timeZone })

  it('stamps rows in the forecast zone, not the device zone', async () => {
    store.clear()
    store.set('wbgt-uil-class', JSON.stringify('uil-class-3'))
    store.set(
      'wbgt-location',
      JSON.stringify({ lat: AUSTIN_TX.lat, lon: AUSTIN_TX.lon, label: 'Atlanta, GA', stateAbbr: 'GA' }),
    )
    store.set(WBGT_LOG_KEY, JSON.stringify([entry]))
    vi.unstubAllGlobals()
    stubForecastFetch({ aqi: aqiFixture(), timeZone: TZ, place: { city: 'Atlanta', state: 'GA' } })

    renderHome()
    await waitFor(() => expect(screen.getByText(en.verdict.todayHeading)).toBeInTheDocument())
    // The log section mounts with the verdict but fills from storage an effect
    // later, so the history is one tick behind the heading above.
    await waitFor(() =>
      expect(screen.getByLabelText(en.wbgtLog.historyTitle)).toBeInTheDocument(),
    )

    const row = screen.getByLabelText(en.wbgtLog.historyTitle).querySelector('li')!
    expect(stampedIn(TZ), 'the away zone matches the runner, so this proves nothing').not.toBe(
      stampedIn(),
    )
    expect(row.textContent).toContain(stampedIn(TZ))
    expect(row.textContent, 'the log is on the device clock').not.toContain(stampedIn())

    // And the card above it is on that same clock — the two are one artifact
    // to the reader, and the disagreement was between them.
    const cardClock = new Intl.DateTimeFormat('en', {
      timeZone: TZ,
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000))
    expect(
      screen.getByText(en.verdict.nowHeading, { exact: false }).textContent,
    ).toContain(cardClock)
  })
})

describe('the inline location editor', () => {
  it('opens beside the label and puts the cursor in the field', async () => {
    const view = await homeIn('TX', 'Austin, TX')
    expect(document.getElementById('zip-input'), 'the editor is open before it is asked for').toBeNull()

    // The control beside the place name at the top of the verdict card.
    const label = screen.getByText('Austin, TX')
    fireEvent.click(screen.getAllByRole('button', { name: en.location.change })[0])

    const input = document.getElementById('zip-input')
    expect(input, 'the editor did not open').not.toBeNull()
    expect(document.activeElement, 'focus was left where the reader was standing').toBe(input)
    // And it opens where the label is, not 3.4 screens down the page.
    const editor = input!.closest('div.border-2')!
    expect(
      label.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    view.unmount()
  })

  /**
   * And it could not be closed.
   *
   * `changingLocation` cleared only on a SUCCESSFUL onZip/onGeolocate — there
   * was no cancel and no Escape handler — while the trigger is a
   * dotted-underline link immediately after the city name at the top of the
   * verdict, which is an easy mis-tap on a phone held one-handed on a field.
   * The way out was to enter a ZIP you did not want.
   */
  it('closes on the × without changing anything', async () => {
    const view = await homeIn('TX', 'Austin, TX')
    fireEvent.click(screen.getAllByRole('button', { name: en.location.change })[0])
    expect(document.getElementById('zip-input')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: en.location.cancelEdit }))

    expect(document.getElementById('zip-input'), 'the editor would not close').toBeNull()
    // And the reader is where they were: same location, same verdict.
    expect(screen.getByText('Austin, TX')).toBeInTheDocument()
    view.unmount()
  })

  it('closes on Escape, which is what a reader tries first', async () => {
    const view = await homeIn('TX', 'Austin, TX')
    fireEvent.click(screen.getAllByRole('button', { name: en.location.change })[0])
    expect(document.getElementById('zip-input')).not.toBeNull()

    // From the field, where the editor puts focus.
    fireEvent.keyDown(document.getElementById('zip-input')!, { key: 'Escape' })

    expect(document.getElementById('zip-input'), 'Escape did nothing').toBeNull()
    expect(screen.getByText('Austin, TX')).toBeInTheDocument()
    view.unmount()
  })

  it('says what the panel is for', async () => {
    // The compact variant dropped the heading, so what appeared under the
    // verdict was an unlabeled ZIP field and a location button.
    const view = await homeIn('TX', 'Austin, TX')
    fireEvent.click(screen.getAllByRole('button', { name: en.location.change })[0])
    const editor = document.getElementById('zip-input')!.closest('div.border-2')!
    expect(
      [...editor.querySelectorAll('h2')].some((h) => h.textContent === en.location.heading),
      'the panel is unlabeled',
    ).toBe(true)
    view.unmount()
  })
})
