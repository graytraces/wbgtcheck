import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { clearPrerenderedCopy } from '../utils/prerenderCleanup'
import { requireFreshDist } from '../test/requireDist'

/**
 * Structured data must survive hydration.
 *
 * scripts/prerender.mjs marks its JSON-LD with the same `data-prerender`
 * attribute it puts on prose, and App's mount effect swept that attribute
 * unqualified — so every Article and BreadcrumbList on the site was deleted
 * the moment React mounted. Measured before the fix: 1-2 blocks in the served
 * HTML, 0 in the post-JS DOM, on every page. Google reads structured data from
 * the rendered DOM, so those schemas had been invalid since launch. Canonical
 * and description survived only because <SEO> re-emits them.
 *
 * These tests used to render a LOCAL component with the effect pasted into it,
 * which meant they proved a copy of the code correct and never touched the
 * app. Deleting `:not(script)` from App.tsx failed exactly one of them — the
 * readFileSync guard. The sweep now lives in its own module and these call it,
 * so the behavioural assertions run the code that ships.
 *
 * scripts/checks/boot-failure-check.mjs proves the same thing in a real
 * browser across nine routes; this is the cheap version that runs in every
 * `npm test`.
 */

beforeEach(() => {
  document.head.innerHTML = `
    <script type="application/ld+json" data-prerender="true">{"@type":"Article"}</script>
    <link rel="canonical" data-prerender="true" href="https://wbgtcheck.com/en/texas" />
    <meta name="description" data-prerender="true" content="desc" />
  `
  document.body.innerHTML = '<div data-prerender="true"><h1>prerendered prose</h1></div>'
})

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('prerender cleanup', () => {
  it('keeps JSON-LD', () => {
    clearPrerenderedCopy()
    const ld = document.querySelectorAll('script[type="application/ld+json"]')
    expect(ld).toHaveLength(1)
    expect(JSON.parse(ld[0].textContent!)['@type']).toBe('Article')
  })

  it('still wipes the prerendered prose it exists to clear', () => {
    clearPrerenderedCopy()
    expect(document.querySelectorAll('[data-prerender]:not(script)')).toHaveLength(0)
    expect(document.body.textContent).not.toContain('prerendered prose')
  })

  it('removes the non-script head tags the SEO component re-emits', () => {
    // canonical and description are re-published by <SEO>, so removing them is
    // correct — the bug was that JSON-LD had no such re-emitter.
    clearPrerenderedCopy()
    expect(document.querySelector('link[rel=canonical][data-prerender]')).toBeNull()
    expect(document.querySelector('meta[name=description][data-prerender]')).toBeNull()
  })

  it('is what App actually calls on mount', () => {
    // The behavioural tests above are only worth anything if the app runs this
    // function rather than its own copy of the selector.
    const src = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8')
    expect(src).toContain('clearPrerenderedCopy()')
    expect(src).toContain("from './utils/prerenderCleanup'")
  })
})

/**
 * The failure mode that outlived the fix: a SECOND sweep, in some other file,
 * written without `:not(script)`. It would delete the schemas again and no
 * behavioural test would notice, because the module under test would still be
 * correct. Nothing here has a CI to catch it either.
 */
