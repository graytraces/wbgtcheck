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
import { STATE_GUIDES, AIR_GUIDES, GUIDE_SLUG_BY_ABBR } from '../data/guideRegistry'
import { defaultPolicyFor } from '../hooks/useWbgt'
import { STATE_DIRECTORY } from '../data/stateDirectory'
import { VALID_TOOLS, VALID_PAGES } from '../utils/routeValidation'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

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

/**
 * The hub lists used to be written out six times — STATE_GUIDES, AIR_GUIDES
 * and GUIDE_SLUGS, each once in States.tsx and once in prerender.mjs — with
 * nothing tying the copies together. Deleting kentucky and
 * oregon-air-quality from the prerender copies failed zero tests.
 *
 * They now come from one module, which makes that particular drift
 * impossible, so what is left to guard is the registry's joins: a guide whose
 * slug the worker rejects, or which no page renders, is still unreachable.
 */
describe('the guide registry is the single source for both renderers', () => {
  const ALL = [...STATE_GUIDES, ...AIR_GUIDES]

  it('every guide slug is worker-valid and has a pageSEO entry', () => {
    expect(ALL.length).toBe(15)
    for (const { slug, seoKey } of ALL) {
      expect(VALID_TOOLS.has(slug) || VALID_PAGES.has(slug), `${slug} would 404`).toBe(true)
      expect(pageSEO[seoKey], `${seoKey} missing from seo.ts`).toBeTruthy()
      expect(pageSEO[seoKey].path).toBe(slug)
    }
  })

  it('every state guide names a state the directory table lists', () => {
    const known = new Set(STATE_DIRECTORY.map((row) => row.abbr))
    for (const { abbr } of STATE_GUIDES) {
      expect(known.has(abbr), `${abbr} has a guide but no directory row`).toBe(true)
    }
    expect(Object.keys(GUIDE_SLUG_BY_ABBR).sort()).toEqual(STATE_GUIDES.map((g) => g.abbr).sort())
  })

  it('the hub list and the directory table scan in the same order', () => {
    const guideOrder = STATE_GUIDES.map((g) => g.abbr)
    expect(guideOrder).toEqual([...guideOrder].sort())
    const tableOrder = STATE_DIRECTORY.map((r) => r.abbr)
    expect(tableOrder).toEqual([...tableOrder].sort())
  })

  it('renders every registered guide as a link on /states', () => {
    i18n.changeLanguage('en')
    const { container } = render(
      <MemoryRouter initialEntries={['/en/states']}>
        <Routes>
          <Route path="/:lang/*" element={<States />} />
        </Routes>
      </MemoryRouter>,
    )
    for (const { slug } of ALL) {
      expect(
        container.querySelector(`a[href="/en/${slug}"]`),
        `${slug} is not linked from the hub`,
      ).toBeTruthy()
    }
  })

  /**
   * The one the old duplication actually broke. A guide missing from the
   * PRERENDERED hub does not exist for a reader whose JS failed — and since
   * the nav dropped to five items, /states is the only hub there is.
   */
  it.skipIf(!existsSync(join(process.cwd(), 'dist')))(
    'links every registered guide in the prerendered hub too, in both locales',
    () => {
      for (const lang of ['en', 'es']) {
        const html = readFileSync(join(process.cwd(), 'dist', lang, 'states.html'), 'utf-8')
        for (const { slug } of ALL) {
          expect(html, `${lang}/states.html does not link ${slug}`).toContain(`/${lang}/${slug}`)
        }
      }
    },
  )
})

/**
 * The picker keys guides by POLICY id, and six states with guide pages have
 * no policy id at all — CA, KY, FL, NC, NY and VA are deliberately not in the
 * picker. So a ZIP in any of them fell to the generic NATA ladder with no
 * guide link and no notice, while the air axis on the same screen detected
 * the state and linked its air guide.
 *
 * The gap is a safety one, not a navigation one: /california says in as many
 * words that the fallback is more permissive than every CIF ladder, and at
 * 86.5°F the fallback shows yellow where CIF Category 1 shows black.
 */
