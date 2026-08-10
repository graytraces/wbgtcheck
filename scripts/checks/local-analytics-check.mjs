import { fileURLToPath as __fileURLToPath } from "node:url"
import __nodePath from "node:path"

// Paths are derived from this file so the checks run from any cwd.
const __HERE = __nodePath.dirname(__fileURLToPath(import.meta.url))
const REPO = __nodePath.resolve(__HERE, "../..")
const WORKSPACE = __nodePath.resolve(REPO, "..")
const WORKSPACE_PKG = __nodePath.join(WORKSPACE, "package.json")
const REPO_DIST = __nodePath.join(REPO, "dist")

/**
 * The second layer of the analytics defence, measured rather than assumed.
 *
 * blockAnalytics() stops our own checks at the network layer, but it only
 * protects scripts that remember to call it. index.html carries the other
 * half: on a local hostname it never injects the gtag loader at all, so
 * `npm run preview`, a throwaway static server, or another agent's tooling
 * cannot post page_views to the production property either.
 *
 * This check asserts both directions, because a guard that silenced
 * production would be a regression wearing a fix's clothes:
 *
 *   localhost          → the loader request is never even CREATED
 *   wbgtcheck.com      → the loader request is created exactly as before
 *
 * blockAnalytics() is still applied to every context here. It is not what is
 * being tested — the `request` event fires before routing, so attempts are
 * counted whether or not they are aborted — it is there so that a REGRESSION
 * in the in-page guard is reported by a failing check instead of by another
 * few hundred hits in the property. Safety net under the measurement, never
 * in place of it.
 */
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { createRequire } from 'node:module'
import { blockAnalytics } from './blockAnalytics.mjs'

const require = createRequire(WORKSPACE_PKG)
const { chromium } = require('playwright')

const DIST = process.argv[2] ?? REPO_DIST
const PORT = 4199
const PROD_ORIGIN = 'https://wbgtcheck.com'
const ROUTES = ['/en', '/en/texas', '/es/california', '/en/states', '/en/kentucky']

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2',
}

function distPath(pathname) {
  let p = join(DIST, decodeURIComponent(pathname))
  if (!extname(p) && existsSync(`${p}.html`)) p = `${p}.html`
  return p
}

if (!existsSync(DIST)) {
  console.error(`No dist/ at ${DIST} — run npm run build first.`)
  process.exit(1)
}

const server = http.createServer(async (req, res) => {
  const p = distPath(new URL(req.url, 'http://localhost').pathname)
  try {
    const body = await readFile(p)
    res.writeHead(200, { 'Content-Type': TYPES[extname(p)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html' })
    res.end('<h1>404</h1>')
  }
})
await new Promise((r) => server.listen(PORT, r))

const isAnalytics = (url) => /googletagmanager\.com|google-analytics\.com/.test(url)
const browser = await chromium.launch()
let failures = 0

// --- localhost: the loader must never be requested -------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
  await blockAnalytics(ctx)
  const attempted = []
  ctx.on('request', (r) => { if (isAnalytics(r.url())) attempted.push(r.url()) })
  const page = await ctx.newPage()
  for (const route of ROUTES) {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle' })
  }
  const shim = await page.evaluate(() => ({
    gtag: typeof window.gtag === 'function',
    consentDefaults: (window.dataLayer || []).filter((a) => a[0] === 'consent' && a[1] === 'default').length,
    configCalls: (window.dataLayer || []).filter((a) => a[0] === 'config').length,
  }))
  await ctx.close()

  const ok = attempted.length === 0
  if (!ok) failures++
  console.log(`  localhost   ${ROUTES.length} loads  analyticsRequests=${attempted.length} ${ok ? 'OK' : 'LEAK'}`)
  attempted.forEach((u) => console.log(`      created: ${u}`))

  // The guard must suppress the tag without breaking what the app calls: the
  // gtag shim stays defined (analytics.ts calls it), consent defaults still
  // run, and no config fires.
  if (!shim.gtag) { failures++; console.log('      gtag shim missing — analytics.ts would stop reporting') }
  if (shim.consentDefaults !== 2) { failures++; console.log(`      consent defaults=${shim.consentDefaults}, expected 2`) }
  if (shim.configCalls !== 0) { failures++; console.log(`      config fired ${shim.configCalls}× on localhost`) }
}

// --- production hostname: the loader must still be requested ---------------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
  await blockAnalytics(ctx)
  const attempted = []
  ctx.on('request', (r) => { if (isAnalytics(r.url())) attempted.push(r.url()) })
  // Serve the same dist under the real origin so location.hostname is real.
  await ctx.route(`${PROD_ORIGIN}/**`, async (route) => {
    const p = distPath(new URL(route.request().url()).pathname)
    try {
      const body = await readFile(p)
      await route.fulfill({ status: 200, contentType: TYPES[extname(p)] ?? 'application/octet-stream', body })
    } catch {
      await route.fulfill({ status: 404, body: '404' })
    }
  })
  const page = await ctx.newPage()
  await page.goto(`${PROD_ORIGIN}/en`, { waitUntil: 'networkidle' })
  const state = await page.evaluate(() => ({
    loaderTags: document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').length,
    preconnects: document.querySelectorAll('link[href*="googletagmanager.com"]').length,
    configCalls: (window.dataLayer || []).filter((a) => a[0] === 'config').length,
  }))
  await ctx.close()

  const ok = attempted.length >= 1 && state.loaderTags === 1 && state.configCalls === 1
  if (!ok) failures++
  console.log(
    `  production  1 load   analyticsRequests=${attempted.length} loaderTags=${state.loaderTags} ` +
      `preconnects=${state.preconnects} config=${state.configCalls} ${ok ? 'OK' : 'FAIL'}`,
  )
  if (!ok) console.log('      the guard is suppressing production analytics, not just local')
}

await browser.close()
server.close()
console.log(`\n${failures} failing check(s)`)
process.exit(failures === 0 ? 0 : 1)
