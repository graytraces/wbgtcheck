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
import ForecastOrDevice from '../pages/ForecastOrDevice'
import MarchingBand from '../pages/MarchingBand'
import { POLICIES, CIF_CATEGORY_ROSTER_URL, type PolicyId } from '../data/policyOracle'
import {
  VHSL_CANCEL_WBGT_F,
  FHSAA_NO_OUTDOOR_WBGT_F,
  NYSPHSAA_WBGT_BLACK_MIN_F,
} from '../data/policyData.js'
import { pageSEO, statePageKeyByPolicy, pickerLadderPageKeys } from '../seo'
import { STATE_GUIDES, AIR_GUIDES, TOPIC_GUIDES, GUIDE_SLUG_BY_ABBR } from '../data/guideRegistry'
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
 * The two cross-state guides have no nav entry — the scroller is already full
 * at five items — so /states is their ONLY route in, for a reader and for a
 * crawler alike. That makes them the exact shape of the bug the air guides
 * had: present in the router, absent from the hub, reachable by nobody.
 *
 * They are deliberately not in STATE_GUIDES (no abbr, no ladder, no directory
 * row), so none of the assertions above covers them.
 */
describe('the cross-state topic guides are reachable at all', () => {
  /**
   * Hub labels name the body whose document the page is built around — "Texas
   * UIL guide", "New York NYSPHSAA guide". Virginia's and Florida's still said
   * "heat law guide" from when this site believed neither state had an
   * association table; both pages now have one as their centrepiece (VHSL's
   * six levels, FHSAA §41.8), so the label pointed at the wrong document.
   */
  it('every guide label names the body its page is built around', () => {
    for (const [key, body] of [
      ['virginiaLink', 'VHSL'],
      ['floridaLink', 'FHSAA'],
      ['newYorkLink', 'NYSPHSAA'],
    ] as const) {
      for (const [lang, dict] of [['en', en], ['es', es]] as const) {
        expect(dict.states[key], `${lang} ${key}`).toContain(body)
      }
    }
  })

  it('every topic guide is worker-valid and registered for SEO', () => {
    expect(TOPIC_GUIDES.length).toBe(2)
    for (const { slug, seoKey } of TOPIC_GUIDES) {
      // A slug in the router but not here is a hard 404 for every request.
      expect(VALID_TOOLS.has(slug), `${slug} would 404`).toBe(true)
      expect(pageSEO[seoKey], `${seoKey} missing from seo.ts`).toBeTruthy()
      expect(pageSEO[seoKey].path).toBe(slug)
    }
    // …and they are not smuggled into the state/air lists, whose joins to
    // STATE_DIRECTORY and to the detected location would be meaningless.
    const stateSlugs = new Set([...STATE_GUIDES, ...AIR_GUIDES].map((g) => g.slug))
    for (const { slug } of TOPIC_GUIDES) expect(stateSlugs.has(slug)).toBe(false)
  })

  it('links every topic guide from the states hub', () => {
    i18n.changeLanguage('en')
    const { container } = render(
      <MemoryRouter initialEntries={['/en/states']}>
        <Routes>
          <Route path="/:lang/*" element={<States />} />
        </Routes>
      </MemoryRouter>,
    )
    for (const { slug } of TOPIC_GUIDES) {
      expect(
        container.querySelector(`a[href="/en/${slug}"]`),
        `${slug} is not linked from the hub`,
      ).toBeTruthy()
    }
  })

  /** The reader whose JS failed gets the prerendered hub and nothing else. */
  it('links every topic guide in the prerendered hub too, in both locales', () => {
    requireFreshDist()
    for (const lang of ['en', 'es']) {
      const html = readFileSync(join(process.cwd(), 'dist', lang, 'states.html'), 'utf-8')
      for (const { slug } of TOPIC_GUIDES) {
        expect(html, `${lang}/states.html does not link ${slug}`).toContain(`/${lang}/${slug}`)
      }
    }
  })

  /**
   * Reachability runs both ways. Each of these pages carried exactly one route
   * into the tool, 8.8 and 8.3 screens down — past twelve table rows and five
   * prose sections. A reader who arrives from a search for their state's rule
   * has no reason to scroll a policy page to its end to find the forecast the
   * page is about.
   */
  it('each topic guide offers a route into the tool before its first table', () => {
    for (const [name, Page] of [
      ['ForecastOrDevice', ForecastOrDevice],
      ['MarchingBand', MarchingBand],
    ] as const) {
      const { container, unmount } = render(
        <MemoryRouter initialEntries={['/en/x']}>
          <Routes>
            <Route path="/:lang/*" element={<Page />} />
          </Routes>
        </MemoryRouter>,
      )
      const toTool = container.querySelectorAll('a[href="/en"]')
      // Both: the new one on the first screen and the button at the bottom.
      expect(toTool.length, `${name} routes into the tool`).toBeGreaterThanOrEqual(2)
      const table = container.querySelector('table')
      expect(table, `${name} has a table`).toBeTruthy()
      expect(
        toTool[0].compareDocumentPosition(table!) & Node.DOCUMENT_POSITION_FOLLOWING,
        `${name}'s first route into the tool is below its table`,
      ).toBeTruthy()
      unmount()
    }
  })
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
    // Florida left this group when FHSAA §41.8 entered the picker. The five
    // that remain each need a question this tool does not ask — CA and NY a
    // regional category, KY and NC a different band family, VA six levels.
    // Florida was the one that needed none: five bands onto five flags.
    expect(PICKERLESS.map((g) => g.abbr).sort()).toEqual(['CA', 'KY', 'NC', 'NY', 'VA'])
    // Tennessee belongs here: TSSAA is a picker option, it simply is not
    // auto-selected. That distinction is the whole bug.
    expect(IN_PICKER.map((g) => g.abbr).sort()).toEqual(['FL', 'GA', 'IA', 'MA', 'SC', 'TN', 'TX'])
    expect(defaultPolicyFor('TN')).toBe('generic')
    // …and Florida, unlike Tennessee, IS auto-selected.
    expect(defaultPolicyFor('FL')).toBe('fhsaa')
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
    for (const abbr of ['TX', 'GA', 'SC', 'IA', 'MA', 'FL']) {
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

  /**
   * Round 5 overturned three of these. All three were the same mistake in
   * different clothes: a document we could not read was recorded as a document
   * that does not exist.
   *
   *   NY  said 'heat-index'. NYSPHSAA's page 1 is the WeatherBug heat-index
   *       procedure, but page 2 is a three-category WBGT chart — an embedded
   *       image, which is why a text extract missed it. Its own first bullet
   *       offers WBGT as the alternative to heat index, and the suspension
   *       trigger names both scales at once.
   *   FL  said 'no-state-numbers'. FHSAA Policy 41 §41.8 is a five-band
   *       practice ladder. fhsaa.com serves an HTML shell for its own .pdf
   *       link — the same trap policyData.js already documents for CIF — so
   *       the file read as unopenable.
   *   VA  said 'no-state-numbers'. The statute really does fix no thresholds,
   *       but it requires division policy to be consistent with the VHSL's,
   *       and VHSL publishes a statewide six-level table. The pointer in the
   *       statute was never followed.
   *
   * Each is now pinned to the constant that only exists because someone read
   * the document, so deleting the source deletes the assertion with it.
   */
  it('matches each state against what its own oracle says it publishes', () => {
    const byAbbr = Object.fromEntries(STATE_GUIDES.map((g) => [g.abbr, g]))
    for (const abbr of ['NY', 'CA', 'NC', 'KY', 'FL', 'VA']) {
      expect(byAbbr[abbr].ladder, abbr).toBe('wbgt-own')
    }
    expect(VHSL_CANCEL_WBGT_F).toBe(90.0)
    expect(FHSAA_NO_OUTDOOR_WBGT_F).toBe(92.1)
    expect(NYSPHSAA_WBGT_BLACK_MIN_F.cat1).toBe(86.2)
  })

  /**
   * The reason this is worth a test of its own: every one of the three false
   * classifications sent the reader a sentence saying the number they wanted
   * was unobtainable. Two of them said so about a number that decides whether
   * practice happens at all.
   */
  it('no state is told its thresholds are unknowable', () => {
    for (const dict of [en, es]) {
      for (const guide of STATE_GUIDES) {
        const { body } = noticeFor(guide, dict)
        expect(body, `${guide.abbr}`).not.toMatch(/no page can tell you|ninguna página puede decirte/i)
        expect(body, `${guide.abbr}`).not.toMatch(/does not publish|no publica/i)
      }
    }
  })

  /**
   * The two other variants keep their strings — a future state can still be
   * heat-index-only or genuinely silent — but nothing may claim a state IS one
   * of those without a source constant to back it, which is what let NY and
   * FL/VA sit wrong for a day.
   */
  it('the unused variants stay distinct and stay unused', () => {
    for (const dict of [en, es]) {
      expect(dict.home.stateScaleBody).toMatch(/heat index|índice de calor/i)
      expect(dict.home.stateNoNumbersBody).toMatch(/does not publish|no publica/i)
      expect(dict.home.stateScaleHeading).not.toBe(dict.home.stateLadderHeading)
      expect(dict.home.stateNoNumbersHeading).not.toBe(dict.home.stateLadderHeading)
    }
    expect(STATE_GUIDES.filter((g) => g.ladder !== 'wbgt-own')).toEqual([])
  })

  it('makes no directional strictness claim, because Kentucky is more permissive', () => {
    for (const dict of [en, es]) {
      const { body } = noticeFor(STATE_GUIDES.find((g) => g.abbr === 'KY')!, dict)
      expect(body).not.toMatch(/stricter|estrict/i)
      expect(body).toMatch(/do not have to agree|no tienen por qué coincidir/i)
    }
  })

  it('the three variant headings are three different sentences', () => {
    for (const dict of [en, es]) {
      const headings = new Set([
        dict.home.stateLadderHeading,
        dict.home.stateScaleHeading,
        dict.home.stateNoNumbersHeading,
      ])
      expect(headings.size).toBe(3)
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

  /**
   * Two things the note row was still getting wrong after it moved.
   *
   * Width: it laid out against the TABLE's columns rather than the scroll
   * container, so measured at 390px the region was 358 wide against a 478px
   * cell and ~25% of every note sat off-screen — "covering practice AND
   * comp…", "outdoor activity st…". The wrapper now takes its width from the
   * page column and pins to the container's left edge; the geometry itself is
   * asserted in scripts/checks/no-hscroll-sweep.mjs, because jsdom has no
   * layout to assert it against.
   *
   * Association: with no row header of its own, a screen reader in table mode
   * read a paragraph of policy with nothing saying which state it belonged to.
   * An sr-only `<th scope="row">` is the obvious fix and is
   * position:absolute — Chromium still assigns it the first column, which
   * measured 58px of the note's width straight back off. `headers` points at
   * the row header that already exists and costs nothing.
   */
  it('ties each note to its state and bounds it by the scroll container', () => {
    const { container } = renderStates()
    const rows = [...container.querySelectorAll('tbody tr')]
    const noteRows = rows.filter((r) => !r.querySelector('th[scope="row"]'))

    for (const [i, noteRow] of noteRows.entries()) {
      const abbr = STATE_DIRECTORY[i].abbr
      const cell = noteRow.querySelector('td')!
      // The header it names must exist, and must be the one carrying the state.
      const headerId = cell.getAttribute('headers')
      expect(headerId, `${abbr} note has no row header`).toBeTruthy()
      const header = container.querySelector(`#${headerId}`)!
      expect(header, `${abbr} note points at a header that is not there`).toBeTruthy()
      expect(header.getAttribute('scope')).toBe('row')
      expect(header.textContent).toBe(abbr)

      // The note's width comes from the viewport column, not from the cell.
      const wrapper = cell.querySelector('[data-phone-note]')!
      expect(wrapper, `${abbr} note lost its wrapper`).toBeTruthy()
      expect(wrapper.className).toContain('w-[calc(100vw-2rem)]')
      expect(wrapper.className).toContain('sticky')
    }
  })

  /**
   * The hint said "use the arrow keys to reach the remaining columns" to
   * everyone, including the touch reader who has none. It is the keyboard's
   * only route into a focusable scroll container, so it stays — for pointers
   * that can press keys.
   */
  it('offers the arrow-key hint only where there are arrow keys', () => {
    const { container } = renderStates()
    const hint = [...container.querySelectorAll('p')].find(
      (p) => p.textContent === en.states.tableScrollHint,
    )!
    expect(hint, 'the keyboard hint is gone entirely').toBeTruthy()
    expect(hint.className).toContain('[@media(pointer:fine)]:block')
    expect(hint.className).toContain('hidden')
    // Still announced, not merely visible — it is advice for a screen reader
    // driving a scroll container by keyboard.
    expect(hint.className).toContain('sr-only')
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
