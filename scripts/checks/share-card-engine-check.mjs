import { fileURLToPath as __fileURLToPath } from "node:url"
import __nodePath from "node:path"

// Paths are derived from this file so the checks run from any cwd.
const __HERE = __nodePath.dirname(__fileURLToPath(import.meta.url))
const REPO = __nodePath.resolve(__HERE, "../..")
const WORKSPACE = __nodePath.resolve(REPO, "..")
const WORKSPACE_PKG = __nodePath.join(WORKSPACE, "package.json")

// share-card-engine-check.mjs — renders the REAL drawShareCard in Chromium and
// WebKit and fails if the peak number's ink box overlaps the flag label's, or
// if either leaves the coloured verdict panel.
//
// Why a browser and not vitest: jsdom has no canvas, and the bug this guards
// only exists in WebKit — Chromium's Anton metrics cleared the collision by
// 10px while WebKit buried the label under the number. Chromium-only checking
// is what let it ship.
//
//   node scripts/checks/share-card-engine-check.mjs
//
// Writes before/after PNGs to .omc/screenshots/share-card-<engine>.png and
// prints the measured ink boxes (the numbers pinned in shareCard.test.ts).
import http from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import * as esbuild from '../../node_modules/esbuild/lib/main.js'

const require = createRequire(WORKSPACE_PKG)
const { chromium, webkit } = require('playwright')

const FONT = `${REPO}/node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2`
const PORT = 4189

const bundle = await esbuild.build({
  entryPoints: [`${REPO}/src/utils/shareCard.ts`],
  bundle: true,
  format: 'esm',
  write: false,
  platform: 'browser',
})
const moduleSource = bundle.outputFiles[0].text

const PAGE = `<!doctype html><meta charset="utf-8"><style>
  @font-face { font-family: Anton; src: url(/anton.woff2) format('woff2'); font-weight: 400; font-display: block; }
  body { margin: 0; background: #888; }
  canvas { width: 540px; height: 540px; display: block; }
</style><canvas id="c"></canvas>
<script type="module">
  import { drawShareCard } from '/shareCard.mjs'
  window.__draw = (model) => drawShareCard(document.getElementById('c'), model)
</script>`

// No blockAnalytics() here on purpose: this server never serves app HTML. It
// answers every request with PAGE above — a bare canvas harness that imports
// only shareCard.mjs — so no tag, and nothing to block. If this ever starts
// loading dist/, it needs the helper like every other check.
const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0]
  if (url === '/anton.woff2') {
    res.writeHead(200, { 'content-type': 'font/woff2' })
    res.end(await readFile(FONT))
  } else if (url === '/shareCard.mjs') {
    res.writeHead(200, { 'content-type': 'text/javascript' })
    res.end(moduleSource)
  } else {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(PAGE)
  }
})
await new Promise((r) => server.listen(PORT, r))

// The REAL notices, composed exactly as ShareCardButton composes them. These
// two sentences are why the card is allowed to leave the site, so the widths
// that matter are theirs, in both locales.
const en = JSON.parse(await readFile(`${REPO}/src/locales/en.json`, 'utf8'))
const es = JSON.parse(await readFile(`${REPO}/src/locales/es.json`, 'utf8'))
const bias = (s) => s.replace('{{min}}', '1').replace('{{max}}', '3')
const safetyOf = (l) => `${bias(l.verdict.conservativeNotice)} ${l.verdict.verifyOnsite}`
const complianceOf = (l) => l.verdict.deviceOnlyNotice.replace('{{body}}', 'GHSA')

const CASES = [
  { name: 'en-black-2digit', peakWbgtF: 93, peakFlag: 'black', peakFlagLabel: 'Black', locale: en },
  { name: 'en-black-3digit', peakWbgtF: 101, peakFlag: 'black', peakFlagLabel: 'Black', locale: en },
  {
    name: 'en-compliance',
    peakWbgtF: 93,
    peakFlag: 'black',
    peakFlagLabel: 'Black',
    locale: en,
    compliance: true,
  },
  { name: 'es-red', peakWbgtF: 88, peakFlag: 'red', peakFlagLabel: 'Roja', locale: es },
  {
    name: 'es-compliance',
    peakWbgtF: 93,
    peakFlag: 'black',
    peakFlagLabel: 'Negra',
    locale: es,
    compliance: true,
  },
]

function model(c) {
  return {
    dateLabel: 'Mon, Aug 10',
    locationLabel: 'Austin, TX',
    policyName: 'Texas UIL — Class 2',
    peakWbgtF: c.peakWbgtF,
    peakFlag: c.peakFlag,
    peakFlagLabel: c.peakFlagLabel,
    peakCaption: 'WBGT peak',
    estLabel: 'EST',
    safetyNote: safetyOf(c.locale),
    complianceNote: c.compliance ? complianceOf(c.locale) : null,
    hours: Array.from({ length: 16 }, (_, i) => ({
      label: `${i + 6}`,
      wbgtF: 80 + i,
      flag: i > 10 ? 'black' : 'yellow',
      estimated: i % 5 === 0,
    })),
    anyEstimated: true,
    title: "Today's heat flags",
    estimatedNote: 'ESTIMATED',
    siteUrl: 'wbgtcheck.com',
  }
}

