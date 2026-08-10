import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import i18n from '../i18n'
import en from '../locales/en.json'
import es from '../locales/es.json'
import PolicyPicker from '../components/PolicyPicker'
import Layout from '../components/Layout'
import States from '../pages/States'
import California from '../pages/California'
import { POLICIES, type PolicyId } from '../data/policyOracle'
import { pageSEO, statePageKeyByPolicy } from '../seo'

/**
 * Can a reader get from the tool to the guide for the policy they are using?
 *
 * Before this, no: whichever policy was selected, the tool linked the same
 * four pages. Choosing SCHSL surfaced the association's PDF but never
 * /south-carolina; Tennessee and Iowa were the same. Six state guides existed
 * with no route in from the tool, and three of them (NC, NY, VA) are not in
 * the picker at all — /states is their only hub, and it sat off-screen in the
 * nav at 390px.
 */

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

function renderPicker(value: PolicyId) {
  return render(
    <MemoryRouter initialEntries={['/en']}>
      <PolicyPicker value={value} onChange={() => {}} />
    </MemoryRouter>,
  )
}

describe('guide reachability from the picker', () => {
  it('every jurisdiction policy links its own guide', () => {
    for (const id of Object.keys(POLICIES) as PolicyId[]) {
      if (id === 'generic') continue
      const key = statePageKeyByPolicy[id]
      expect(key, `no guide mapped for ${id}`).toBeDefined()
      const view = renderPicker(id)
      const link = screen.getByRole('link', {
        name: en.policies.readGuide.replace('{{policy}}', en.policies[id]),
      })
      expect(link).toHaveAttribute('href', `/en/${pageSEO[key].path}`)
      view.unmount()
    }
  })

  it('the generic NATA fallback claims no state guide', () => {
    // NATA is not a jurisdiction; pointing at a state page would imply it is.
    expect(statePageKeyByPolicy.generic).toBeUndefined()
    renderPicker('generic')
    expect(screen.queryByRole('link', { name: /guide/i })).not.toBeInTheDocument()
  })

  it('the Texas class note appears only for Texas', () => {
    const uil = renderPicker('uil-class-3')
    expect(screen.getByText(en.policies.pickerHelpTexas, { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: en.policies.uilMapLink })).toBeInTheDocument()
    uil.unmount()

    for (const id of ['ghsa', 'schsl', 'tssaa', 'iowa', 'generic'] as PolicyId[]) {
      const view = renderPicker(id)
      expect(
        screen.queryByText(en.policies.pickerHelpTexas, { exact: false }),
        `Texas class note leaked into ${id}`,
      ).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: en.policies.uilMapLink })).not.toBeInTheDocument()
      view.unmount()
    }
  })

  it('both locales carry the guide-link and Texas-only strings', () => {
    for (const locale of [en, es]) {
      expect(locale.policies.readGuide).toContain('{{policy}}')
      expect(locale.policies.pickerHelpTexas.length).toBeGreaterThan(0)
      // The shared help line must no longer name Texas.
      expect(locale.policies.pickerHelp).not.toMatch(/Texas/i)
    }
  })
})

describe('the air-quality guides are reachable at all', () => {
  it('every air guide is linked from the states hub', () => {
    // These three had no working route in: past the right edge of the nav
    // scroller at 390px AND absent from the hub, leaving the home AQI card as
    // the only way to reach them.
    render(
      <MemoryRouter initialEntries={['/en/states']}>
        <States />
      </MemoryRouter>,
    )
    for (const slug of [
      'washington-air-quality',
      'oregon-air-quality',
      'california-air-quality',
    ]) {
      expect(
        document.querySelector(`a[href="/en/${slug}"]`),
        `${slug} missing from the hub`,
      ).not.toBeNull()
    }
  })

  it('the hub list comes before the table it is a hub for', () => {
    render(
      <MemoryRouter initialEntries={['/en/states']}>
        <States />
      </MemoryRouter>,
    )
    const hub = document.querySelector('a[href="/en/texas"]')!
    const table = document.querySelector('table')!
    expect(hub.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('measurement is the second column, not the fourth', () => {
    // The page is titled after this distinction; at 390px the column used to
    // start at x=363, past the viewport edge behind a horizontal scroll.
    render(
      <MemoryRouter initialEntries={['/en/states']}>
        <States />
      </MemoryRouter>,
    )
    const heads = [...document.querySelectorAll('thead th')].map((h) => h.textContent?.trim())
    expect(heads[1]).toBe(en.states.colMeasurement)
  })
})

describe('the states hub is reachable', () => {
  it('sits early enough in the nav to be on screen on a phone', () => {
    render(
      <MemoryRouter initialEntries={['/en']}>
        <Routes>
          <Route path="/:lang" element={<Layout />}>
            <Route index element={<p>body</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    const nav = screen.getByRole('navigation', { name: 'Main' })
    const links = within(nav).getAllByRole('link')
    const index = links.findIndex((l) => l.textContent === en.common.nav.states)
    // Second item, right after Home: at 390px the scroller shows roughly three.
    expect(index).toBe(1)
  })
})

describe('California table structure', () => {
  it('shows one threshold grid and one action table, not three identical ladders', () => {
    // The three category ladders share byte-identical guideline objects, so
    // the page rendered the same five rows three times. They were also
    // visually indistinguishable, which on a page where the same reading is
    // BLACK in Category 1 and YELLOW in Category 3 is a real hazard once a
    // heading scrolls away.
    render(
      <MemoryRouter initialEntries={['/en/california']}>
        <California />
      </MemoryRouter>,
    )
    const tables = document.querySelectorAll('table')
    expect(tables).toHaveLength(2)
    // Every table has an accessible name — otherwise a screen reader
    // announces "table, N columns" with nothing to tell them apart.
    for (const table of tables) {
      const id = table.getAttribute('aria-labelledby')
      expect(id, 'table missing an accessible name').toBeTruthy()
      expect(document.getElementById(id!)).not.toBeNull()
    }
  })

  it('the threshold grid carries all three categories on one row per flag', () => {
    render(
      <MemoryRouter initialEntries={['/en/california']}>
        <California />
      </MemoryRouter>,
    )
    const grid = document.querySelector('table[aria-labelledby="ca-thresholds"]')!
    // Flag column + three category columns.
    expect(grid.querySelectorAll('thead th')).toHaveLength(4)
    // Five flags, each a row header rather than a plain cell.
    expect(grid.querySelectorAll('tbody th[scope="row"]')).toHaveLength(5)
  })
})
