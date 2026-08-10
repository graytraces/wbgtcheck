import { describe, it, expect } from 'vitest'
import { pageSEO } from '../seo'
import { VALID_TOOLS, VALID_PAGES } from '../utils/routeValidation'
import { STATE_GUIDES } from '../data/guideRegistry'
import { MEASUREMENT_STANCES, requiresOnSiteReading } from '../data/policyOracle'
import en from '../locales/en.json'
import es from '../locales/es.json'

/**
 * Route/SEO chain sync: seo.ts registry ↔ routeValidation ↔ locale seo.*
 * namespaces. A slug missing from VALID_TOOLS 404s at the worker; a key
 * missing from a locale breaks prerender.
 */

describe('SEO chain registration', () => {
  const registeredPaths = Object.values(pageSEO)
    .map((p) => p.path)
    .filter((p) => p !== '')

  it('every registered path is worker-valid (VALID_TOOLS ∪ VALID_PAGES)', () => {
    for (const path of registeredPaths) {
      expect(
        VALID_TOOLS.has(path) || VALID_PAGES.has(path),
        `${path} missing from routeValidation`,
      ).toBe(true)
    }
  })

  it('every worker-valid slug has a pageSEO entry (no orphan routes)', () => {
    for (const slug of [...VALID_TOOLS, ...VALID_PAGES]) {
      expect(registeredPaths, `${slug} missing from seo.ts`).toContain(slug)
    }
  })

  it('every pageSEO key has seo.* title+description in both locales', () => {
    const enSeo = en.seo as Record<string, { title?: string; description?: string }>
    const esSeo = es.seo as Record<string, { title?: string; description?: string }>
    for (const { key } of Object.values(pageSEO)) {
      expect(enSeo[key]?.title, `en seo.${key}.title`).toBeTruthy()
      expect(enSeo[key]?.description, `en seo.${key}.description`).toBeTruthy()
      expect(esSeo[key]?.title, `es seo.${key}.title`).toBeTruthy()
      expect(esSeo[key]?.description, `es seo.${key}.description`).toBeTruthy()
    }
  })

  it('no aggregateRating anywhere in the SEO layer (structured-data policy)', () => {
    const serialized = JSON.stringify({ pageSEO, en, es })
    expect(serialized).not.toContain('aggregateRating')
    expect(serialized).not.toContain('ratingValue')
    expect(serialized).not.toContain('reviewCount')
  })

  it('NC and WA seo strings never regain the superseded-edition claims', () => {
    // These phrases described documents the 2026-08 rebuilds replaced: NC's
    // weather-station clause and colour code died with the 2015 chart; WA's
    // activity-type axis ("recess, P.E. …") and the 5-3-1 visibility check
    // belong to other documents. Body copy may still name them historically
    // ("earlier editions allowed…") — the seo blocks may not assert them.
    // Scoped to seo: air.activityExample.short legitimately says "recess".
    const banned = [
      /weather station/i,
      /colou?r code/i,
      /recess/i,
      /5-3-1/,
      /estaci[oó]n meteorol[oó]gica/i,
      /c[oó]digo de color/i,
      /recreo/i,
    ]
    const blocks: Array<[string, unknown]> = [
      ['en seo.northCarolina', en.seo.northCarolina],
      ['en seo.washingtonAir', en.seo.washingtonAir],
      ['es seo.northCarolina', es.seo.northCarolina],
      ['es seo.washingtonAir', es.seo.washingtonAir],
    ]
    for (const [label, block] of blocks) {
      const text = JSON.stringify(block)
      for (const re of banned) {
        expect(re.test(text), `${label} matches ${re}`).toBe(false)
      }
    }
  })
})

/**
 * The seo block is the page as Google prints it, and it is the last surface a
 * correction reaches.
 *
 * 09c3145 overturned Virginia's and New York's ladder classifications — VHSL
 * publishes a statewide six-level WBGT table, and NYSPHSAA's document carries
 * a WBGT chart alongside its heat-index procedure — and rewrote the registry,
 * the guide pages and the home-page notice. It did not touch seo.*, so the
 * search result for /virginia still read "Districts Set the WBGT Levels" and
 * the one for /new-york still read "(Not WBGT)". Two claims the site had
 * spent the day retracting, printed where most readers meet the page.
 *
 * Derived from the registry rather than listed by hand: whatever the registry
 * says a state publishes, its seo block may not deny.
 */
