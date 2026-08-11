import { fileURLToPath as __fileURLToPath } from 'node:url'
import __nodePath from 'node:path'

// Paths are derived from this file so the checks run from any cwd.
const __HERE = __nodePath.dirname(__fileURLToPath(import.meta.url))
const REPO = __nodePath.resolve(__HERE, '../..')
const WORKSPACE = __nodePath.resolve(REPO, '..')
const WORKSPACE_PKG = __nodePath.join(WORKSPACE, 'package.json')
const REPO_DIST = __nodePath.join(REPO, 'dist')

// tap-target-check.mjs — every interactive element must be hittable across a
// 24px box centred on it (WCAG 2.2 SC 2.5.8, and the ergonomics of a phone
// held in the sun by a coach with sixty seconds before practice).
//
//   node scripts/checks/tap-target-check.mjs
//
// Measured BEHAVIOURALLY, with elementFromPoint, not by reading geometry off
// the box. The reason is the failure mode that ANY hit-area expansion
// introduces: growing one target's box past its line can put it over a
// NEIGHBOUR's centre, so the neighbour is still 24px and still unhittable —
// the wrong link fires. Geometry cannot see that; both boxes measure fine.
// Probing five points and requiring the element ITSELF to answer catches it,
// because the covered neighbour stops answering for its own centre. All three
// collisions this pass fixed (the /states hub gaps, the home link row, the two
// table columns) were found this way and by nothing else.
//
// So the assertion is the user's question: if I put a 24px fingertip on this
// thing, do I get this thing?
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { blockAnalytics } from './blockAnalytics.mjs'

const require = createRequire(WORKSPACE_PKG)
const { chromium } = require('playwright')

const DIST = REPO_DIST
const PORT = 4183
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
      // try the next candidate
    }
  }
  res.writeHead(404).end('not found')
})

// Same fixture the hscroll sweep uses: the verdict card, the timeline, the
// week strip, the bands disclosure and the reading log only exist in the
// home page's READY state, and that state holds most of the site's buttons.
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
  'forecast-or-device',
  'marching-band-heat-rules',
  'states',
  'washington-air-quality',
  'oregon-air-quality',
  'california-air-quality',
  'privacy',
  'disclaimer',
]
const LANGS = ['en', 'es']

/** The phone this product is used on. 320 is the narrowest layout supported. */
const WIDTHS = [320, 390]

const MIN = 24

