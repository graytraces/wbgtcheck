import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import i18n from '../i18n'
import en from '../locales/en.json'
import {
  installMemoryStorage,
  stubForecastFetch,
  renderHome,
  aqiFixture,
  AUSTIN_TX,
} from '../test/homeFixture'
import { STATE_GUIDES } from '../data/guideRegistry'
import { pageSEO, statePageKeyByPolicy, pickerLadderPageKeys } from '../seo'
import { defaultPolicyFor } from '../hooks/useWbgt'

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