describe('the seo layer agrees with the registry about what a state publishes', () => {
  // Phrases that assert a state has no WBGT ladder of its own, in both
  // languages. Each one shipped in a title or description of a state that
  // publishes one.
  const DENIALS = [
    /\(not WBGT\)/i,
    /\(no WBGT\)/i,
    /not WBGT,/i,
    /no el WBGT,/i,
    /districts set/i,
    /distritos fijan/i,
    /set locally, not statewide/i,
    /umbrales son locales/i,
    /publishes no/i,
    /publica ninguno/i,
  ]

  it('no state with its own ladder is advertised as having none', () => {
    const own = STATE_GUIDES.filter((g) => g.ladder === 'wbgt-own')
    // Guard the guard: an empty list would make every assertion below vacuous.
    expect(own.length).toBeGreaterThanOrEqual(12)
    for (const guide of own) {
      for (const [lang, dict] of [['en', en], ['es', es]] as const) {
        const block = JSON.stringify(
          (dict.seo as Record<string, unknown>)[guide.seoKey] ?? {},
        )
        for (const re of DENIALS) {
          expect(re.test(block), `${lang} seo.${guide.seoKey} matches ${re}`).toBe(false)
        }
      }
    }
  })

  it('names the document each of the two overturned states actually publishes', () => {
    // VHSL's table and NYSPHSAA's chart are the documents the correction was
    // about, so the search result has to name them.
    expect(en.seo.virginia.title).toMatch(/VHSL/)
    expect(es.seo.virginia.title).toMatch(/VHSL/)
    expect(en.seo.virginia.description).toMatch(/statewide WBGT/i)
    expect(es.seo.virginia.description).toMatch(/WBGT.*estatal/i)
    for (const dict of [en, es]) {
      // New York's is the both-scales claim: naming only one of them is how
      // this went wrong in the first place.
      expect(dict.seo.newYork.title).toMatch(/WBGT/)
      expect(dict.seo.newYork.title).toMatch(/heat index|índice de calor/i)
      expect(dict.seo.newYork.description).toMatch(/both scales|ambas escalas/i)
    }
  })
})

/**
 * Google truncates a title around 60 characters, and what it cuts is the END —
 * which is where the brand suffix lives and, on a title that ran long, where
 * the distinguishing term ended up too. Twenty-seven of the forty-four titles
 * on this site were over: eleven English and sixteen Spanish, the worst at 81.
 * "Reglas WBGT de la SCHSL de Carolina del Sur: umbrales e instrumento" was
 * printed to a Spanish reader as "…de Carolina del Sur: umbrales…", losing the
 * one word (instrumento) that says what the page decides.
 *
 * Spanish is the binding constraint, not English: the same meaning runs 8-25%
 * longer, so eleven Spanish titles were over while their English twins fit.
 * Both locales are held to the same 60, which is why several Spanish titles
 * now lead with the state name and a colon rather than a translated noun
 * phrase — that construction spends the fewest characters before the term the
 * reader is scanning for.
 */
describe('meta title length', () => {
  const MAX = 60

  for (const [lang, dict] of [['en', en], ['es', es]] as const) {
    it(`every ${lang} seo title fits in ${MAX} characters`, () => {
      const seo = dict.seo as Record<string, { title?: string }>
      const over = Object.entries(seo)
        .filter(([, v]) => (v?.title?.length ?? 0) > MAX)
        .map(([k, v]) => `${k} (${v.title!.length})`)
      expect(over, `${lang} titles over ${MAX}`).toEqual([])
      // Guard the guard: an empty seo namespace would pass the filter above.
      expect(Object.keys(seo).length).toBeGreaterThan(15)
    })
  }

  it('the distinguishing term is ahead of the brand, not behind it', () => {
    // A title is only short enough to survive if the brand is LAST. Any title
    // that opens with the site name has spent its first 13 characters saying
    // what every other result on the page also says.
    for (const [lang, dict] of [['en', en], ['es', es]] as const) {
      const seo = dict.seo as Record<string, { title?: string }>
      for (const [key, value] of Object.entries(seo)) {
        const title = value.title!
        expect(title.startsWith('WBGT Check'), `${lang} seo.${key} leads with the brand`).toBe(
          false,
        )
        expect(title.endsWith(' | WBGT Check'), `${lang} seo.${key} brand suffix`).toBe(true)
      }
    }
  })
})