describe('no unqualified data-prerender sweep anywhere in src', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? walk(join(dir, e.name))
        : /\.(ts|tsx|js|jsx)$/.test(e.name)
          ? [join(dir, e.name)]
          : [],
    )

  it('every data-prerender selector excludes scripts', () => {
    // Production source only: the test files below legitimately talk about the
    // bare attribute, and so do comments. Only real selector CALLS matter.
    //
    // The attribute may appear ANYWHERE in the selector, not just at the
    // start. The first version of this scan anchored on a literal beginning
    // `[data-prerender]`, and every natural way to write the second sweep
    // slipped past it — including `[data-prerender="true"]`, which is the form
    // the prerender actually emits.
    const files = walk(join(process.cwd(), 'src')).filter((f) => !f.includes('__tests__'))
    expect(files.length).toBeGreaterThan(40)
    const offenders: string[] = []
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      for (const match of src.matchAll(
        /querySelector(?:All)?\(\s*(['"`])([^'"`]*\[data-prerender[^\]]*\][^'"`]*)\1/g,
      )) {
        if (!match[2].includes(':not(script)')) {
          offenders.push(`${file.replace(process.cwd(), '.')}: ${match[2]}`)
        }
      }
    }
    expect(offenders, 'an unqualified sweep would delete every schema again').toEqual([])
  })
})

/**
 * What the schemas SAY, now that they survive to be read.
 *
 * Three defects, all of them in the built output rather than in any component:
 *
 *   1. name/headline was the <title>, so every schema on the site published
 *      the " | WBGT Check" SERP disambiguator as part of the page's name.
 *   2. the same title disagreed with the page's visible H1 — the schema for
 *      /marching-band-heat-rules was headlined "Marching Band Heat Rules by
 *      State" over an H1 reading "Does your state's heat rule cover marching
 *      band?". That is the sibling repos' H1-desync class
 *      (bug_script/scan_h1_desync.mjs) reached through the schema instead of
 *      through hydration, and Google reads a headline/H1 disagreement as a
 *      quality signal.
 *   3. dateModified was the build date on all 22 pages, restamped by every
 *      deploy whether or not anything had changed.
 *
 * The fix for 1 and 2 is one thing: prerender reads the H1 back out of the
 * body it just built. So the assertion is the same shape — for every built
 * page, in both locales, the schema's name is the file's own <h1>.
 */
describe('the schemas name the page the reader is looking at', () => {
  const dist = () => requireFreshDist()

  const htmlFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? htmlFiles(join(dir, entry.name))
        : entry.name.endsWith('.html')
          ? [join(dir, entry.name)]
          : [],
    )

  const blocksIn = (html: string): Record<string, unknown>[] =>
    [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(
      (m) => JSON.parse(m[1]) as Record<string, unknown>,
    )

  const h1In = (html: string): string =>
    html
      .match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/)![1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .trim()

  let pages: { rel: string; html: string }[] = []

  beforeEach(() => {
    if (pages.length > 0) return
    const root = dist()
    pages = htmlFiles(root).map((file) => ({
      rel: file.replace(`${root}/`, ''),
      html: readFileSync(file, 'utf-8'),
    }))
  })

  it('every page carries at least one schema (22 pages x 2 locales)', () => {
    // Guard the guard: if the walk found nothing, every loop below is vacuous.
    expect(pages.length).toBeGreaterThanOrEqual(40)
    for (const page of pages) {
      expect(blocksIn(page.html).length, `${page.rel} has no JSON-LD`).toBeGreaterThan(0)
    }
  })

  it('name/headline is the page’s visible H1', () => {
    for (const page of pages) {
      const h1 = h1In(page.html)
      for (const block of blocksIn(page.html)) {
        const named = (block.name ?? block.headline) as string | undefined
        if (named === undefined) continue // BreadcrumbList, checked below
        expect(named, `${page.rel} ${block['@type']} name/headline vs H1`).toBe(h1)
      }
    }
  })

  it('no schema anywhere carries the brand suffix', () => {
    // " | WBGT Check" is a disambiguator for a search result page. In a name,
    // a headline or a breadcrumb crumb it is noise the reader never sees on
    // the page itself.
    for (const page of pages) {
      for (const block of blocksIn(page.html)) {
        expect(JSON.stringify(block), `${page.rel} ${block['@type']}`).not.toContain(
          '| WBGT Check',
        )
      }
    }
  })

  it('the breadcrumb is site → this page, both named as displayed', () => {
    const crumbed = pages.filter((page) =>
      blocksIn(page.html).some((b) => b['@type'] === 'BreadcrumbList'),
    )
    // The two home pages have no breadcrumb; every other page does.
    expect(crumbed.length).toBeGreaterThanOrEqual(40)
    for (const page of crumbed) {
      const crumb = blocksIn(page.html).find((b) => b['@type'] === 'BreadcrumbList')!
      const items = crumb.itemListElement as { position: number; name: string }[]
      expect(items, `${page.rel} breadcrumb depth`).toHaveLength(2)
      expect(items[0].name, `${page.rel} crumb 1`).toBe('WBGT Check')
      expect(items[1].name, `${page.rel} crumb 2`).toBe(h1In(page.html))
    }
  })

  it('no schema publishes a dateModified', () => {
    // It was `today` on all 22 pages and moved on every rebuild. Nothing in
    // this repo knows when an individual page last changed — every page's
    // prose is assembled from two shared files — so the honest answer is to
    // publish no date rather than a date that is the same everywhere and
    // always wrong.
    for (const page of pages) {
      for (const block of blocksIn(page.html)) {
        expect(block, `${page.rel} ${block['@type']}`).not.toHaveProperty('dateModified')
        expect(block, `${page.rel} ${block['@type']}`).not.toHaveProperty('datePublished')
      }
    }
  })
})

/**
 * Sitemap <lastmod> had the same defect as dateModified and a worse
 * consequence: Google drops lastmod as a crawl hint entirely once a site's
 * values stop being credible, and "all 44 URLs changed today, again" is what
 * incredible looks like. A retried deploy or a cache purge moved every date.
 */
describe('sitemap lastmod is a commit date, not a clock reading', () => {
  it('every URL carries the same date, and it is HEAD’s commit date', () => {
    const xml = readFileSync(join(requireFreshDist(), 'sitemap.xml'), 'utf-8')
    const dates = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1])
    expect(dates.length).toBeGreaterThanOrEqual(40)
    expect([...new Set(dates)]).toHaveLength(1)
    const head = execFileSync('git', ['log', '-1', '--format=%cs'], {
      cwd: process.cwd(),
      encoding: 'utf-8',
    }).trim()
    expect(dates[0]).toBe(head)
  })

  it('the generator reads git rather than the wall clock', () => {
    // The assertion above cannot tell the two apart on a day when the build
    // and the last commit happen to fall together — which is every day during
    // active work, and so every day this would be run. The source scan is what
    // actually holds the line, in the same spirit as the selector scan above.
    const src = readFileSync(join(process.cwd(), 'scripts/prerender.mjs'), 'utf-8')
    expect(src).toContain("execFileSync('git', ['log', '-1', '--format=%cs']")
    expect(src).toContain('<lastmod>${SITE_LASTMOD}</lastmod>')
    // `new Date()` may appear exactly once in CODE: the no-git fallback
    // inside siteLastmod(). A second one is someone reaching for the clock
    // again. Comments are stripped first — the block comment above
    // siteLastmod names the call it replaced, and a scan that counted prose
    // would fail on its own explanation.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect((code.match(/new Date\(\)/g) ?? []).length).toBe(1)
  })
})
