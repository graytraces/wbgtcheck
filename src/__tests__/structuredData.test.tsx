import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { clearPrerenderedCopy } from '../utils/prerenderCleanup'

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
    const files = walk(join(process.cwd(), 'src')).filter((f) => !f.includes('__tests__'))
    expect(files.length).toBeGreaterThan(40)
    const offenders: string[] = []
    for (const file of files) {
      const src = readFileSync(file, 'utf8')
      for (const match of src.matchAll(/querySelector(?:All)?\(\s*(['"`])(\[data-prerender\][^'"`]*)\1/g)) {
        if (!match[2].includes(':not(script)')) {
          offenders.push(`${file.replace(process.cwd(), '.')}: ${match[2]}`)
        }
      }
    }
    expect(offenders, 'an unqualified sweep would delete every schema again').toEqual([])
  })
})
