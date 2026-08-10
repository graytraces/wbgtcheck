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
import { POLICIES, CIF_CATEGORY_ROSTER_URL, type PolicyId } from '../data/policyOracle'
import { pageSEO, statePageKeyByPolicy, pickerLadderPageKeys } from '../seo'
import { STATE_GUIDES, AIR_GUIDES, GUIDE_SLUG_BY_ABBR } from '../data/guideRegistry'
import { defaultPolicyFor } from '../hooks/useWbgt'
import { STATE_DIRECTORY } from '../data/stateDirectory'
import { VALID_TOOLS, VALID_PAGES } from '../utils/routeValidation'
import { readFileSync } from 'node:fs'
import { requireFreshDist } from '../test/requireDist'
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
  it('links every registered guide in the prerendered hub too, in both locales', () => {
    requireFreshDist()
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
  /**
   * Derived, never listed. The previous version of this file kept two
   * hand-written arrays — six "pickerless" states and five with a policy —
   * and Tennessee was in NEITHER, so the bug that put a false notice on the
   * Tennessee home page passed both of them.
   */
  const pickable = (guide: (typeof STATE_GUIDES)[number]) =>
    pickerLadderPageKeys.has(guide.seoKey)
  const PICKERLESS = STATE_GUIDES.filter((g) => !pickable(g))
  const IN_PICKER = STATE_GUIDES.filter(pickable)

  it('splits every guide state into exactly one of the two groups', () => {
    expect(PICKERLESS.length + IN_PICKER.length).toBe(STATE_GUIDES.length)
    expect(PICKERLESS.map((g) => g.abbr).sort()).toEqual(['CA', 'FL', 'KY', 'NC', 'NY', 'VA'])
    // Tennessee belongs here: TSSAA is a picker option, it simply is not
    // auto-selected. That distinction is the whole bug.
    expect(IN_PICKER.map((g) => g.abbr).sort()).toEqual(['GA', 'IA', 'MA', 'SC', 'TN', 'TX'])
    expect(defaultPolicyFor('TN')).toBe('generic')
  })

  /** The condition Home.tsx renders the LINK on. */
  const wouldShowGuide = (abbr: string) => {
    const detected = STATE_GUIDES.find((g) => g.abbr === abbr)
    const pickerKey = statePageKeyByPolicy[defaultPolicyFor(abbr)]
    const pickerSlug = pickerKey ? pageSEO[pickerKey].path : null
    return !!detected && detected.slug !== pickerSlug
  }

  it('shows the guide link for every state the picker does not already link', () => {
    for (const { abbr } of PICKERLESS) {
      expect(wouldShowGuide(abbr), `${abbr} would get no guide link`).toBe(true)
    }
    // TN has a picker option but no auto-selection, so the link is still the
    // only route to its guide from a located home page.
    expect(wouldShowGuide('TN')).toBe(true)
  })

  it('does not duplicate the link where the picker already carries it', () => {
    for (const abbr of ['TX', 'GA', 'SC', 'IA', 'MA']) {
      expect(wouldShowGuide(abbr), `${abbr} would show the link twice`).toBe(false)
    }
  })

  it('says nothing at all for a state with no guide', () => {
    expect(STATE_GUIDES.find((g) => g.abbr === 'CO')).toBeUndefined()
    expect(wouldShowGuide('CO')).toBe(false)
  })
})

/**
 * The notice was one sentence for every state, and it was FALSE in four of the
 * six it appeared on:
 *
 *   NY  told a heat-index state its thresholds compared to the WBGT flag —
 *       and policyData.js says in capitals never to feed those numbers to
 *       classifyWbgt. Wrong in the permissive direction: WBGT 88 looked up on
 *       the NY ladder lands in "Watch" while the real heat index for those
 *       conditions is a no-outdoor-activity number.
 *   FL  told a reader thresholds exist that the statute does not contain —
 *       the word WBGT is not in it.
 *   VA  same, where /virginia says no honest page can name the number.
 *   KY  claimed "considerably stricter" when KHSAA's lower boundaries are a
 *       tenth or two MORE permissive than the fallback.
 *
 * So the wording is now chosen from the registry, and this checks the choice
 * against the oracle for every state that shows it — the old assertions were
 * `toBeTruthy()` and a /NATA/ match, neither of which asks whether the
 * sentence is true of the state it appears on.
 */
