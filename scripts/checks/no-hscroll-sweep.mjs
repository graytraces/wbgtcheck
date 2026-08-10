import { fileURLToPath as __fileURLToPath } from "node:url"
import __nodePath from "node:path"

// Paths are derived from this file so the checks run from any cwd.
const __HERE = __nodePath.dirname(__fileURLToPath(import.meta.url))
const REPO = __nodePath.resolve(__HERE, "../..")
const WORKSPACE = __nodePath.resolve(REPO, "..")
const WORKSPACE_PKG = __nodePath.join(WORKSPACE, "package.json")
const REPO_DIST = __nodePath.join(REPO, "dist")
const REPO_SHOTS = __nodePath.join(REPO, ".omc/screenshots")

// no-hscroll-sweep.mjs — regression check: no page may scroll horizontally.
// Serves dist/ statically (extensionless → .html), renders every route in
// EN+ES at 375/390/1280 px with Playwright chromium, and fails when
// document.documentElement.scrollWidth exceeds the viewport, printing the
// widest offending element's CSS path. Run from anywhere:
//   node scripts/checks/no-hscroll-sweep.mjs
// Uses the workspace-root playwright install; JS runs (post-hydration DOM),
// service workers blocked so runs stay deterministic.
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(WORKSPACE_PKG)
const { chromium } = require('playwright')

const DIST = REPO_DIST
const PORT = 4179

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
}

const server = http.createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  const candidates = /\.\w+$/.test(urlPath)
    ? [urlPath]
    : [`${urlPath}.html`, path.posix.join(urlPath, 'index.html')]
  for (const rel of candidates) {
    try {
      const file = path.join(DIST, rel)
      if (!file.startsWith(DIST)) break
      const body = await readFile(file)
      res.writeHead(200, { 'content-type': MIME[path.extname(rel)] ?? 'application/octet-stream' })
      res.end(body)
      return
    } catch {
      // try next candidate
    }
  }
  res.writeHead(404).end('not found')
})

// Home is additionally checked in its READY state (saved location + stubbed
// /api/wbgt) — the verdict card, timeline, week strip and bands table only
// exist there, and the original miss was exactly that state.
function hourly(startMs, hours, fn) {
  const values = []
  for (let i = 0; i < hours; i++) {
    const t = new Date(startMs + i * 3_600_000).toISOString().replace(/\.\d{3}Z$/, '+00:00')
    values.push({ validTime: `${t}/PT1H`, value: fn(i) })
  }
  return values
}
const fixtureStart = Date.now() - 2 * 3_600_000
const WBGT_FIXTURE = {
  location: { lat: 30.27, lon: -97.74, city: 'Austin', state: 'TX', timeZone: 'America/Chicago' },
  hasWbgt: true,
  wetBulbGlobeTemperature: { uom: 'wmoUnit:degC', values: hourly(fixtureStart, 96, (i) => 26 + 6 * Math.sin(i / 4)) },
  temperature: { uom: 'wmoUnit:degC', values: hourly(fixtureStart, 96, (i) => 30 + 6 * Math.sin(i / 4)) },
  relativeHumidity: { uom: 'wmoUnit:percent', values: hourly(fixtureStart, 96, () => 60) },
  windSpeed: { uom: 'wmoUnit:km_h-1', values: hourly(fixtureStart, 96, () => 10) },
  skyCover: { uom: 'wmoUnit:percent', values: hourly(fixtureStart, 96, () => 30) },
}

const ROUTES = [
  '',
  'texas',
  'georgia',
  'south-carolina',
  'tennessee',
  'iowa',
  'north-carolina',
  'new-york',
  'virginia',
  'massachusetts',
  'florida',
  'california',
  'kentucky',
  'wbgt-vs-heat-index',
  'states',
  'washington-air-quality',
  'oregon-air-quality',
  'california-air-quality',
  'privacy',
  'disclaimer',
]
const LANGS = ['en', 'es']
const WIDTHS = [320, 375, 390, 1280]

