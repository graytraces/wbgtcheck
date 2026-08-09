import { describe, it, expect } from 'vitest'
import { buildShareCardModel, layoutVerdictBlock, fitText } from '../utils/shareCard'
import { annotateHours, groupByDay } from '../utils/verdict'
import type { HourPoint } from '../utils/nws'
import { UIL_CLASS_3, classifyWbgt } from '../data/policyOracle'

// 2026-08-10 06:00 local (CDT)
const DAY_START = Date.parse('2026-08-10T11:00:00+00:00')
const HOUR = 3600_000

function point(hourOffset: number, wbgtF: number, source: 'nws' | 'estimated' = 'nws'): HourPoint {
  return { time: DAY_START + hourOffset * HOUR, wbgtF, source, tempF: null }
}

const OPTS = {
  locationLabel: 'Austin, TX',
  policyName: 'Texas UIL — Class 3',
  peakFlagLabel: 'RED',
  peakCaption: 'WBGT peak',
  estLabel: 'EST',
  safetyNote: 'Remote estimates read LOW vs on-site meters. Confirm on site.',
  complianceNote: null as string | null,
  title: "Today's heat flags",
  estimatedNote: 'ESTIMATED',
  lang: 'en',
}

describe('share card model', () => {
  it('builds the hourly band with flags from the oracle and marks estimates', () => {
    const points = [point(0, 78), point(6, 91, 'estimated'), point(8, 85)]
    const day = groupByDay(annotateHours(points, UIL_CLASS_3, 'America/Chicago'))[0]
    const model = buildShareCardModel(day, OPTS)!
    expect(model).not.toBeNull()
    expect(model.peakWbgtF).toBe(91)
    expect(model.peakFlag).toBe(classifyWbgt(UIL_CLASS_3, 91).flag)
    expect(model.hours).toHaveLength(3)
    expect(model.hours[1]).toMatchObject({ label: '12p', estimated: true })
    expect(model.anyEstimated).toBe(true)
    expect(model.siteUrl).toBe('wbgtcheck.com')
  })

  it('always carries the safety note and the localized labels (card leaves the site)', () => {
    const day = groupByDay(annotateHours([point(6, 91)], UIL_CLASS_3, 'America/Chicago'))[0]
    const model = buildShareCardModel(day, OPTS)!
    expect(model.safetyNote).toBe(OPTS.safetyNote)
    expect(model.safetyNote.length).toBeGreaterThan(0)
    expect(model.peakCaption).toBe('WBGT peak')
    expect(model.estLabel).toBe('EST')
    expect(model.complianceNote).toBeNull()
  })

  it('carries the compliance warning for device-required policies', () => {
    const day = groupByDay(annotateHours([point(6, 85)], UIL_CLASS_3, 'America/Chicago'))[0]
    const compliance = 'GHSA requires an on-site instrument. Not a compliance tool.'
    const model = buildShareCardModel(day, { ...OPTS, complianceNote: compliance })!
    expect(model.complianceNote).toBe(compliance)
  })

  it('keeps only the 6:00-21:00 planning window when full-day data exists', () => {
    const points = Array.from({ length: 24 }, (_, i) => point(i - 6, 80))
    const day = groupByDay(annotateHours(points, UIL_CLASS_3, 'America/Chicago'))[0]
    const model = buildShareCardModel(day, OPTS)!
    expect(model.hours).toHaveLength(16)
    expect(model.hours[0].label).toBe('6a')
    expect(model.hours[15].label).toBe('9p')
  })

  it('returns null when the day has no data', () => {
    expect(buildShareCardModel({ date: '2026-08-10', peak: null, hours: [] }, OPTS)).toBeNull()
  })
})

/**
 * Anton ink boxes relative to the ALPHABETIC baseline, measured 2026-08-10 in
 * both Playwright engines (webkit-2287 and chromium-1234). The two agree to
 * 0.01px — which is the whole reason the verdict block is anchored here.
 *
 * The same glyphs measured from `textBaseline = 'top'` disagree by 134px:
 * WebKit places that origin a full 400px above the alphabetic baseline where
 * Chromium places it 265.67px above. The card used to draw at fixed 'top'
 * coordinates, so in WebKit the 340px number's ink ran from y295 to y593 and
 * swallowed the 110px flag label (ink from y512) whole — "BLACK" was
 * unreadable in every Safari and iOS share, while Chromium cleared it by 10px
 * and showed nothing wrong. `.omc/share-card-engine-check.mjs` re-renders the
 * real card in both engines and scans the pixels.
 */
const ANTON_NUMBER_340 = { ascent: 294.84, descent: 2.66 }
const ANTON_LABEL_110 = { ascent: 95.39, descent: 0.86 }
/** Height of the flag-coloured panel drawShareCard paints behind the block. */
const VERDICT_PANEL_H = 620

