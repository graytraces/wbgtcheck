import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

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
