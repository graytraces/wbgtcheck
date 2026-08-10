import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useEffect } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Structured data must survive hydration.
 *
 * scripts/prerender.mjs marks its JSON-LD with the same `data-prerender`
 * attribute it puts on prose, and App's mount effect swept that attribute
 * unqualified — so every Article and BreadcrumbList on the site was deleted
 * the moment React mounted. Measured before the fix: 1-2 blocks in the served
 * HTML, 0 in the post-JS DOM, on every page. Google reads structured data from
 * the rendered DOM, so those schemas had been invalid since launch. Canonical
 * and description survived only because the SEO component re-emits them.
 *
 * scripts/checks/boot-failure-check.mjs proves this in a real browser across
 * nine routes; this is the cheap version that runs in every `npm test`.
 */

// The effect from App.tsx, without pulling in the router.
function Mounted() {
  useEffect(() => {
    document.querySelectorAll('[data-prerender]:not(script)').forEach((el) => el.remove())
  }, [])
  return <p>app</p>
}

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
  it('keeps JSON-LD after mount', () => {
    render(<Mounted />)
    const ld = document.querySelectorAll('script[type="application/ld+json"]')
    expect(ld).toHaveLength(1)
    expect(JSON.parse(ld[0].textContent!)['@type']).toBe('Article')
  })

  it('still wipes the prerendered prose it exists to clear', () => {
    render(<Mounted />)
    expect(document.querySelectorAll('[data-prerender]:not(script)')).toHaveLength(0)
    expect(document.body.textContent).not.toContain('prerendered prose')
  })

  it('removes the non-script head tags the SEO component re-emits', () => {
    // canonical and description are re-published by <SEO>, so removing them is
    // correct — the bug was that JSON-LD had no such re-emitter.
    render(<Mounted />)
    expect(document.querySelector('link[rel=canonical][data-prerender]')).toBeNull()
    expect(document.querySelector('meta[name=description][data-prerender]')).toBeNull()
  })

  it('App.tsx uses the qualified selector, not a bare attribute sweep', () => {
    // Guards the actual source: a future edit that drops :not(script) would
    // silently delete every schema on the site again.
    const src = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8')
    expect(src).toContain("[data-prerender]:not(script)")
    expect(src).not.toMatch(/querySelectorAll\('\[data-prerender\]'\)/)
  })
})
