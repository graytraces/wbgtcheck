import { fileURLToPath as __fileURLToPath } from "node:url"
import __nodePath from "node:path"

// Paths are derived from this file so the checks run from any cwd.
const __HERE = __nodePath.dirname(__fileURLToPath(import.meta.url))
const REPO = __nodePath.resolve(__HERE, "../..")
const WORKSPACE = __nodePath.resolve(REPO, "..")
const WORKSPACE_PKG = __nodePath.join(WORKSPACE, "package.json")
const REPO_DIST = __nodePath.join(REPO, "dist")
const REPO_SHOTS = __nodePath.join(REPO, ".omc/screenshots")

// print-check.mjs — how many sheets does the reading log actually print?
// Seeds two log entries, applies the print class, and renders to PDF at Letter
// size so the page count is the browser's own pagination, not a guess.
import http from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { blockAnalytics } from './blockAnalytics.mjs'
const require = createRequire(WORKSPACE_PKG)
const { chromium } = require('playwright')

const DIST = process.argv[2] ?? REPO_DIST
const LABEL = process.argv[3] ?? 'after'
const OUT = REPO_SHOTS
const PORT = 4195
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' }

const server = http.createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  const cands = /\.\w+$/.test(p) ? [p] : [`${p}.html`, path.posix.join(p, 'index.html')]
  for (const rel of cands) {
    try {
      const b = await readFile(path.join(DIST, rel))
      res.writeHead(200, { 'content-type': MIME[path.extname(rel)] ?? 'application/octet-stream' })
      res.end(b); return
    } catch {}
  }
  res.writeHead(404).end('x')
})
await new Promise((r) => server.listen(PORT, r))
await mkdir(OUT, { recursive: true })

const now = Date.now()
const ENTRIES = [
  { id: 'a', timestamp: now - 1800_000, wbgtF: 88.4, source: 'forecast', flagKey: 'flags.orange.label', policyKey: 'policies.uil-class-3', locationLabel: 'Austin, TX' },
  { id: 'b', timestamp: now - 3600_000, wbgtF: 91.2, source: 'onsite', flagKey: 'flags.red.label', policyKey: 'policies.uil-class-3', locationLabel: 'Austin, TX' },
]

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' })
function hourly(startMs, hours, fn) {
  const values = []
  for (let i = 0; i < hours; i++) {
    const t = new Date(startMs + i * 3_600_000).toISOString().replace(/\.\d{3}Z$/, '+00:00')
    values.push({ validTime: `${t}/PT1H`, value: fn(i) })
  }
  return values
}
const start = Date.now() - 2 * 3_600_000
const WBGT_FIXTURE = {
  location: { lat: 30.27, lon: -97.74, city: 'Austin', state: 'TX', timeZone: 'America/Chicago' },
  hasWbgt: true,
  wetBulbGlobeTemperature: { uom: 'wmoUnit:degC', values: hourly(start, 96, (i) => 30 + 4 * Math.sin(i / 4)) },
  temperature: { uom: 'wmoUnit:degC', values: hourly(start, 96, (i) => 34 + 4 * Math.sin(i / 4)) },
  relativeHumidity: { uom: 'wmoUnit:percent', values: hourly(start, 96, () => 60) },
  windSpeed: { uom: 'wmoUnit:km_h-1', values: hourly(start, 96, () => 10) },
  skyCover: { uom: 'wmoUnit:percent', values: hourly(start, 96, () => 30) },
}
await ctx.route('**/api/wbgt*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(WBGT_FIXTURE) }))
await ctx.route('**/api/aqi*', (r) => r.fulfill({ status: 503, body: 'x' }))
await blockAnalytics(ctx)
const page = await ctx.newPage()
await page.addInitScript((entries) => {
  localStorage.setItem('wbgt-location', JSON.stringify({ lat: 30.27, lon: -97.74, label: 'Austin, TX', stateAbbr: 'TX' }))
  localStorage.setItem('wbgt-uil-class', JSON.stringify('uil-class-3'))
  localStorage.setItem('wbgt-policy', JSON.stringify('uil-class-3'))
  localStorage.setItem('wbgt:log:v1', JSON.stringify(entries))
}, ENTRIES)
await page.goto(`http://localhost:${PORT}/en`, { waitUntil: 'networkidle' })
// Body prerender only — JSON-LD keeps its marker (see App.tsx).
await page.waitForFunction(() => !document.querySelector('[data-prerender]:not(script)'))
await page.waitForSelector('#wbgt-log', { timeout: 15000 })
await page.evaluate(() => document.body.classList.add('print-wbgt-log'))
await page.emulateMedia({ media: 'print' })
await page.waitForTimeout(300)

const pdfPath = `${OUT}/print-${LABEL}.pdf`
await page.pdf({ path: pdfPath, format: 'Letter', printBackground: true })
const bytes = await readFile(pdfPath)
const pages = (bytes.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length

// Visible ink per printed sheet, measured from the live DOM.
const info = await page.evaluate(() => {
  const log = document.getElementById('wbgt-log')
  const r = log.getBoundingClientRect()
  const visible = [...document.querySelectorAll('body *')].filter((el) => {
    const cs = getComputedStyle(el)
    return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getBoundingClientRect().height > 0
  }).length
  return {
    docHeight: Math.round(document.documentElement.scrollHeight),
    logTop: Math.round(r.top + window.scrollY),
    logHeight: Math.round(r.height),
    visibleElements: visible,
  }
})
console.log(`\n=== print ${LABEL} ===`)
console.log(`  PDF sheets:        ${pages}`)
console.log(`  document height:   ${info.docHeight}px`)
console.log(`  log box:           top ${info.logTop}px, height ${info.logHeight}px`)
console.log(`  visible elements:  ${info.visibleElements}`)
console.log(`  wrote ${pdfPath}`)
await browser.close(); server.close()
