import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@testing-library/react'
import { useEffect } from 'react'

/**
 * The blank-page failsafe.
 *
 * index.html hides the prerendered body so it cannot flash before React
 * mounts, and <noscript> re-shows it only when JS is DISABLED. When JS is
 * enabled but the entry bundle never arrives — a stale-cache 404 after a
 * deploy, a dead connection beside a field, an extension blocking it —
 * nothing removed that rule and the page rendered zero characters, header and
 * nav included. Measured on the pre-fix build: 16 prerender nodes, 0 visible
 * characters, on every route.
 *
 * .omc/boot-failure-check.mjs proves the browser behaviour end to end (blocked
 * bundle → readable text; normal load → no flash, no leftovers, no duplicate
 * headings). These are the parts reachable without a browser.
 */

const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')

describe('index.html arms the failsafe', () => {
  it('hides the prerendered copy by default and reveals it only on boot failure', () => {
    expect(html).toMatch(/\[data-prerender\]\{display:none\}/)
    expect(html).toMatch(/html\.boot-failed \[data-prerender\]\{display:block\}/)
  })

  it('still covers JS being disabled outright', () => {
    expect(html).toMatch(/<noscript><style>\[data-prerender\]\{display:block\}/)
  })

  it('sets a timer that adds the reveal class', () => {
    const script = /window\.__wbgtBoot = setTimeout\(function \(\) \{([\s\S]*?)\}, (\d+)\)/.exec(html)
    expect(script, 'boot timer missing from index.html').not.toBeNull()
    expect(script![1]).toContain("classList.add('boot-failed')")
    // Long enough that a slow phone finishes booting first.
    expect(Number(script![2])).toBeGreaterThanOrEqual(8000)
  })
})

describe('a mounted app disarms it', () => {
  // The real effect from App.tsx, exercised without pulling in the router.
  function Mounted() {
    useEffect(() => {
      const w = window as Window & { __wbgtBoot?: ReturnType<typeof setTimeout> }
      if (w.__wbgtBoot !== undefined) {
        clearTimeout(w.__wbgtBoot)
        delete w.__wbgtBoot
      }
      document.documentElement.classList.remove('boot-failed')
      document.querySelectorAll('[data-prerender]').forEach((el) => el.remove())
    }, [])
    return <p>app</p>
  }

  beforeEach(() => {
    vi.useFakeTimers()
    document.documentElement.className = ''
    document.body.innerHTML = '<div data-prerender="true"><h1>prerendered</h1></div>'
  })

  afterEach(() => {
    vi.useRealTimers()
    document.documentElement.className = ''
  })

  it('clears the timer, so the prerendered copy is never revealed', () => {
    const w = window as Window & { __wbgtBoot?: ReturnType<typeof setTimeout> }
    w.__wbgtBoot = setTimeout(() => {
      document.documentElement.classList.add('boot-failed')
    }, 10000)

    render(<Mounted />)
    vi.advanceTimersByTime(30000)

    expect(document.documentElement.classList.contains('boot-failed')).toBe(false)
    expect(w.__wbgtBoot).toBeUndefined()
    expect(document.querySelectorAll('[data-prerender]')).toHaveLength(0)
  })

  it('fires when the app never mounts', () => {
    const w = window as Window & { __wbgtBoot?: ReturnType<typeof setTimeout> }
    w.__wbgtBoot = setTimeout(() => {
      document.documentElement.classList.add('boot-failed')
    }, 10000)

    vi.advanceTimersByTime(30000)

    expect(document.documentElement.classList.contains('boot-failed')).toBe(true)
    // The prerendered copy is still in the document, ready to be shown.
    expect(document.querySelectorAll('[data-prerender]')).toHaveLength(1)
    delete w.__wbgtBoot
  })

  it('cleans up the class if a very slow boot already tripped it', () => {
    document.documentElement.classList.add('boot-failed')
    render(<Mounted />)
    expect(document.documentElement.classList.contains('boot-failed')).toBe(false)
    expect(document.querySelectorAll('[data-prerender]')).toHaveLength(0)
  })
})
