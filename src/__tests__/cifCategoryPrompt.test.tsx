import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { screen, fireEvent, act, renderHook, waitFor } from '@testing-library/react'
import i18n from '../i18n'
import en from '../locales/en.json'
import es from '../locales/es.json'
import { useWbgt, defaultPolicyFor, policyMatchesState } from '../hooks/useWbgt'
import {
  CIF_CATEGORIES,
  CIF_CATEGORY_1,
  CIF_CATEGORY_3,
  CIF_SPREAD_EXAMPLE_F,
  GENERIC_NATA,
  POLICIES,
  classifyWbgt,
} from '../data/policyOracle'
import { displayedWbgtF } from '../utils/units'
import { statePageKeyByPolicy, pickerLadderPageKeys } from '../seo'
import { installMemoryStorage, stubForecastFetch, renderHome } from '../test/homeFixture'

/**
 * California's region-category prompt — the Texas class prompt, second run.
 *
 * CIF publishes three WBGT ladders and assigns each school a category from a
 * roster this site cannot read. Until 2026-08-11 the tool resolved that by
 * flagging Californians against the general NATA table, which is more
 * permissive than all three CIF ladders at every band: the "we cannot know"
 * position was quietly the least safe one on offer.
 *
 * The fix is Texas's: default to the STRICT end, ask above the verdict, and
 * remember the answer. What is asserted here is the part that makes the ask
 * legitimate rather than decorative — the default really is strict, the
 * question really is answerable (CIF's roster), and the flags on screen agree
 * with the printed chart at every tie.
 */

const FRESNO_CA = { lat: 36.75, lon: -119.77, label: 'Fresno, CA', stateAbbr: 'CA' }

let store: Map<string, string>

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  store = installMemoryStorage()
  stubForecastFetch({ place: { city: 'Fresno', state: 'CA' }, timeZone: 'America/Los_Angeles' })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function homeWithCaliforniaLocation() {
  store.set('wbgt-location', JSON.stringify(FRESNO_CA))
  const view = renderHome()
  await waitFor(() => expect(screen.getByLabelText(en.policies.pickerLabel)).toBeInTheDocument())
  return view
}

describe('the unanswered California default', () => {
  it('is the strictest CIF ladder, never the NATA fallback', () => {
    expect(defaultPolicyFor('CA')).toBe(CIF_CATEGORIES[0].id)
    expect(POLICIES[defaultPolicyFor('CA')]).toBe(CIF_CATEGORY_1)
    // The claim that makes the default defensible, checked rather than
    // asserted: at no reading in the published range does the pre-answer
    // ladder permit more than the NATA table it replaced.
    const FLAGS = ['green', 'yellow', 'orange', 'red', 'black'] as const
    for (let tenth = 700; tenth <= 960; tenth += 1) {
      const wbgtF = tenth / 10
      expect(
        FLAGS.indexOf(classifyWbgt(CIF_CATEGORY_1, wbgtF).flag),
        `${wbgtF.toFixed(1)} °F`,
      ).toBeGreaterThanOrEqual(FLAGS.indexOf(classifyWbgt(GENERIC_NATA, wbgtF).flag))
    }
  })

  it('is also the strictest of the three, so no category is short-changed', () => {
    for (const other of CIF_CATEGORIES.slice(1)) {
      const strictBlack = CIF_CATEGORY_1.bands.find((b) => b.flag === 'black')!.minF!
      const otherBlack = other.bands.find((b) => b.flag === 'black')!.minF!
      expect(strictBlack, `${other.id} opens black cooler than the default`).toBeLessThan(otherBlack)
    }
  })

  it('the pending sentence names the category that is actually in force', () => {
    // The prompt prints "Category {{category}}" from CIF_CATEGORIES[0]; the
    // default reads the same object. Pinning them together is what stops the
    // sentence outliving a moved default.
    expect(CIF_CATEGORIES[0].categoryNumber).toBe(1)
    expect(defaultPolicyFor('CA')).toBe(CIF_CATEGORIES[0].id)
    for (const dict of [en, es]) {
      expect(dict.policies.categoryPrompt.pending).toContain('{{category}}')
    }
  })

  it('survives re-entering a California ZIP', () => {
    // Without this, a reader who answered the prompt lost the answer on the
    // next location entry and fell back to the strict default — the Tennessee
    // bug, in a state where the two ends are two flags apart.
    for (const policy of CIF_CATEGORIES) {
      expect(policyMatchesState('CA', policy.id), `${policy.id} lost on re-location`).toBe(true)
    }
    expect(policyMatchesState('CA', 'generic')).toBe(false)
    expect(policyMatchesState('TX', 'cif-cat-1')).toBe(false)
  })
})