describe('the fallback notice is true of the state it appears on', () => {
  const noticeFor = (guide: (typeof STATE_GUIDES)[number], dict: typeof en) =>
    guide.ladder === 'heat-index'
      ? { heading: dict.home.stateScaleHeading, body: dict.home.stateScaleBody }
      : guide.ladder === 'no-state-numbers'
        ? { heading: dict.home.stateNoNumbersHeading, body: dict.home.stateNoNumbersBody }
        : { heading: dict.home.stateLadderHeading, body: dict.home.stateLadderBody }

  it('every guide state declares a ladder kind', () => {
    for (const guide of STATE_GUIDES) {
      expect(['wbgt-own', 'heat-index', 'no-state-numbers'], `${guide.abbr}`).toContain(guide.ladder)
      if (guide.ladder === 'no-state-numbers') {
        expect(['districts', 'association'], `${guide.abbr} setBy`).toContain(guide.numbersSetBy)
      }
    }
  })

  it('matches each state against what its own oracle says it publishes', () => {
    const byAbbr = Object.fromEntries(STATE_GUIDES.map((g) => [g.abbr, g]))
    // NYSPHSAA is a heat-index table, pinned as a ReferenceTable for that
    // reason; NC and CA publish WBGT numbers; FL and VA publish none.
    expect(byAbbr.NY.ladder).toBe('heat-index')
    expect(byAbbr.CA.ladder).toBe('wbgt-own')
    expect(byAbbr.NC.ladder).toBe('wbgt-own')
    expect(byAbbr.KY.ladder).toBe('wbgt-own')
    expect(byAbbr.FL.ladder).toBe('no-state-numbers')
    expect(byAbbr.VA.ladder).toBe('no-state-numbers')
  })

  it('never tells a heat-index state its numbers compare to the WBGT flag', () => {
    for (const dict of [en, es]) {
      const { body } = noticeFor(STATE_GUIDES.find((g) => g.abbr === 'NY')!, dict)
      expect(body).toMatch(/heat index|índice de calor/i)
      expect(body).toMatch(/cannot be converted|no se pueden convertir/i)
      // The claim that broke it: comparability at the same reading.
      expect(body).not.toMatch(/at the same reading|con la misma lectura/i)
      expect(body).not.toMatch(/stricter|estrictos/i)
    }
  })

  it('never claims thresholds for a state that publishes none', () => {
    for (const dict of [en, es]) {
      for (const abbr of ['FL', 'VA']) {
        const { body } = noticeFor(STATE_GUIDES.find((g) => g.abbr === abbr)!, dict)
        expect(body).toMatch(/does not publish|no publica/i)
        expect(body).not.toMatch(/publishes its own WBGT|publica sus propios umbrales/i)
      }
    }
  })

  it('makes no directional strictness claim, because Kentucky is more permissive', () => {
    for (const dict of [en, es]) {
      const { body } = noticeFor(STATE_GUIDES.find((g) => g.abbr === 'KY')!, dict)
      expect(body).not.toMatch(/stricter|estrict/i)
      expect(body).toMatch(/do not have to agree|no tienen por qué coincidir/i)
    }
  })

  it('gives each variant its own heading, not the ladder heading for all three', () => {
    for (const dict of [en, es]) {
      const headings = new Set(
        STATE_GUIDES.map((g) => noticeFor(g, dict).heading),
      )
      expect(headings.size).toBe(3)
      expect(noticeFor(STATE_GUIDES.find((g) => g.abbr === 'NY')!, dict).heading).not.toBe(
        dict.home.stateLadderHeading,
      )
    }
  })

  it('is present in both locales for every variant', () => {
    for (const dict of [en, es]) {
      for (const key of [
        'stateLadderHeading', 'stateLadderBody',
        'stateScaleHeading', 'stateScaleBody',
        'stateNoNumbersHeading', 'stateNoNumbersBody',
        'stateNumbersSetByDistricts', 'stateNumbersSetByAssociation',
      ] as const) {
        expect(dict.home[key], key).toBeTruthy()
      }
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

  /**
   * The Notes column is prose, it starts off-screen at 390px, and it set the
   * height of every row: Kentucky's was 375px tall while the columns a phone
   * reader could actually see used a fraction of it. Measured after the split,
   * data rows are ~57px and the note is readable full-width instead of
   * clipped. Desktop is untouched — 1802px table either way.
   */
  it('gives each state a phone-only full-width note row', () => {
    const { container } = renderStates()
    const rows = [...container.querySelectorAll('tbody tr')]
    expect(rows.length).toBe(STATE_DIRECTORY.length * 2)

    const dataRows = rows.filter((r) => r.querySelector('th[scope="row"]'))
    const noteRows = rows.filter((r) => !r.querySelector('th[scope="row"]'))
    expect(dataRows.length).toBe(STATE_DIRECTORY.length)
    expect(noteRows.length).toBe(STATE_DIRECTORY.length)

    for (const noteRow of noteRows) {
      expect(noteRow.className).toContain('sm:hidden')
      const cell = noteRow.querySelector('td')!
      expect(cell.getAttribute('colspan')).toBe('4')
    }
    // And the desktop copy is still in the data row, hidden on phones only.
    const desktopNote = dataRows[0].querySelector('td.hidden.sm\\:table-cell')
    expect(desktopNote, 'the desktop notes cell disappeared').toBeTruthy()
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
    // Scoped to the legend. Reading container.textContent meant the whole
    // PAGE, so a value merely appearing in a table cell satisfied the
    // assertion — the legend could define nothing and still pass.
    const heading = [...container.querySelectorAll('h2')].find(
      (h) => h.textContent === en.states.legendHeading,
    )!
    const legend = heading.closest('section')?.textContent ?? ''
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


  /**
   * React has a header-order guard; the prerender had none, so reverting just
   * its thead to the old order passed 442/442 while the built page printed
   * "Apps allowed" under *Governing body*. The prerendered table is what a
   * JS-off reader and a crawler get, so it needs its own.
   */
  it('prerenders the columns in the same order the component renders them', () => {
    requireFreshDist()
    for (const lang of ['en', 'es'] as const) {
      const dict = lang === 'en' ? en : es
      const html = readFileSync(join(process.cwd(), 'dist', lang, 'states.html'), 'utf-8')
      const head =
        `<th>${dict.states.colState}</th>` +
        `<th>${dict.states.colMeasurement}</th>` +
        `<th>${dict.states.colMandate}</th>` +
        `<th>${dict.states.colBody}</th>` +
        `<th>${dict.states.colNote}</th>`
      expect(html, `${lang} prerendered header order`).toContain(head)
      // And the cells have to follow the header, not merely exist: California
      // is measurement=apps-allowed, mandate=wbgt-required, body=CIF.
      const caRow =
        `<th scope="row">CA</th>` +
        `<td>${dict.states.measurement['apps-allowed']}</td>` +
        `<td>${dict.states.mandate['wbgt-required']}</td>` +
        `<td>CIF (AB 1653)</td>`
      expect(html, `${lang} prerendered cell order`).toContain(caRow)
    }
  })

  it('prerenders the legend under a heading, not as loose bullets', () => {
    requireFreshDist()
      for (const lang of ['en', 'es']) {
        const html = readFileSync(join(process.cwd(), 'dist', lang, 'states.html'), 'utf-8')
        const dict = lang === 'en' ? en : es
        expect(html).toContain(`<h2>${dict.states.legendHeading}</h2>`)
        expect(html).toContain(dict.states.legendMandateConditional)
      }
  })
})

/**
 * /california asks the reader to do exactly one thing — look their school up
 * in CIF's category roster — and the link to it sat 487px below the heading
 * that says to, behind an aside about bylaw numbering. The notice explaining
 * why California is not in the picker sat 79% of the way down, which is past
 * where anyone reads.
 */
describe('California puts the action before the commentary', () => {
  const renderCA = () => {
    i18n.changeLanguage('en')
    return render(
      <MemoryRouter initialEntries={['/en/california']}>
        <Routes>
          <Route path="/:lang/*" element={<California />} />
        </Routes>
      </MemoryRouter>,
    )
  }
  const precedes = (a: Element, b: Element) =>
    !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

  it('links the category roster before it explains anything', () => {
    const { container } = renderCA()
    const roster = container.querySelector(`a[href="${CIF_CATEGORY_ROSTER_URL}"]`)!
    const explanation = [...container.querySelectorAll('p')].find((el) =>
      el.textContent?.includes('splits the state'),
    )!
    expect(roster).toBeTruthy()
    expect(precedes(roster, explanation), 'the roster link is still buried').toBe(true)
  })

  it('says why it is not in the picker before the tables, not after them', () => {
    const { container } = renderCA()
    const notice = [...container.querySelectorAll('h2')].find((h) =>
      h.textContent?.includes(en.california.pickerExclusionHeading),
    )!
    const firstTable = container.querySelector('table')!
    expect(precedes(notice, firstTable), 'the picker notice is below the tables').toBe(true)
  })

  it('keeps the bylaw-numbering aside with the citation', () => {
    const { container } = renderCA()
    const source = [...container.querySelectorAll('h2')].find((h) =>
      h.textContent?.includes(en.california.sourceHeading),
    )!
    const aside = [...container.querySelectorAll('p')].find((el) =>
      el.textContent?.includes('disagrees with itself'),
    )!
    expect(aside, 'the corrected sentence is missing').toBeTruthy()
    expect(precedes(source, aside), 'the aside is not in the Source section').toBe(true)
  })

  it('does not say "CIF\'s numbering disagrees with CIF\'s"', () => {
    // The sentence shipped with its own subject as its object.
    expect(en.california.bylawNumberNote).not.toMatch(/disagrees with CIF's\./)
    expect(en.california.bylawNumberNote).toMatch(/disagrees with itself/)
    expect(es.california.bylawNumberNote).toMatch(/consigo misma/)
  })
})