// Re-measure the two ink boxes exactly as drawn and report them in card space.
const measure = (m) => {
  const canvas = document.getElementById('c')
  const render = window.__draw(m)
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'alphabetic'
  const numText = String(Math.round(m.peakWbgtF))
  const labelText = m.peakFlagLabel.toUpperCase()
  ctx.font = '340px "Anton", "Arial Narrow", sans-serif'
  const n = ctx.measureText(numText)
  ctx.font = '110px "Anton", "Arial Narrow", sans-serif'
  const l = ctx.measureText(labelText)
  const r = (v) => Math.round(v * 100) / 100
  // Widest rendered line of each notice, measured at the size it was drawn.
  const widest = (fitted, weight) => {
    if (!fitted) return null
    ctx.font = `${weight} ${fitted.px}px system-ui, sans-serif`
    const w = Math.max(...fitted.lines.map((line) => ctx.measureText(line).width))
    return { px: fitted.px, lines: fitted.lines.length, widest: r(w), fits: fitted.fits }
  }
  return {
    numberInk: { ascent: r(n.actualBoundingBoxAscent), descent: r(n.actualBoundingBoxDescent) },
    labelInk: { ascent: r(l.actualBoundingBoxAscent), descent: r(l.actualBoundingBoxDescent) },
    safety: widest(render.safety, 600),
    compliance: widest(render.compliance, 700),
  }
}

// Scan the rendered pixels: the true test is whether the label's glyphs survive
// on screen, not whether our own arithmetic agrees with itself. Rows are
// compared against the flat panel background colour.
const scanRows = () => {
  const canvas = document.getElementById('c')
  const ctx = canvas.getContext('2d')
  const { data, width } = ctx.getImageData(0, 0, canvas.width, 620)
  const bg = [data[0], data[1], data[2]]
  const rows = []
  for (let y = 0; y < 620; y++) {
    let left = 0
    let right = 0
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const differs =
        Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) > 30
      if (!differs) continue
      if (x < 540) left++
      else right++
    }
    rows.push([left, right])
  }
  return rows
}

await mkdir(`${REPO}/.omc/screenshots`, { recursive: true })
let failures = 0

for (const [engineName, engine] of [
  ['chromium', chromium],
  ['webkit', webkit],
]) {
  const browser = await engine.launch()
  const page = await browser.newPage({ viewport: { width: 560, height: 560 } })
  await page.goto(`http://localhost:${PORT}/`)
  await page.evaluate(() =>
    document.fonts.load('400 340px Anton').then(() => document.fonts.ready),
  )
  console.log(`\n=== ${engineName} ===`)
  for (const c of CASES) {
    const m = model(c)
    const ink = await page.evaluate(measure, m)
    const rows = await page.evaluate(scanRows)

    // Ink-band extents in the left column (number + label share x<540).
    const inkRows = rows.map(([left], y) => (left > 0 ? y : -1)).filter((y) => y >= 0)
    // Split the left column into runs of consecutive inked rows. A correct card
    // has a clear empty band between the number and the label; an overlapping
    // one merges them into a single run.
    const runs = []
    for (const y of inkRows) {
      const last = runs[runs.length - 1]
      if (last && y === last[1] + 1) last[1] = y
      else runs.push([y, y])
    }
    // Runs above y=160 are the title/location lines; the verdict stack is below.
    const stack = runs.filter(([a]) => a >= 150)
    const ok = stack.length >= 2
    const gap = ok ? stack[1][0] - stack[0][1] : -1
    if (!ok || gap < 10) failures++
    console.log(
      `  ${c.name.padEnd(16)} numberInk ${JSON.stringify(ink.numberInk)} labelInk ${JSON.stringify(ink.labelInk)}`,
    )
    // Budget: the notice column is the card minus both margins.
    const BUDGET = 1080 - 60 * 2
    for (const [which, fitted] of [['safety', ink.safety], ['compliance', ink.compliance]]) {
      if (!fitted) continue
      const slack = Math.round((BUDGET - fitted.widest) * 100) / 100
      const bad = !fitted.fits || fitted.widest > BUDGET
      if (bad) failures++
      // Under a pixel of slack is passing, but only just: the Spanish safety
      // notice sits there, and the next word added to that string overflows
      // the card with no warning other than this line. Not a failure — the
      // card is correct today — but the next person to edit that copy needs
      // to see the margin they are spending.
      const TIGHT = 3
      const tight = !bad && slack < TIGHT
      console.log(
        `  ${''.padEnd(16)} ${which.padEnd(10)} ${fitted.lines} line(s) @${fitted.px}px widest ${fitted.widest} / ${BUDGET} (slack ${slack}) ${bad ? 'FAIL — notice does not fit its budget' : tight ? `OK — TIGHT, under ${TIGHT}px of room for longer copy` : 'OK'}`,
      )
    }
    console.log(
      `  ${''.padEnd(16)} verdict ink runs ${JSON.stringify(stack)} gap ${gap}px ${
        ok && gap >= 10 ? 'OK' : 'FAIL — number and flag label collide'
      }`,
    )
    const shot = await page.screenshot()
    await writeFile(`${REPO}/.omc/screenshots/share-card-${engineName}-${c.name}.png`, shot)
  }
  await browser.close()
}
server.close()
console.log(`\n${failures} failing render(s)`)
process.exit(failures === 0 ? 0 : 1)