describe('share card verdict layout', () => {
  it('keeps the peak number clear of the flag label', () => {
    const layout = layoutVerdictBlock(ANTON_NUMBER_340, ANTON_LABEL_110)
    expect(layout.numberScale).toBe(1)
    expect(layout.numberInkBottom).toBeLessThan(layout.labelInkTop)
    expect(layout.gap).toBeGreaterThanOrEqual(24)
  })

  it('pins the ink positions both engines now render', () => {
    const layout = layoutVerdictBlock(ANTON_NUMBER_340, ANTON_LABEL_110)
    expect(Math.round(layout.numberInkTop)).toBe(168)
    expect(Math.round(layout.numberInkBottom)).toBe(466)
    expect(Math.round(layout.labelInkTop)).toBe(500)
    expect(layout.labelInkBottom).toBe(596)
  })

  it('keeps both ink boxes inside the coloured verdict panel', () => {
    const layout = layoutVerdictBlock(ANTON_NUMBER_340, ANTON_LABEL_110)
    expect(layout.numberInkTop).toBeGreaterThan(0)
    expect(layout.labelInkBottom).toBeLessThanOrEqual(VERDICT_PANEL_H)
  })

  it('shrinks the number rather than letting a taller face collide', () => {
    // Twice Anton's ink. No real face does this — the point is that the stack
    // degrades by giving up number size, never by overlapping the label.
    const tall = { ascent: ANTON_NUMBER_340.ascent * 2, descent: ANTON_NUMBER_340.descent * 2 }
    const layout = layoutVerdictBlock(tall, ANTON_LABEL_110)
    expect(layout.numberScale).toBeLessThan(1)
    expect(layout.numberInkBottom).toBeLessThan(layout.labelInkTop)
    expect(layout.gap).toBeGreaterThanOrEqual(24 - 1e-9)
  })
})

/**
 * Footer notice fitting.
 *
 * The old wrapper pushed all leftover text onto the final line and drew it
 * with `fillText(..., maxWidth)`, which horizontally compresses glyphs — no
 * clipping, no warning, just unreadable text. Measured in both engines on
 * 2026-08-10, the Spanish safety note cleared its 960px budget by 0.41px, so a
 * copy edit of a few characters would have shipped the conservative-bias and
 * verify-on-site sentences squashed. Those two are the reason the card is
 * allowed to leave the site.
 *
 * A fake context measures a fixed width per character, which makes wrapping
 * deterministic without a canvas.
 */
function fakeCtx(pxPerCharAt1px = 0.6) {
  let px = 24
  return {
    set font(value: string) {
      px = Number(/(\d+(?:\.\d+)?)px/.exec(value)?.[1] ?? 24)
    },
    get font() {
      return `${px}px test`
    },
    measureText(text: string) {
      return { width: text.length * px * pxPerCharAt1px } as TextMetrics
    },
  } as unknown as CanvasRenderingContext2D
}

const font = (px: number) => `600 ${px}px system-ui, sans-serif`

describe('share card notice fitting', () => {
  it('keeps the nominal size when the text already fits', () => {
    const fitted = fitText(fakeCtx(), 'short note', 960, 3, font, 24, 17)
    expect(fitted.fits).toBe(true)
    expect(fitted.px).toBe(24)
    expect(fitted.lines.length).toBeLessThanOrEqual(3)
  })

  it('shrinks rather than squashing when the budget is tight', () => {
    // Long enough to need four lines at 24px, which must become three smaller.
    const long = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ')
    const fitted = fitText(fakeCtx(), long, 960, 3, font, 24, 17)
    expect(fitted.fits).toBe(true)
    expect(fitted.px).toBeLessThan(24)
    expect(fitted.lines.length).toBeLessThanOrEqual(3)
    // Nothing is dropped: every word survives the wrap.
    expect(fitted.lines.join(' ').split(' ')).toHaveLength(40)
  })

  it('reports failure instead of silently overflowing at the floor', () => {
    const absurd = Array.from({ length: 400 }, (_, i) => `word${i}`).join(' ')
    const fitted = fitText(fakeCtx(), absurd, 960, 3, font, 24, 17)
    expect(fitted.fits).toBe(false)
    expect(fitted.px).toBe(17)
    // Still no truncation — the caller decides, and the text is all there.
    expect(fitted.lines.join(' ').split(' ')).toHaveLength(400)
  })

  it('never returns a line wider than the budget it was given', () => {
    const ctx = fakeCtx()
    const long = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ')
    const fitted = fitText(ctx, long, 960, 3, font, 24, 17)
    ctx.font = font(fitted.px)
    for (const line of fitted.lines) {
      // Single words longer than the budget are the one unavoidable exception.
      if (line.includes(' ')) expect(ctx.measureText(line).width).toBeLessThanOrEqual(960)
    }
  })
})