describe('CIF category prompt', () => {
  it('asks California users for their category, above the verdict', async () => {
    await homeWithCaliforniaLocation()
    const heading = screen.getByText(en.policies.categoryPrompt.heading)
    expect(heading).toBeInTheDocument()
    expect(
      screen.getByText(
        i18n.t('policies.categoryPrompt.pending', {
          category: CIF_CATEGORIES[0].categoryNumber,
        }),
      ),
    ).toBeInTheDocument()

    // The finding the Texas prompt exists for: a caveat below the verdict it
    // qualifies is a caveat nobody reads. Order, not just presence.
    const verdict = screen.getByText(en.verdict.conservativeNotice.split('{{')[0].trim(), {
      exact: false,
    })
    const picker = screen.getByLabelText(en.policies.pickerLabel)
    for (const later of [verdict, picker]) {
      expect(heading.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('does not ask outside California', async () => {
    store.set(
      'wbgt-location',
      JSON.stringify({ lat: 33.75, lon: -84.39, label: 'Atlanta, GA', stateAbbr: 'GA' }),
    )
    renderHome()
    await waitFor(() => expect(screen.getByLabelText(en.policies.pickerLabel)).toBeInTheDocument())
    expect(screen.queryByText(en.policies.categoryPrompt.heading)).not.toBeInTheDocument()
  })

  it('answering stops asking, and the answer survives the next visit', async () => {
    const view = await homeWithCaliforniaLocation()
    fireEvent.click(screen.getByRole('button', { name: en.policies['cif-cat-3'] }))

    expect(screen.queryByText(en.policies.categoryPrompt.heading)).not.toBeInTheDocument()
    expect(store.get('wbgt-policy')).toBe(JSON.stringify('cif-cat-3'))
    // The hint takes over, and it carries the measurement caveat the prompt
    // was carrying — the caveat must not leave with the question.
    expect(screen.getByText(en.policies.caCategoryHint)).toBeInTheDocument()

    view.unmount()
    renderHome()
    await waitFor(() => expect(screen.getByLabelText(en.policies.pickerLabel)).toBeInTheDocument())
    expect(screen.queryByText(en.policies.categoryPrompt.heading)).not.toBeInTheDocument()
  })

  it('choosing the default category answers it for this session', () => {
    // Seeded onto the unanswered default, which is the only state in which the
    // question is open at all.
    store.set('wbgt-policy', JSON.stringify(CIF_CATEGORIES[0].id))
    const { result } = renderHook(() => useWbgt())
    expect(result.current.cifCategoryChosen).toBe(false)
    act(() => {
      // A CHOICE even though it selects what was already on screen.
      result.current.setPolicyId('cif-cat-1')
    })
    expect(result.current.cifCategoryChosen).toBe(true)
  })

  it('is only ever open while the strict default is the policy in force', () => {
    // The flag is not "did the reader click", it is "may the prompt claim the
    // flags are Category 1". Anything else on screen closes the question,
    // because the prompt's own sentence would otherwise be false.
    for (const id of ['cif-cat-2', 'cif-cat-3', 'generic', 'uil-class-3'] as const) {
      store.clear()
      store.set('wbgt-policy', JSON.stringify(id))
      const { result, unmount } = renderHook(() => useWbgt())
      expect(result.current.cifCategoryChosen, `${id} left the question open`).toBe(true)
      unmount()
    }
  })

  /**
   * The known cost of not adding a storage key for this (see useWbgt): a
   * school genuinely on the default IS asked again next visit, because
   * choosing the default leaves nothing to distinguish it from silence.
   *
   * Pinned rather than left implicit, because the thing that makes it
   * acceptable is testable: whenever the prompt is back, the sentence beside
   * it is still true — the flags really are Category 1.
   */
  it('re-asks a Category 1 reader next visit, and is still telling the truth', async () => {
    const view = await homeWithCaliforniaLocation()
    fireEvent.click(screen.getByRole('button', { name: en.policies['cif-cat-1'] }))
    expect(screen.queryByText(en.policies.categoryPrompt.heading)).not.toBeInTheDocument()
    view.unmount()

    renderHome()
    await waitFor(() => expect(screen.getByLabelText(en.policies.pickerLabel)).toBeInTheDocument())
    expect(screen.getByText(en.policies.categoryPrompt.heading)).toBeInTheDocument()
    expect(store.get('wbgt-policy')).toBe(JSON.stringify(CIF_CATEGORIES[0].id))
    expect(
      screen.getByText(
        i18n.t('policies.categoryPrompt.pending', {
          category: CIF_CATEGORIES[0].categoryNumber,
        }),
      ),
    ).toBeInTheDocument()
  })

  it('never claims the strict default while some other ladder is on screen', async () => {
    // A Californian who moves the picker to NATA by hand must not be shown a
    // prompt saying every flag uses Category 1 — they do not.
    const view = await homeWithCaliforniaLocation()
    fireEvent.change(screen.getByLabelText(en.policies.pickerLabel), {
      target: { value: 'generic' },
    })
    await waitFor(() =>
      expect(screen.queryByText(en.policies.categoryPrompt.heading)).not.toBeInTheDocument(),
    )
    view.unmount()

    // …including on the visit after, where the choice comes back from storage
    // rather than from this session's state.
    renderHome()
    await waitFor(() => expect(screen.getByLabelText(en.policies.pickerLabel)).toBeInTheDocument())
    expect(screen.queryByText(en.policies.categoryPrompt.heading)).not.toBeInTheDocument()
  })

  it('a reader who returns to the default after wandering is asked again', () => {
    // Session state records only CIF picks, so moving the picker away and back
    // by hand reopens the question rather than leaving it silently closed by a
    // click that was about a different ladder.
    store.set('wbgt-policy', JSON.stringify(CIF_CATEGORIES[0].id))
    const { result } = renderHook(() => useWbgt())
    act(() => {
      result.current.setPolicyId('generic')
    })
    expect(result.current.cifCategoryChosen).toBe(true)
    act(() => {
      result.current.setPolicyId('cif-cat-1')
    })
    // Now it is closed for a reason that is actually about California.
    expect(result.current.cifCategoryChosen).toBe(true)
  })

  it('shows what the choice costs, computed from the ladders themselves', async () => {
    await homeWithCaliforniaLocation()
    const strictFlag = classifyWbgt(CIF_CATEGORY_1, CIF_SPREAD_EXAMPLE_F).flag
    const looseFlag = classifyWbgt(CIF_CATEGORY_3, CIF_SPREAD_EXAMPLE_F).flag
    // The claim the sentence makes is real, and this is where it is checked:
    // one reading, two flags apart.
    expect(strictFlag).toBe('black')
    expect(looseFlag).toBe('yellow')
    expect(
      screen.getByText(
        i18n.t('policies.categoryPrompt.spread', {
          value: CIF_SPREAD_EXAMPLE_F.toFixed(1),
          strictCategory: CIF_CATEGORY_1.categoryNumber,
          strictFlag: en.flags[strictFlag].label,
          looseCategory: CIF_CATEGORY_3.categoryNumber,
          looseFlag: en.flags[looseFlag].label,
        }),
      ),
    ).toBeInTheDocument()
  })

  it('links a roster the reader can actually open, in both locales', async () => {
    const { container } = await homeWithCaliforniaLocation()
    // The direct file. cifstate.org's own address for it serves an HTML shell
    // and answers 403 to non-browser clients, and a prompt whose "find yours"
    // link half-works is not a transfer of the decision.
    const link = container.querySelector(
      'a[href="https://d2o2figo6ddd0g.cloudfront.net/9/j/u0syhj3adcxckf/WBGT_Category.pdf"]',
    )
    expect(link, 'the prompt does not link the roster file').toBeTruthy()
    for (const dict of [en, es]) {
      expect(dict.policies.categoryPrompt.rosterLink.length).toBeGreaterThan(0)
      expect(dict.policies.categoryPrompt.body.length).toBeGreaterThan(0)
    }
  })
})

/**
 * The home page's fallback notice for California.
 *
 * Adding CIF to statePageKeyByPolicy puts 'california' into
 * pickerLadderPageKeys, which switches off the "this state publishes its own
 * ladder the picker cannot offer" notice. That is intended and it is also the
 * kind of second-order consequence that ships unnoticed, so it is checked in
 * both directions rather than assumed.
 */
describe('what the home page says to a Californian now', () => {
  it('routes all three categories to the California guide', () => {
    for (const policy of CIF_CATEGORIES) {
      expect(statePageKeyByPolicy[policy.id]).toBe('california')
    }
    expect(pickerLadderPageKeys.has('california')).toBe(true)
  })

  it('no longer tells a Californian their ladder is unavailable', async () => {
    await homeWithCaliforniaLocation()
    // The three variants of the old notice, none of which may appear when the
    // flag on screen IS California's own ladder.
    for (const key of ['home.stateLadderBody', 'home.stateScaleBody'] as const) {
      expect(screen.queryByText(i18n.t(key))).not.toBeInTheDocument()
    }
  })

  it('but still says so when the reader moves the picker off it by hand', async () => {
    const view = await homeWithCaliforniaLocation()
    fireEvent.change(screen.getByLabelText(en.policies.pickerLabel), {
      target: { value: 'generic' },
    })
    await waitFor(() =>
      expect(
        screen.getByText(
          i18n.t('home.stateNotSelectedBody', {
            state: 'CA',
            policy: en.policies.generic,
          }),
        ),
      ).toBeInTheDocument(),
    )
    view.unmount()
  })
})

/**
 * The seam table.
 *
 * Flags derive from the value as PRINTED to one decimal (displayedWbgtF), so
 * every tenth in and around each band edge has to carry the flag its printed
 * label implies — including the tenths CIF's chart never assigns, which
 * resolve upward into the hotter band. Walking the whole range rather than
 * spot-checking is the point: nine of the chart's twelve boundaries have a
 * gap, and the three ladders do not share any of them.
 */
describe('CIF seams: the number on screen and its flag agree', () => {
  it('walks every tenth of every ladder against its printed labels', () => {
    for (const policy of CIF_CATEGORIES) {
      for (let tenth = 700; tenth <= 960; tenth += 1) {
        const wbgtF = Number((tenth / 10).toFixed(1))
        const band = classifyWbgt(policy, wbgtF)
        // The flag must come from the printed digits, not the float behind
        // them — this is the invariant displayedFlag.test.tsx enforces for the
        // card, restated per band edge for the ladders added here.
        expect(classifyWbgt(policy, displayedWbgtF(wbgtF)).flag, `${policy.id} ${wbgtF}`).toBe(
          band.flag,
        )
        const printed = band.sourceLabel.match(/\d+\.\d+/g)!.map(Number)
        if (band.flag === 'green') {
          // "<x": every green reading is strictly below the printed bound.
          expect(wbgtF, `${policy.id} green ${wbgtF}`).toBeLessThan(printed[0])
        } else if (band.flag === 'black') {
          // "≥x": black may open BELOW its printed floor, because the tenths
          // the chart skips resolve upward. It may never open above it.
          expect(wbgtF, `${policy.id} black ${wbgtF}`).toBeGreaterThan(printed[0] - 0.3)
        } else {
          // A named range: a reading inside it must be inside the label, and a
          // reading below the label's floor must be one of the skipped tenths.
          expect(wbgtF, `${policy.id} ${band.flag} ${wbgtF} above its label`).toBeLessThanOrEqual(
            printed[1],
          )
          expect(
            wbgtF,
            `${policy.id} ${band.flag} ${wbgtF} more than a gap below its label`,
          ).toBeGreaterThan(printed[0] - 0.3)
        }
      }
    }
  })

  it('prints the seam table this change was reviewed against', () => {
    // Each ladder's first reading in each flag, in order — the table quoted in
    // the change report. Frozen here so a boundary edit has to restate it.
    const seams = CIF_CATEGORIES.map((policy) => {
      const firstOf: Record<string, string> = {}
      for (let tenth = 700; tenth <= 960; tenth += 1) {
        const wbgtF = Number((tenth / 10).toFixed(1))
        const flag = classifyWbgt(policy, wbgtF).flag
        if (!(flag in firstOf)) firstOf[flag] = wbgtF.toFixed(1)
      }
      return `${policy.id} ${['yellow', 'orange', 'red', 'black'].map((f) => firstOf[f]).join('/')}`
    })
    expect(seams).toEqual([
      'cif-cat-1 76.1/81.1/84.1/86.1',
      'cif-cat-2 79.7/84.7/87.7/89.7',
      'cif-cat-3 82.0/87.0/90.1/92.0',
    ])
  })
})
