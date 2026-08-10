import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { requireFreshDist } from '../test/requireDist'

/**
 * The check scripts serve the real dist/, which carries the real measurement
 * ID, so an unblocked page load is a real page_view in the production GA4
 * property. The hscroll sweep shipped without the block and put an estimated
 * few hundred to a thousand hits into the property ahead of a September
 * reading — with nothing anywhere to filter operator traffic back out.
 *
 * A convention would not have caught that: three of the four scripts already
 * blocked GA, and the fourth simply never got the line. So the rule is a
 * test instead. Anything under scripts/checks that opens a browser must route
 * analytics to abort, and an exemption has to be claimed here by name with a
 * reason, not by omission.
 */

const CHECKS_DIR = join(process.cwd(), 'scripts', 'checks')

/**
 * Serves only its own canvas harness — it never loads app HTML, so there is
 * no tag on the page to block. Verified by the assertion below, not taken on
 * trust: if it ever starts serving dist/ the exemption fails with it.
 */
const EXEMPT = new Map([['share-card-engine-check.mjs', 'serves its own canvas harness, never app HTML']])

const scripts = readdirSync(CHECKS_DIR).filter((f) => f.endsWith('.mjs'))

describe('browser checks must not send analytics', () => {
  it('finds the check scripts (guard against an empty sweep passing)', () => {
    expect(scripts.length).toBeGreaterThanOrEqual(4)
    expect(scripts).toContain('no-hscroll-sweep.mjs')
  })

  for (const file of scripts) {
    if (file === 'blockAnalytics.mjs') continue

    it(`${file} blocks analytics on every browser it opens`, () => {
      const source = readFileSync(join(CHECKS_DIR, file), 'utf-8')
      const opensBrowser = /browser\.new(Context|Page)\(/.test(source)
      if (!opensBrowser) return

      if (EXEMPT.has(file)) {
        // An exemption is only valid while the claim behind it holds. DIST is
        // the served-root constant every other check uses; the exempt script
        // must not serve from it. (REPO_DIST in the shared preamble is an
        // unused leftover and deliberately does not match.)
        expect(source, `${file} is exempt because it ${EXEMPT.get(file)}`).not.toMatch(/\bDIST\b/)
        expect(source, `${file} must serve its own harness page`).toContain('const PAGE =')
        return
      }

      expect(source, `${file} opens a browser without importing blockAnalytics`).toContain(
        "from './blockAnalytics.mjs'",
      )

      // One call per context/page that gets opened. A helper imported once and
      // applied to only the first of two contexts is exactly the shape of the
      // bug this test exists because of, so counting matters more than
      // presence. The import does not match — it has no call parenthesis.
      const opened = source.match(/browser\.new(?:Context|Page)\(/g) ?? []
      const blocked = source.match(/blockAnalytics\(/g) ?? []
      expect(
        blocked.length,
        `${file} opens ${opened.length} browser context(s) but calls blockAnalytics ${blocked.length} time(s)`,
      ).toBeGreaterThanOrEqual(opened.length)
    })
  }

  it('the shared blocker aborts both the loader and the beacon host', () => {
    const source = readFileSync(join(CHECKS_DIR, 'blockAnalytics.mjs'), 'utf-8')
    expect(source).toContain('googletagmanager.com')
    expect(source).toContain('google-analytics.com')
    expect(source.match(/route\.abort\(\)/g)?.length).toBe(2)
  })
})

/**
 * The site's own half of the defence. blockAnalytics() only protects scripts
 * that call it; index.html has to hold when the page is opened by something
 * that is not one of our checks — `npm run preview`, a throwaway static
 * server, another agent's tooling. dist/ ships the production measurement ID
 * by design, so the hostname is the only thing that can tell those apart.
 *
 * Behaviour is measured by scripts/checks/local-analytics-check.mjs (0
 * requests on localhost, 1 on the production hostname). These are the cheap
 * structural assertions that fail in `npm test` long before that runs.
 */
describe('the in-page analytics guard', () => {
  const INDEX = readFileSync(join(process.cwd(), 'index.html'), 'utf-8')
  const DIST = join(process.cwd(), 'dist')

  it('gates the loader on the hostname instead of shipping a static tag', () => {
    expect(INDEX).toContain('GA_LOCAL_HOST')
    // A static <script src=gtag> cannot be gated — that is the shape this
    // replaced, and its return would silently undo the guard.
    expect(INDEX).not.toMatch(/<script[^>]+src=["']https:\/\/www\.googletagmanager\.com/)
  })

  it('recognises every local hostname form a dev server actually serves on', () => {
    const guard = INDEX.slice(INDEX.indexOf('GA_LOCAL_HOST'))
    for (const host of ['localhost', '127\\.0\\.0\\.1', '::1']) {
      expect(guard, `${host} must be treated as local`).toContain(host)
    }
  })

  /**
   * Consent Mode requires defaults to be set BEFORE the tag loads. If they
   * ever moved inside the guard, "loader ran, defaults missing" becomes
   * reachable — the one ordering that actually loses consent. Unconditional,
   * the guard can only ever remove measurement, never weaken consent.
   */
  it('leaves the consent defaults outside the guard', () => {
    const guardAt = INDEX.indexOf('if (!GA_LOCAL_HOST)')
    expect(guardAt).toBeGreaterThan(-1)
    const defaultsBefore = [...INDEX.slice(0, guardAt).matchAll(/gtag\('consent',\s*'default'/g)]
    expect(defaultsBefore.length).toBe(2)
    expect(INDEX.slice(guardAt)).not.toContain("'consent'")
  })

  it('every built HTML carries the guard and no static tag', () => {
    requireFreshDist()
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.html') ? [join(dir, e.name)] : [],
      )
    const files = walk(DIST)
    expect(files.length).toBeGreaterThan(30)
    for (const file of files) {
      const html = readFileSync(file, 'utf-8')
      expect(html, `${file} lost the hostname guard`).toContain('GA_LOCAL_HOST')
      expect(html, `${file} has an ungateable static gtag tag`).not.toMatch(
        /<script[^>]+src=["']https:\/\/www\.googletagmanager\.com/,
      )
    }
  })
})