describe('states outside the picker still reach their guide', () => {
  const PICKERLESS = ['CA', 'KY', 'FL', 'NC', 'NY', 'VA']

  it('every pickerless state has a guide page but no policy of its own', () => {
    for (const abbr of PICKERLESS) {
      expect(GUIDE_SLUG_BY_ABBR[abbr], `${abbr} has no guide page`).toBeTruthy()
      // If one of these ever enters the picker this test should be revisited
      // deliberately, not silently satisfied.
      expect(defaultPolicyFor(abbr), `${abbr} now auto-selects a policy`).toBe('generic')
    }
  })

  /**
   * The condition Home.tsx renders on, kept here so the rule is checked
   * rather than merely written: show the guide whenever the detected state
   * has one AND the picker is not already pointing at it.
   */
  const wouldShowGuide = (abbr: string) => {
    const detected = STATE_GUIDES.find((g) => g.abbr === abbr)
    const pickerKey = statePageKeyByPolicy[defaultPolicyFor(abbr)]
    const pickerSlug = pickerKey ? pageSEO[pickerKey].path : null
    return !!detected && detected.slug !== pickerSlug
  }

  it('shows the guide for every pickerless state', () => {
    for (const abbr of PICKERLESS) {
      expect(wouldShowGuide(abbr), `${abbr} would still get no guide link`).toBe(true)
    }
  })

  it('does not duplicate the link where the picker already carries it', () => {
    // TX/GA/SC/IA/MA auto-select their own policy, and PolicyPicker renders
    // that guide link itself — a second copy under the verdict would be noise.
    for (const abbr of ['TX', 'GA', 'SC', 'IA', 'MA']) {
      expect(wouldShowGuide(abbr), `${abbr} would show the link twice`).toBe(false)
    }
  })

  it('says nothing at all for a state with no guide', () => {
    expect(STATE_GUIDES.find((g) => g.abbr === 'CO')).toBeUndefined()
    expect(wouldShowGuide('CO')).toBe(false)
  })

  it('carries the fallback notice in both locales', () => {
    for (const dict of [en, es]) {
      expect(dict.home.stateLadderHeading).toBeTruthy()
      expect(dict.home.stateLadderBody).toMatch(/NATA/)
    }
  })
})

/**
 * The directory table is five columns of prose on a 358px wrapper, so most of
 * it starts off-screen and the order decides what a phone reader sees. The
 * two judgement columns — how you must measure, and whether WBGT is mandated
 * — now come first; Governing body was 202px of the least decision-relevant
 * text on the page and it pushed the mandate to x=413, past the edge.
 *
 * The clipping is legitimate. Being unable to reach the clipped part by
 * keyboard was not: a scroll container needs to be focusable to be scrollable
 * without a mouse.
 */
describe('the states directory table is readable and reachable', () => {
  const renderStates = () => {
    i18n.changeLanguage('en')
    return render(
      <MemoryRouter initialEntries={['/en/states']}>
        <Routes>
          <Route path="/:lang/*" element={<States />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('puts the two judgement columns ahead of the governing body', () => {
    const { container } = renderStates()
    const headers = [...container.querySelectorAll('thead th')].map((th) => th.textContent?.trim())
    expect(headers).toEqual([
      en.states.colState,
      en.states.colMeasurement,
      en.states.colMandate,
      en.states.colBody,
      en.states.colNote,
    ])
  })

  it('keeps every row cell in step with the header order', () => {
    const { container } = renderStates()
    const firstRow = container.querySelector('tbody tr')!
    const cells = [...firstRow.querySelectorAll('th,td')].map((c) => c.textContent?.trim() ?? '')
    // CA is the first row now the table is sorted by abbreviation.
    expect(cells[0]).toBe('CA')
    expect(cells[1]).toContain(en.states.measurement['apps-allowed'])
    expect(cells[2]).toBe(en.states.mandate['wbgt-required'])
    expect(cells[3]).toContain('CIF')
  })

  it('gives the table a name and the scroll container a keyboard route in', () => {
    const { container } = renderStates()
    const table = container.querySelector('table')!
    expect(table.getAttribute('aria-labelledby')).toBe('states-table-heading')
    expect(container.querySelector('#states-table-heading')?.textContent).toBe(en.states.tableLabel)
    const region = table.closest('[role="region"]')!
    expect(region, 'the scroll container is not a landmark').toBeTruthy()
    expect(region.getAttribute('tabindex'), 'not focusable, so not scrollable by keyboard').toBe('0')
    expect(region.getAttribute('aria-labelledby')).toBe('states-table-heading')
  })

  /**
   * "Conditional / preferred" carries the most nuance of any value in the
   * table and was the one value nothing defined. The legend also called the
   * unverified case "Not specified / unverified" while the cell said "Confirm
   * with association" — two names for one thing.
   */
  it('defines every value that actually appears in both judgement columns', () => {
    const { container } = renderStates()
    const legend = container.textContent ?? ''
    const usedMandates = new Set(STATE_DIRECTORY.map((r) => r.mandate))
    for (const mandate of usedMandates) {
      expect(legend, `mandate value ${mandate} is undefined in the legend`).toContain(
        en.states.mandate[mandate as keyof typeof en.states.mandate],
      )
    }
    for (const measurement of new Set(STATE_DIRECTORY.map((r) => r.measurement))) {
      expect(legend).toContain(en.states.measurement[measurement as keyof typeof en.states.measurement])
    }
  })

  it('names the unverified case the same way the cells do', () => {
    for (const dict of [en, es]) {
      expect(dict.states.legendUnverified.startsWith(dict.states.measurement.unverified)).toBe(true)
    }
  })

  it.skipIf(!existsSync(join(process.cwd(), 'dist')))(
    'prerenders the legend under a heading, not as loose bullets',
    () => {
      for (const lang of ['en', 'es']) {
        const html = readFileSync(join(process.cwd(), 'dist', lang, 'states.html'), 'utf-8')
        const dict = lang === 'en' ? en : es
        expect(html).toContain(`<h2>${dict.states.legendHeading}</h2>`)
        expect(html).toContain(dict.states.legendMandateConditional)
      }
    },
  )
})
