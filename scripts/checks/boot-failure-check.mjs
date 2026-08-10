import { fileURLToPath as __fileURLToPath } from "node:url"
import __nodePath from "node:path"

// Paths are derived from this file so the checks run from any cwd.
const __HERE = __nodePath.dirname(__fileURLToPath(import.meta.url))
const REPO = __nodePath.resolve(__HERE, "../..")
const WORKSPACE = __nodePath.resolve(REPO, "..")
const WORKSPACE_PKG = __nodePath.join(WORKSPACE, "package.json")
const REPO_DIST = __nodePath.join(REPO, "dist")

// boot-failure-check.mjs — three questions about the prerender/hydration seam:
//   1. entry JS blocked  → is there any readable text? (the blank-page bug)
//   2. normal load       → is the prerendered copy fully gone, with no
//                          duplicate headings and no flash of it on the way?
//   3. prose parity      → does the prerendered body carry the same headings
//                          the hydrated DOM does?
//
//   node scripts/checks/boot-failure-check.mjs <dist-dir> <label>
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { blockAnalytics } from './blockAnalytics.mjs'
const require = createRequire(WORKSPACE_PKG)
const { chromium } = require('playwright')

const DIST = process.argv[2] ?? REPO_DIST
const LABEL = process.argv[3] ?? 'after'
const PORT = 4197
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' }

const server = http.createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  const cands = /\.\w+$/.test(p) ? [p] : [`${p}.html`, path.posix.join(p, 'index.html')]
  for (const rel of cands) {
    try {
      const b = await readFile(path.join(DIST, rel))
      res.writeHead(200, { 'content-type': MIME[path.extname(rel)] ?? 'application/octet-stream' })
      res.end(b); return
    } catch {
      // Missing file: try the next candidate, then fall through to 404.
    }
  }
  res.writeHead(404).end('not found')
})
await new Promise((r) => server.listen(PORT, r))

// Sampled rather than exhaustive (each route costs a 12s blocked-boot wait),
// but every page SHAPE is represented: home, a picker state, a reference-table
// state, a statute state, the multi-table state, the hub, and both locales.
const ROUTES = [
  '/en',
  '/en/texas',
  '/en/georgia',
  '/es/texas',
  '/en/states',
  '/en/massachusetts',
  '/en/kentucky',
  '/en/florida',
  '/es/california',
]
const browser = await chromium.launch()
let failures = 0
console.log(`\n=== boot ${LABEL} ===`)

// 1. Entry bundle blocked.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
  await ctx.route('**/assets/*.js', (r) => r.abort())
  await blockAnalytics(ctx)
  const page = await ctx.newPage()
  for (const route of ROUTES) {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(12000)
    const seen = await page.evaluate(() => {
      const vis = (el) => {
        const cs = getComputedStyle(el)
        return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getBoundingClientRect().height > 0
      }
      const text = [...document.querySelectorAll('body *')].filter(vis)
        .map((e) => e.childNodes.length && [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' '))
        .join(' ').replace(/\s+/g, ' ').trim()
      return {
        prerenderNodes: document.querySelectorAll('[data-prerender]:not(script)').length,
        visibleChars: text.length,
        sample: text.slice(0, 70),
      }
    })
    const ok = seen.visibleChars > 200
    if (!ok) failures++
    console.log(`  js-blocked ${route.padEnd(12)} prerenderNodes=${seen.prerenderNodes} visibleChars=${seen.visibleChars} ${ok ? 'OK' : 'FAIL — blank page'}`)
    if (ok) console.log(`  ${''.padEnd(23)} "${seen.sample}…"`)
  }
  await ctx.close()
}

// 2 + 3. Normal load: no leftovers, no duplicate headings, and the prerendered
// headings match what hydration renders.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
  await blockAnalytics(ctx)
  await ctx.route('**/api/**', (r) => r.fulfill({ status: 503, body: 'x' }))
  const page = await ctx.newPage()
  for (const route of ROUTES) {
    // Headings present in the served HTML, before any JS runs.
    const html = await (await fetch(`http://localhost:${PORT}${route}`)).text()
    const preHeadings = [...html.matchAll(/<h([12])>([^<]+)<\/h\1>/g)].map((m) => m[2].trim())

    let flashed = false
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded' })
    // Sample during boot: the prerendered block must never become visible.
    for (let i = 0; i < 20; i++) {
      const visible = await page.evaluate(() => {
        const el = document.querySelector('[data-prerender]:not(script)')
        return el ? getComputedStyle(el).display !== 'none' : false
      })
      if (visible) flashed = true
      await page.waitForTimeout(25)
    }
    await page.waitForFunction(
      () => !document.querySelector('[data-prerender]:not(script)'),
      { timeout: 15000 },
    )
    const post = await page.evaluate(() => ({
      leftovers: document.querySelectorAll('[data-prerender]:not(script)').length,
      // Structured data must SURVIVE hydration. An unqualified prerender
      // sweep used to delete every Article/BreadcrumbList on mount, so
      // Google saw none of them.
      ldJson: document.querySelectorAll('script[type="application/ld+json"]').length,
      bootFailedClass: document.documentElement.classList.contains('boot-failed'),
      headings: [...document.querySelectorAll('h1, h2')].map((h) => h.textContent.trim()),
    }))
    const dupes = post.headings.filter((h, i) => post.headings.indexOf(h) !== i)
    // Every prerendered heading should still exist after hydration.
    const missing = preHeadings.filter((h) => !post.headings.some((p) => p === h))
    // Structured data present before JS must still be present after it.
    const rawLd = (html.match(/application\/ld\+json/g) ?? []).length
    const ldKept = post.ldJson >= rawLd && rawLd > 0
    const ok =
      post.leftovers === 0 &&
      !flashed &&
      !post.bootFailedClass &&
      dupes.length === 0 &&
      missing.length === 0 &&
      ldKept
    if (!ok) failures++
    console.log(
      `  normal     ${route.padEnd(12)} leftovers=${post.leftovers} flash=${flashed} bootFailed=${post.bootFailedClass} dupHeadings=${dupes.length} prerenderHeadingsLost=${missing.length} ldJson=${post.ldJson}/${rawLd} ${ok ? 'OK' : 'FAIL'}`,
    )
    if (!ldKept) console.log(`  ${''.padEnd(23)} structured data lost on hydration`)
    if (missing.length) console.log(`  ${''.padEnd(23)} lost: ${JSON.stringify(missing.slice(0, 4))}`)
  }
  await ctx.close()
}

await browser.close(); server.close()
console.log(`\n${failures} failing check(s)`)
process.exit(failures === 0 ? 0 : 1)