// Runs in the page. Returns one row per interactive element that fails.
function sweep(min) {
  const SELECTOR =
    'a[href], button, [role="button"], summary, select, input:not([type="hidden"])'
  const half = Math.floor(min / 2) - 1 // 11px each way: inside a 24px box
  const failures = []
  const seen = new Set()

  // WCAG 2.2 SC 2.5.8's own exception: a target "in a sentence, or whose size
  // is otherwise constrained by the line-height of non-target text". A link
  // inside a paragraph cannot be given 24px without moving the paragraph, and
  // moving the paragraph is the harm the exception exists to prevent.
  //
  // Implemented as adjacency rather than as "the parent has text somewhere":
  // walk out from the target through its siblings, taking text from text
  // nodes and from non-interactive INLINE elements, and stop at the first
  // block-level box or interactive element. Non-empty means the target has
  // words running into it on its own line. A row of links in a <p> — which is
  // a link list wearing a paragraph — collects nothing and is held to 24px.
  const inSentence = (el) => {
    if (getComputedStyle(el).display !== 'inline') return false
    let text = ''
    for (const dir of ['previousSibling', 'nextSibling']) {
      let node = el[dir]
      while (node) {
        if (node.nodeType === 3) {
          text += node.textContent
        } else if (node.nodeType === 1) {
          if (node.matches(SELECTOR)) break
          if (!getComputedStyle(node).display.startsWith('inline')) break
          text += node.textContent
        }
        node = node[dir]
      }
    }
    return text.trim().length > 0
  }

  for (const el of document.querySelectorAll(SELECTOR)) {
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none') continue
    if (inSentence(el)) continue
    // Measured after scrolling, and on the WIDEST FRAGMENT rather than the
    // bounding box: a link that wraps has one box per line, and their union
    // spans the gap between the lines, so its centre can land in the gap and
    // report the paragraph as the hit.
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' })
    const live = [...el.getClientRects()].filter((r) => r.width > 0 && r.height > 0)
    if (live.length === 0) continue
    const r = live.reduce((a, b) => (a.width * a.height >= b.width * b.height ? a : b))
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2

    const vw = document.documentElement.clientWidth
    const vh = document.documentElement.clientHeight
    const probes = [
      ['centre', cx, cy],
      ['top', cx, cy - half],
      ['bottom', cx, cy + half],
      ['left', cx - half, cy],
      ['right', cx + half, cy],
    ]

    const missed = []
    for (const [name, x, y] of probes) {
      // A probe outside the viewport says nothing about the target — an
      // element flush against the left edge cannot be tested 11px further
      // left. Skipped rather than counted either way.
      if (x < 0 || y < 0 || x > vw - 1 || y > vh - 1) continue
      const hit = document.elementFromPoint(x, y)
      if (hit === el || el.contains(hit)) continue
      missed.push(`${name}→${hit ? hit.tagName.toLowerCase() : 'null'}`)
    }
    if (missed.length === 0) continue

    let selector = el.tagName.toLowerCase()
    if (typeof el.className === 'string' && el.className.trim()) {
      selector += '.' + el.className.trim().split(/\s+/).slice(0, 4).join('.')
    }
    const label = (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 34)
    const key = `${selector}|${label}`
    if (seen.has(key)) continue
    seen.add(key)
    failures.push({
      selector,
      label,
      w: Math.round(r.width * 10) / 10,
      h: Math.round(r.height * 10) / 10,
      missed: missed.join(' '),
    })
  }
  return failures
}

await new Promise((resolve) => server.listen(PORT, resolve))
const browser = await chromium.launch()
let checked = 0
let failing = 0
const reported = new Set()

async function check(page, label) {
  const failures = await page.evaluate(sweep, MIN)
  checked++
  for (const f of failures) {
    failing++
    const key = `${f.selector}|${f.label}`
    if (reported.has(key)) continue
    reported.add(key)
    console.log(
      `FAIL ${label.padEnd(28)} ${f.w}x${f.h} "${f.label}"\n     ${f.selector}\n     unreachable: ${f.missed}`,
    )
  }
}

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block' })
  await blockAnalytics(context)
  const page = await context.newPage()
  for (const lang of LANGS) {
    for (const route of ROUTES) {
      await page.goto(`http://localhost:${PORT}/${lang}${route ? `/${route}` : ''}`, {
        waitUntil: 'networkidle',
      })
      await page.waitForFunction(() => !document.querySelector('[data-prerender]:not(script)'))
      await check(page, `${width}px /${lang}/${route || '(home)'}`)
    }
  }
  await context.close()

  // Home in its READY state, and again with every disclosure and every log
  // control opened — "Clear all" is a destructive button that was 16px tall
  // and does not exist in the DOM until the log has an entry.
  const readyContext = await browser.newContext({
    viewport: { width, height: 844 },
    serviceWorkers: 'block',
  })
  await blockAnalytics(readyContext)
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
    await check(readyPage, `${width}px /${lang}/(home ready)`)

    for (const button of await readyPage.$$('button')) {
      try {
        await button.click({ timeout: 600 })
      } catch {
        // A control that will not take a synthetic click (disabled, covered,
        // detached by an earlier click) is not what this check is about.
      }
    }
    await readyPage.waitForTimeout(400)
    await check(readyPage, `${width}px /${lang}/(home ready, opened)`)
  }
  await readyContext.close()
}

await browser.close()
server.close()
console.log(
  `\n${checked} page states swept, ${failing} target(s) under ${MIN}px (${reported.size} distinct)`,
)
process.exit(failing === 0 ? 0 : 1)