/**
 * A title is the one surface with no test for truth: nothing renders it beside
 * the page, so a claim about a state's rules can sit there contradicting the
 * page's own body indefinitely. Two did — /virginia and /new-york, see the
 * registry guard above.
 *
 * This is the same guard for the OTHER claim a title on this site can make:
 * that the state will not accept a forecast. It is derived from the oracle's
 * stance rather than from a list, so it covers the next title that says it.
 */
describe('a title that says "device" agrees with the oracle stance', () => {
  const SEO_KEY_BY_ABBR: Record<string, string> = {
    CA: 'california',
    FL: 'florida',
    GA: 'georgia',
    IA: 'iowa',
    KY: 'kentucky',
    MA: 'massachusetts',
    NC: 'northCarolina',
    NY: 'newYork',
    SC: 'southCarolina',
    TN: 'tennessee',
    TX: 'texas',
    VA: 'virginia',
  }

  it('no state that accepts a remote reading is titled device-only', () => {
    const permissive = MEASUREMENT_STANCES.filter(
      (row) => !requiresOnSiteReading(row.subject),
    )
    // Guard the guard: if every state were device-required this would be vacuous.
    expect(permissive.length).toBeGreaterThanOrEqual(2)
    for (const row of permissive) {
      const key = SEO_KEY_BY_ABBR[row.abbr]
      expect(key, `no seo key mapped for ${row.abbr}`).toBeTruthy()
      for (const [lang, dict] of [['en', en], ['es', es]] as const) {
        const title = (dict.seo as Record<string, { title?: string }>)[key].title!
        expect(
          /device only|device required|solo instrumento|instrumento obligatorio/i.test(title),
          `${lang} seo.${key} claims device-only but ${row.abbr} accepts a remote reading`,
        ).toBe(false)
      }
    }
  })

  it('a device-only title belongs to a state the oracle says requires one', () => {
    const stanceByAbbr = new Map(MEASUREMENT_STANCES.map((r) => [r.abbr, r.subject]))
    let claims = 0
    for (const [abbr, key] of Object.entries(SEO_KEY_BY_ABBR)) {
      for (const dict of [en, es]) {
        const title = (dict.seo as Record<string, { title?: string }>)[key].title!
        if (!/device only|device required|solo instrumento|instrumento obligatorio/i.test(title)) {
          continue
        }
        claims++
        expect(
          requiresOnSiteReading(stanceByAbbr.get(abbr)!),
          `seo.${key} says device-only, oracle disagrees`,
        ).toBe(true)
      }
    }
    // At least one title makes the claim, so the assertion above ran.
    expect(claims).toBeGreaterThan(0)
  })
})

/**
 * Google truncates meta descriptions around 160 characters, and the cut lands
 * mid-sentence — four English descriptions and eleven Spanish ones were over,
 * the worst at 221. Length is the only property of a description a test can
 * check, so it is the one that gets checked.
 */
describe('meta description length', () => {
  const MAX = 160
  for (const [lang, dict] of [['en', en], ['es', es]] as const) {
    it(`every ${lang} seo description fits in ${MAX} characters`, () => {
      const seo = dict.seo as Record<string, { description?: string }>
      const over = Object.entries(seo)
        .filter(([, v]) => (v?.description?.length ?? 0) > MAX)
        .map(([k, v]) => `${k} (${v.description!.length})`)
      expect(over, `${lang} descriptions over ${MAX}`).toEqual([])
      expect(Object.keys(seo).length).toBeGreaterThan(15)
    })
  }
})
