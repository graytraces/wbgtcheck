import { fileURLToPath as __fileURLToPath } from 'node:url'
import __nodePath from 'node:path'

// Paths are derived from this file so the script runs from any cwd.
const __HERE = __nodePath.dirname(__fileURLToPath(import.meta.url))
const REPO = __nodePath.resolve(__HERE, '..')
const WORKSPACE = __nodePath.resolve(REPO, '..')
const WORKSPACE_PKG = __nodePath.join(WORKSPACE, 'package.json')

/**
 * gen-og-image.mjs — draws public/og-{lang}.png, the card every share of this
 * site renders as.
 *
 *   node scripts/gen-og-image.mjs
 *
 * Not part of `npm run build`. The output is a committed asset, because it
 * changes only when the copy or the palette does, and a build step that needs
 * a browser is a build step that breaks on the CI that does not have one.
 * Re-run it by hand after either changes; src/__tests__/ogImage.test.ts holds
 * the committed files to the dimensions the meta tags advertise.
 *
 * Why a card and not a screenshot: this site's one viral mechanic is a coach
 * dropping a verdict into a team chat, and until now every one of those
 * renders — every Slack, iMessage, WhatsApp, Discord and Facebook unfurl of
 * every page — was a bare blue link. A screenshot of the tool would show a
 * verdict for somebody else's field, which is the one thing this product must
 * never appear to do. So the card shows the LADDER, not a reading: the five
 * flags, colour + icon + label, which is what the site is for and is true on
 * every day of the year.
 *
 * Everything on it is read from something that already exists — the flag hex
 * values from src/index.css, the five icon paths from src/utils/shareCard.ts,
 * the labels and the two lines of copy from the locale JSON — so there is no
 * second copy of the palette or the glyphs to drift.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(WORKSPACE_PKG)
const { chromium } = require('playwright')

const WIDTH = 1200
const HEIGHT = 630
const LANGS = ['en', 'es']
const FLAGS = ['green', 'yellow', 'orange', 'red', 'black']

const read = (rel) => readFileSync(__nodePath.join(REPO, rel), 'utf-8')

/** Flag palette, straight out of the @theme block the app renders from. */
function palette() {
  const css = read('src/index.css')
  const pick = (name) => {
    const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8});`))
    if (!m) throw new Error(`gen-og-image: --color-${name} not found in src/index.css`)
    return m[1]
  }
  const out = {}
  for (const flag of FLAGS) out[flag] = { bg: pick(`flag-${flag}`), fg: pick(`on-flag-${flag}`) }
  return {
    flags: out,
    bg: pick('bg'),
    // The card is always the dark surface, so ink/muted are read from the
    // .dark block rather than the light default the @theme sets.
    ink: css.match(/\.dark\s*\{[\s\S]*?--color-ink:\s*(#[0-9a-fA-F]{3,8});/)[1],
    inkMuted: css.match(/\.dark\s*\{[\s\S]*?--color-ink-muted:\s*(#[0-9a-fA-F]{3,8});/)[1],
    surface: css.match(/\.dark\s*\{[\s\S]*?--color-bg:\s*(#[0-9a-fA-F]{3,8});/)[1],
  }
}

/**
 * The five flag glyphs, lifted from the share card rather than re-typed.
 * shareCard.ts holds them as canvas Path2D strings in the same 24×24 space an
 * <svg viewBox="0 0 24 24"> uses, so they transplant unchanged. Extraction is
 * asserted, not assumed: a rename in shareCard.ts fails this script instead of
 * quietly producing a card with no icons on it.
 */
function flagIconPaths() {
  const src = read('src/utils/shareCard.ts')
  const octagon = src.match(/const OCTAGON = '([^']+)'/)?.[1]
  const block = src.match(/const FLAG_ICON_PATHS[^=]*=\s*\{([\s\S]*?)\n\}/)?.[1]
  if (!octagon || !block) {
    throw new Error('gen-og-image: could not read FLAG_ICON_PATHS from src/utils/shareCard.ts')
  }
  const out = {}
  for (const flag of FLAGS) {
    const entry = block.match(new RegExp(`\\n  ${flag}: (\\[[\\s\\S]*?\\]),`))?.[1]
    if (!entry) throw new Error(`gen-og-image: no icon paths for ${flag}`)
    const paths = [...entry.matchAll(/'([^']+)'/g)].map((m) =>
      m[1] === 'OCTAGON' ? octagon : m[1],
    )
    // The literal is written as `[OCTAGON, …]` for three of the five, so the
    // bare identifier has to be substituted too.
    const withIdents = entry.includes('OCTAGON') && !entry.includes("'OCTAGON'")
      ? [octagon, ...paths]
      : paths
    if (withIdents.length === 0) throw new Error(`gen-og-image: empty icon path list for ${flag}`)
    out[flag] = withIdents
  }
  return out
}

const dataUri = (rel) =>
  `data:font/woff2;base64,${readFileSync(__nodePath.join(REPO, rel)).toString('base64')}`

function iconSvg(flag, paths, color) {
  // green is a check inside a circle; the circle is an arc on canvas and a
  // <circle> here — same geometry, different notation.
  const ring = flag === 'green' ? '<circle cx="12" cy="12" r="10" />' : ''
  const d = paths.map((p) => `<path d="${p}" />`).join('')
  return `<svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="${color}"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ring}${d}</svg>`
}

function cardHtml(lang, locale, pal, icons, fonts) {
  const esc = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const strip = FLAGS.map((flag) => {
    const { bg, fg } = pal.flags[flag]
    return `<div class="chip" style="background:${bg};color:${fg}">
      ${iconSvg(flag, icons[flag], fg)}
      <span class="chip-label">${esc(locale.flags[flag].label)}</span>
    </div>`
  }).join('')

  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
    @font-face { font-family: Anton; font-weight: 400; font-display: block;
      src: url(${fonts.latin}) format('woff2'); unicode-range: U+0000-00FF, U+2000-206F, U+2122; }
    @font-face { font-family: Anton; font-weight: 400; font-display: block;
      src: url(${fonts.latinExt}) format('woff2'); unicode-range: U+0100-024F, U+1E00-1EFF; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: ${WIDTH}px; height: ${HEIGHT}px; background: ${pal.surface};
      color: ${pal.ink}; font-family: system-ui, sans-serif; overflow: hidden; }
    .card { width: 100%; height: 100%; padding: 56px 60px 52px;
      display: flex; flex-direction: column; justify-content: space-between; }
    .brand { display: flex; align-items: center; gap: 18px; }
    .mark { width: 72px; height: 72px; background: ${pal.flags.orange.bg};
      color: ${pal.flags.orange.fg}; display: flex; align-items: center; justify-content: center; }
    .wordmark { font-family: Anton, sans-serif; font-size: 54px; line-height: 0.9;
      letter-spacing: -0.01em; text-transform: uppercase; }
    .url { margin-left: auto; font-family: Anton, sans-serif; font-size: 34px;
      letter-spacing: -0.01em; color: ${pal.inkMuted}; }
    h1 { font-family: Anton, sans-serif; font-size: 82px; line-height: 0.94;
      letter-spacing: -0.015em; text-transform: uppercase; max-width: 1010px; }
    .sub { margin-top: 20px; font-size: 32px; font-weight: 600; line-height: 1.25;
      color: ${pal.inkMuted}; max-width: 960px; }
    .strip { display: flex; gap: 8px; }
    /* The ring is the black flag's whole edge: #101418 on a #0c0f14 card is a
       4-point luminance difference, so without it the fifth chip reads as a
       gap in the strip and the ladder appears to stop at RED — on the card
       whose entire job is to show that the ladder has a top. Drawn in each
       chip's own on-colour so it is one rule rather than a special case. */
    .chip { flex: 1; height: 108px; display: flex; align-items: center;
      justify-content: center; gap: 12px; box-shadow: inset 0 0 0 2px currentColor; }
    .chip-label { font-family: Anton, sans-serif; font-size: 34px; line-height: 1;
      letter-spacing: -0.01em; }
  </style></head><body><div class="card">
    <div class="brand">
      <span class="mark"><svg viewBox="0 0 24 24" width="42" height="42" fill="none"
        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
        ><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/></svg></span>
      <span class="wordmark">${esc(locale.common.siteName)}</span>
      <span class="url">wbgtcheck.com</span>
    </div>
    <div>
      <h1>${esc(locale.seo.ogCard.headline)}</h1>
      <p class="sub">${esc(locale.seo.ogCard.subhead)}</p>
    </div>
    <div class="strip">${strip}</div>
  </div></body></html>`
}

const pal = palette()
const icons = flagIconPaths()
const fonts = {
  latin: dataUri('node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2'),
  latinExt: dataUri('node_modules/@fontsource/anton/files/anton-latin-ext-400-normal.woff2'),
}

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
})
// This page loads nothing off the network — fonts are inlined — but the abort
// is kept so a future edit that reaches for a CDN cannot quietly start
// counting the operator as a visitor.
await context.route(/googletagmanager\.com|google-analytics\.com/, (r) => r.abort())
const page = await context.newPage()

for (const lang of LANGS) {
  const locale = JSON.parse(read(`src/locales/${lang}.json`))
  await page.setContent(cardHtml(lang, locale, pal, icons, fonts), { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  const buffer = await page.screenshot({
    type: 'png',
    clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
  })
  const out = __nodePath.join(REPO, 'public', `og-${lang}.png`)
  writeFileSync(out, buffer)
  console.log(
    `✓ public/og-${lang}.png  ${WIDTH}×${HEIGHT}  ${(buffer.length / 1024).toFixed(1)} KB`,
  )
}

await context.close()
await browser.close()