// Widest element whose right edge passes the viewport — the offender.
function findOffender() {
  const vw = document.documentElement.clientWidth
  let worst = null
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.right > vw + 1 && (!worst || r.right > worst.right)) {
      const cs = getComputedStyle(el)
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue
      let sel = el.tagName.toLowerCase()
      if (el.className && typeof el.className === 'string')
        sel += '.' + el.className.trim().split(/\s+/).slice(0, 4).join('.')
      worst = { right: Math.round(r.right), width: Math.round(r.width), sel }
    }
  }
  return worst
}

await new Promise((resolve) => server.listen(PORT, resolve))
const browser = await chromium.launch()
let failures = 0
let checked = 0

async function check(page, width, label) {
  const result = await page.evaluate(
    ([finder]) => {
      const doc = document.documentElement
      const overflow = doc.scrollWidth - doc.clientWidth
      // eslint-disable-next-line no-new-func
      const offender = overflow > 1 ? new Function(`return (${finder})()`)() : null
      // Every VISIBLE table must fit its wrapper — no internal horizontal
      // scroll on phones. Sole declared exception: a container carrying
      // .scroll-x-fade (the /states five-column comparison table), whose
      // class also paints the visible clipped-content cue.
      const tables = []
      for (const tbl of document.querySelectorAll('table')) {
        if (tbl.offsetWidth === 0) continue // hidden variant (e.g. WA desktop table on mobile)
        if (tbl.closest('.scroll-x-fade')) continue
        const wrapper = tbl.parentElement
        if (tbl.scrollWidth > wrapper.clientWidth + 1) {
          const h = tbl.closest('section')?.querySelector('h2')?.textContent ?? ''
          tables.push(
            `table "${h.slice(0, 40)}" scrollWidth ${tbl.scrollWidth} > wrapper ${wrapper.clientWidth}`,
          )
        }
      }
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        overflow,
        offender,
        tables,
      }
    },
    [findOffender.toString()],
  )
  checked++
  if (result.overflow > 1 || result.tables.length > 0) {
    failures++
    console.log(
      `FAIL ${width}px ${label} — scrollWidth ${result.scrollWidth} > clientWidth ${result.clientWidth} (+${result.overflow}px)` +
        (result.offender
          ? `\n     offender: ${result.offender.sel} (width ${result.offender.width}, right ${result.offender.right})`
          : '') +
        result.tables.map((tv) => `\n     ${tv}`).join(''),
    )
  }
}

for (const width of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width, height: 844 },
    serviceWorkers: 'block',
  })
  const page = await context.newPage()
  for (const lang of LANGS) {
    for (const route of ROUTES) {
      const url = `http://localhost:${PORT}/${lang}${route ? `/${route}` : ''}`
      await page.goto(url, { waitUntil: 'networkidle' })
      // Post-hydration DOM: the prerender block is removed on App mount.
      await page.waitForFunction(() => !document.querySelector('[data-prerender]'))
      await check(page, width, `/${lang}/${route || '(home)'}`)
    }
  }
  await context.close()

  // Home READY state — its own context so the seeded location cannot leak
  // into the idle checks above.
  const readyContext = await browser.newContext({
    viewport: { width, height: 844 },
    serviceWorkers: 'block',
  })
  await readyContext.route('**/api/wbgt*', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(WBGT_FIXTURE) }),
  )
  const readyPage = await readyContext.newPage()
  await readyPage.addInitScript(() => {
    localStorage.setItem(
      'wbgt-location',
      JSON.stringify({ lat: 30.27, lon: -97.74, label: 'Austin, TX', stateAbbr: 'TX' }),
    )
  })
  for (const lang of LANGS) {
    await readyPage.goto(`http://localhost:${PORT}/${lang}`, { waitUntil: 'networkidle' })
    await readyPage.waitForSelector('table', { timeout: 15000 })
    await check(readyPage, width, `/${lang}/(home ready)`)
  }
  await readyContext.close()
}
await browser.close()
server.close()
console.log(`\n${checked} page renders checked, ${failures} with horizontal scroll`)
process.exit(failures === 0 ? 0 : 1)
