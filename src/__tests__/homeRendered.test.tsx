import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { act, screen, fireEvent, waitFor } from '@testing-library/react'
import i18n from '../i18n'
import en from '../locales/en.json'
import {
  installMemoryStorage,
  stubForecastFetch,
  renderHome,
  aqiFixture,
  awayTimeZone,
  AUSTIN_TX,
} from '../test/homeFixture'
import { STATE_GUIDES } from '../data/guideRegistry'
import { pageSEO, statePageKeyByPolicy, pickerLadderPageKeys } from '../seo'
import { defaultPolicyFor } from '../hooks/useWbgt'
import { WBGT_LOG_KEY, type WbgtLogEntry } from '../hooks/useWbgtLog'
import { UIL_CLASS_3, classifyWbgt } from '../data/policyOracle'

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

const NOTICE_HEADINGS = [
  en.home.stateLadderHeading,
  en.home.stateScaleHeading,
  en.home.stateNoNumbersHeading,
]

const shownNotice = () => NOTICE_HEADINGS.filter((h) => screen.queryByText(h) !== null)

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
  it('says nothing about the picker in a state the picker DOES offer', async () => {
    // Tennessee: TSSAA is a picker option that simply is not auto-selected, so
    // policyId is 'generic' here. Gating on that said, in as many words, that
    // Tennessee's own scale is not one of the picker's options.
    const view = await homeIn('TN', 'Nashville, TN')
    const tennessee = STATE_GUIDES.find((g) => g.abbr === 'TN')!
    expect(guideLink(tennessee), 'no route to the guide').toBeTruthy()
    expect(shownNotice(), 'a false notice is on the Tennessee page').toEqual([])
    view.unmount()
  })

  it('shows the ladder notice in a state the picker does not offer', async () => {
    // California has a guide and no picker entry, so the flag above it really
    // does come from the NATA fallback.
    const view = await homeIn('CA', 'Los Angeles, CA')
    expect(guideLink(STATE_GUIDES.find((g) => g.abbr === 'CA')!)).toBeTruthy()
    expect(screen.getByText(en.home.stateLadderHeading)).toBeInTheDocument()
    expect(screen.getByText(en.home.stateLadderBody)).toBeInTheDocument()
    view.unmount()
  })

  it('renders no un-interpolated placeholder in whichever variant it picks', async () => {
    // The helper in guideReachability drops the {{setBy}} interpolation Home
    // performs, so a variant needing it could ship reading "set by {{setBy}}".
    const view = await homeIn('CA', 'Los Angeles, CA')
    const notice = screen.getByText(en.home.stateLadderHeading).closest('section')!
    expect(notice.textContent).not.toMatch(/\{\{|\}\}/)
    view.unmount()
  })

  it('matches the picker for every guide state, on the rendered page', async () => {
    for (const guide of STATE_GUIDES) {
      const pickerKey = statePageKeyByPolicy[defaultPolicyFor(guide.abbr)]
      const pickerSlug = pickerKey ? pageSEO[pickerKey].path : null
      const expectLink = guide.slug !== pickerSlug
      // The notice claims this state's scale is not one of the picker's
      // options — so it may appear exactly where that is true.
      const expectNotice = expectLink && !pickerLadderPageKeys.has(guide.seoKey)

      const view = await homeIn(guide.abbr, `Somewhere, ${guide.abbr}`)
      expect(guideLink(guide) !== null, `${guide.abbr}: guide link presence`).toBe(expectLink)
      expect(shownNotice().length > 0, `${guide.abbr}: notice presence`).toBe(expectNotice)
      view.unmount()
    }
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
   * tick. Five hours on, the fixture's afternoon has passed its peak and the
   * only honest answer is silence.
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
    // It is no longer being announced as something the coach can plan around.
    expect(peakLine()?.textContent ?? '', 'the peak line drifted').not.toContain('91.4')
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
})
