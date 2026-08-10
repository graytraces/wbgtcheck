import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import i18n from '../i18n'
import en from '../locales/en.json'
import es from '../locales/es.json'
import NewYork from '../pages/NewYork'
import {
  POLICIES,
  NYSPHSAA_CATEGORY_LOOKUP_URL,
  NYSPHSAA_CATEGORY_LOOKUP_CHECKED_ON,
  NYSPHSAA_STRICTEST_CATEGORY,
  NYSPHSAA_WBGT_BLACK_MIN_F,
  NYSPHSAA_WBGT_CATEGORIES,
} from '../data/policyOracle'
import { defaultPolicyFor, policyMatchesState } from '../hooks/useWbgt'
import { statePageKeyByPolicy } from '../seo'

/**
 * New York gets NO category prompt, and this file is the reasoning.
 *
 * NYSPHSAA publishes the same three-category WBGT split CIF does — the chart
 * on page 2 is numerically identical to CIF's today — so the obvious move
 * after California is to give New York the same prompt. It would be wrong.
 *
 * The prompt is only a safeguard if the reader can ANSWER it. CIF publishes a
 * district-by-district roster this repo fetched and read. NYSPHSAA's own
 * instruction is "use this link to determine the category of your location",
 * and that link has no working nameservers. Asking a question whose answer is
 * unreachable does not transfer the decision to the reader; it relabels a
 * guess — and one category too warm moves a school's stop line by 3.6 °F.
 *
 * So the site keeps New York out of the picker and spends the page on what a
 * reader can actually do instead. What must never happen is the middle
 * option: publishing a category for anyone.
 */

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

const renderNY = () =>
  render(
    <MemoryRouter initialEntries={['/en/new-york']}>
      <Routes>
        <Route path="/:lang/*" element={<NewYork />} />
      </Routes>
    </MemoryRouter>,
  )

describe('New York stays out of the picker', () => {
  it('has no policy id, no default and no state page mapping', () => {
    for (const id of Object.keys(POLICIES)) {
      expect(id.startsWith('nysphsaa'), `${id} reached the picker`).toBe(false)
    }
    expect(defaultPolicyFor('NY')).toBe('generic')
    expect(policyMatchesState('NY', 'generic')).toBe(false)
    // …and nothing routes a picker selection to /new-york, which is what would
    // happen if someone wired the chart in without the question.
    expect(Object.values(statePageKeyByPolicy)).not.toContain('newYork')
  })

  it('the three NYSPHSAA ladders are labels only — they have no bands', () => {
    // A NyWbgtCategory carries sourceLabels for rendering and deliberately no
    // minF/minInclusive, so classifyWbgt cannot be handed one by accident.
    for (const category of NYSPHSAA_WBGT_CATEGORIES) {
      for (const band of category.bands) {
        expect(band).not.toHaveProperty('minF')
        expect(band).not.toHaveProperty('guideline')
      }
    }
  })
})

describe('what /new-york tells a reader who cannot find their category', () => {
  it('states the dead lookup as a dated, checkable fact', () => {
    renderNY()
    expect(
      screen.getByText(
        i18n.t('newYork.lookupDeadBody', {
          url: NYSPHSAA_CATEGORY_LOOKUP_URL,
          checkedOn: NYSPHSAA_CATEGORY_LOOKUP_CHECKED_ON,
        }),
      ),
    ).toBeInTheDocument()
    // The URL is printed so the reader can verify the claim themselves. It is
    // deliberately not an anchor: a link that cannot resolve invites a click
    // that can only fail.
    const { container } = renderNY()
    expect(container.textContent).toContain(NYSPHSAA_CATEGORY_LOOKUP_URL)
    expect(
      container.querySelector(`a[href="${NYSPHSAA_CATEGORY_LOOKUP_URL}"]`),
      'the dead lookup is offered as a link',
    ).toBeNull()
    expect(NYSPHSAA_CATEGORY_LOOKUP_CHECKED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('names the strict column as the fallback, derived from the chart', () => {
    // The one recommendation that cannot be too permissive, and it is computed
    // from the black floors rather than asserted — so it cannot invert if the
    // chart is ever renumbered.
    expect(NYSPHSAA_STRICTEST_CATEGORY).toBe(1)
    const floors = Object.values(NYSPHSAA_WBGT_BLACK_MIN_F)
    expect(NYSPHSAA_WBGT_BLACK_MIN_F.cat1).toBe(Math.min(...floors))
    renderNY()
    expect(
      screen.getByText(
        i18n.t('newYork.whatToDoBody', {
          strictest: NYSPHSAA_STRICTEST_CATEGORY,
          strictestBlack: NYSPHSAA_WBGT_BLACK_MIN_F.cat1,
          loosestBlack: NYSPHSAA_WBGT_BLACK_MIN_F.cat3,
        }),
      ),
    ).toBeInTheDocument()
  })

  it('explains why California is asked its category and New York is not', () => {
    renderNY()
    expect(screen.getByText(en.newYork.noPromptBody)).toBeInTheDocument()
    // The comparison is only useful if the reader can go and look.
    const { container } = renderNY()
    expect(container.querySelector('a[href="/en/california"]')).toBeTruthy()
  })

  it('never publishes a category for anyone, in either locale', () => {
    const { container } = renderNY()
    const text = container.textContent ?? ''
    // The page may name the strict FALLBACK; it may not tell a reader which
    // category their school is, and it may not offer the national figure as a
    // way to find out.
    expect(text).not.toMatch(/your school is in Category/i)
    expect(text).not.toMatch(/most of New York is Category/i)
    for (const dict of [en, es]) {
      // The figure is acknowledged and refused in the same sentence.
      expect(dict.newYork.categoryFigureBody).toMatch(/coarse|burdo/i)
      // The fallback is stated as a floor to read, not as an assignment.
      expect(dict.newYork.whatToDoBody).toContain('{{strictest}}')
      expect(dict.newYork.whatToDoBody).toMatch(/NYSPHSAA/)
      expect(dict.newYork.lookupDeadBody).toContain('{{url}}')
      expect(dict.newYork.lookupDeadBody).toContain('{{checkedOn}}')
    }
    expect(text).not.toContain('{{')
  })
})
