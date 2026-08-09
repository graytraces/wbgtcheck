import type { FlagColor } from '../data/policyOracle'
import type { DaySummary, HourVerdict } from './verdict'
import { timelineHours } from './verdict'
import { FLAG_HEX } from './flagStyles'

/**
 * Share card: a 1080×1080 PNG for the team group chat. The day's peak flag
 * color is the background — the verdict reads before any text does — with the
 * hourly flag band, the safety notices (this card is the only artifact that
 * leaves the site, so the conservative-bias and verify-on-site lines always
 * travel with it), date, location and site URL. Drawing is split from data
 * prep so the model is unit-testable without a canvas.
 */

export const SHARE_CARD_SIZE = 1080

export interface ShareCardHour {
  label: string
  wbgtF: number
  flag: FlagColor
  estimated: boolean
}

export interface ShareCardModel {
  dateLabel: string
  locationLabel: string
  policyName: string
  peakWbgtF: number
  peakFlag: FlagColor
  peakFlagLabel: string
  /** Localized caption under the big number (e.g. "WBGT PEAK"). */
  peakCaption: string
  /** Localized short marker on estimated hour blocks (e.g. "EST"). */
  estLabel: string
  /** Always present: conservative-bias + verify-on-site line. */
  safetyNote: string
  /** Device-only states (e.g. GHSA): not-a-compliance-tool warning. */
  complianceNote: string | null
  hours: ShareCardHour[]
  anyEstimated: boolean
  title: string
  estimatedNote: string
  siteUrl: string
}

function hourLabel(h: number): string {
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

export function buildShareCardModel(
  day: DaySummary,
  opts: {
    locationLabel: string
    policyName: string
    peakFlagLabel: string
    peakCaption: string
    estLabel: string
    safetyNote: string
    complianceNote: string | null
    title: string
    estimatedNote: string
    lang: string
  },
): ShareCardModel | null {
  if (!day.peak) return null
  const windowHours: HourVerdict[] = timelineHours(day)
  const hours = (windowHours.length > 0 ? windowHours : day.hours).map((h) => ({
    label: hourLabel(h.localHour),
    wbgtF: h.wbgtF,
    flag: h.flag,
    estimated: h.source === 'estimated',
  }))
  const dateLabel = new Intl.DateTimeFormat(opts.lang, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${day.date}T12:00:00`))
  return {
    dateLabel,
    locationLabel: opts.locationLabel,
    policyName: opts.policyName,
    peakWbgtF: day.peak.wbgtF,
    peakFlag: day.peak.flag,
    peakFlagLabel: opts.peakFlagLabel,
    peakCaption: opts.peakCaption,
    estLabel: opts.estLabel,
    safetyNote: opts.safetyNote,
    complianceNote: opts.complianceNote,
    hours,
    anyEstimated: hours.some((h) => h.estimated),
    title: opts.title,
    estimatedNote: opts.estimatedNote,
    siteUrl: 'wbgtcheck.com',
  }
}

/**
 * Verdict-block geometry.
 *
 * `textBaseline = 'top'` is not a fixed origin across engines. Measured
 * 2026-08-10 (playwright 1.60, webkit-2287 vs chromium-1234) for Anton at
 * 340px, the 'top' origin sits 400px above the alphabetic baseline in WebKit
 * and 265.67px above it in Chromium — a 134px disagreement. Fixed 'top'
 * coordinates therefore dropped the big number that much lower in WebKit,
 * where its ink ran to y593 and buried the flag label (ink from y512) under
 * it: "BLACK" was unreadable in every Safari and iOS share. Chromium cleared
 * it by 10px, which is why only WebKit shows the bug.
 *
 * Both engines report the ink box relative to the ALPHABETIC baseline
 * identically, so every piece of display type below is placed from measured
 * ink: the number hangs from a fixed ink top, the flag label stands on a fixed
 * ink bottom, and the gap between them absorbs whatever the font does.
 */
const NUMBER_INK_TOP = 168
const LABEL_INK_BOTTOM = 596
/** Ink boxes never come closer than this; the number shrinks if they would. */
const MIN_INK_GAP = 24
const NUMBER_PX = 340
const UNIT_PX = 84
const LABEL_PX = 110
const ICON_PX = 132
/** Ink-top offsets from the number's ink top, in unscaled number-size units. */
const UNIT_INK_DROP = 65
const CAPTION_INK_DROP = 164
/**
 * Anton's own ink ratios (measured with the alphabetic baseline at 340px:
 * ascent 294.84, descent 2.66). Used only when an engine declines to report
 * an ink box, so the stack still clears instead of collapsing to NaN.
 */
const ANTON_INK_ASCENT_RATIO = 294.84 / 340
const ANTON_INK_DESCENT_RATIO = 2.66 / 340

/** An ink box relative to the alphabetic baseline: ascent up, descent down. */
export interface InkExtent {
  ascent: number
  descent: number
}

export interface VerdictLayout {
  /** Applied to the number (and its unit/caption offsets) when space is tight. */
  numberScale: number
  numberBaselineY: number
  numberInkTop: number
  numberInkBottom: number
  labelBaselineY: number
  labelInkTop: number
  labelInkBottom: number
  iconY: number
  /** Vertical clearance between the two ink boxes. Must stay positive. */
  gap: number
}

/**
 * Stack the peak number above the flag label from their measured ink. The
 * label is the anchor (fixed ink bottom, so it always sits inside the coloured
 * panel); the number hangs from the top and gives up size if the two would
 * meet.
 */
export function layoutVerdictBlock(number: InkExtent, label: InkExtent): VerdictLayout {
  const labelInkH = Math.max(label.ascent + label.descent, 0)
  const numberInkH = Math.max(number.ascent + number.descent, 0)
  const room = LABEL_INK_BOTTOM - NUMBER_INK_TOP - labelInkH - MIN_INK_GAP
  const fit = numberInkH > 0 ? room / numberInkH : 1
  const numberScale = Math.min(1, Math.max(0.5, fit))
  const numberBaselineY = NUMBER_INK_TOP + number.ascent * numberScale
  const numberInkBottom = numberBaselineY + number.descent * numberScale
  const labelBaselineY = LABEL_INK_BOTTOM - label.descent
  const labelInkTop = labelBaselineY - label.ascent
  return {
    numberScale,
    numberBaselineY,
    numberInkTop: NUMBER_INK_TOP,
    numberInkBottom,
    labelBaselineY,
    labelInkTop,
    labelInkBottom: LABEL_INK_BOTTOM,
    iconY: labelInkTop + (labelInkH - ICON_PX) / 2,
    gap: labelInkTop - numberInkBottom,
  }
}

/** Ink box of `text` in the current font. Requires `textBaseline` alphabetic. */
function inkExtent(ctx: CanvasRenderingContext2D, text: string, px: number): InkExtent {
  const m = ctx.measureText(text)
  if (!Number.isFinite(m.actualBoundingBoxAscent) || !Number.isFinite(m.actualBoundingBoxDescent)) {
    return { ascent: px * ANTON_INK_ASCENT_RATIO, descent: px * ANTON_INK_DESCENT_RATIO }
  }
  return { ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent }
}

// Lucide-derived stroke geometry (24×24 space) so the card keeps the same
// triple coding (color + icon + label) as every in-app flag surface.
const OCTAGON = 'M7.05 2h9.9L22 7.05v9.9L16.95 22h-9.9L2 16.95v-9.9L7.05 2Z'
const FLAG_ICON_PATHS: Record<FlagColor, string[]> = {
  green: ['m9 12 2 2 4-4'], // + circle drawn via arc below
  yellow: [
    'M21.73 18 13.73 4a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 20h16a2 2 0 0 0 1.73-2Z',
    'M12 9v4',
    'M12 17h.01',
  ],
  orange: [OCTAGON, 'M12 7v5', 'M12 16h.01'],
  red: [
    'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  ],
  black: [OCTAGON, 'm15 9-6 6', 'm9 9 6 6'],
}

function drawFlagIcon(
  ctx: CanvasRenderingContext2D,
  flag: FlagColor,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 24, size / 24)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (flag === 'green') {
    ctx.beginPath()
    ctx.arc(12, 12, 10, 0, Math.PI * 2)
    ctx.stroke()
  }
  for (const d of FLAG_ICON_PATHS[flag]) {
    ctx.stroke(new Path2D(d))
  }
  ctx.restore()
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
      if (lines.length === maxLines - 1) break
    } else {
      line = candidate
    }
  }
  if (line) {
    const rest = words.slice(lines.join(' ').split(' ').filter(Boolean).length).join(' ')
    lines.push(lines.length === maxLines - 1 ? rest : line)
  }
  return lines.slice(0, maxLines)
}

export function drawShareCard(canvas: HTMLCanvasElement, model: ShareCardModel): void {
  const S = SHARE_CARD_SIZE
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const peak = FLAG_HEX[model.peakFlag]
  const display = (px: number) => `${px}px "Anton", "Arial Narrow", sans-serif`
  const sans = (px: number, weight = 700) => `${weight} ${px}px system-ui, sans-serif`
  const margin = 60

  // Base paint FIRST — without it ~6% of pixels ship alpha-0 and the PNG
  // inherits whatever theme the chat client renders behind it.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, S, S)

  // Verdict block — peak flag color owns the top of the card
  ctx.fillStyle = peak.bg
  ctx.fillRect(0, 0, S, 620)

  ctx.fillStyle = peak.fg
  ctx.textBaseline = 'top'
  ctx.font = sans(34)
  ctx.textAlign = 'left'
  ctx.fillText(model.title.toUpperCase(), margin, 48)
  ctx.textAlign = 'right'
  ctx.fillText(model.dateLabel, S - margin, 48)

  ctx.textAlign = 'left'
  ctx.font = sans(40)
  ctx.fillText(model.locationLabel, margin, 108, S - margin * 2)

  // Display type is placed from measured ink (see layoutVerdictBlock) — fixed
  // 'top' coordinates put the number 134px lower in WebKit than in Chromium.
  const numText = String(Math.round(model.peakWbgtF))
  const labelText = model.peakFlagLabel.toUpperCase()
  ctx.textBaseline = 'alphabetic'
  ctx.font = display(NUMBER_PX)
  const numInk = inkExtent(ctx, numText, NUMBER_PX)
  ctx.font = display(LABEL_PX)
  const labelInk = inkExtent(ctx, labelText, LABEL_PX)
  const layout = layoutVerdictBlock(numInk, labelInk)

  const scale = layout.numberScale
  ctx.font = display(NUMBER_PX * scale)
  ctx.fillText(numText, 48, layout.numberBaselineY)
  const numWidth = ctx.measureText(numText).width

  ctx.font = display(UNIT_PX * scale)
  const unitInk = inkExtent(ctx, '°F', UNIT_PX * scale)
  ctx.fillText('°F', 64 + numWidth, layout.numberInkTop + UNIT_INK_DROP * scale + unitInk.ascent)

  ctx.font = sans(34)
  const captionText = model.peakCaption.toUpperCase()
  const captionInk = inkExtent(ctx, captionText, 34)
  ctx.fillText(
    captionText,
    64 + numWidth,
    layout.numberInkTop + CAPTION_INK_DROP * scale + captionInk.ascent,
  )

  ctx.font = display(LABEL_PX)
  ctx.fillText(labelText, margin, layout.labelBaselineY)
  drawFlagIcon(ctx, model.peakFlag, S - margin - ICON_PX, layout.iconY, ICON_PX, peak.fg)
  ctx.textBaseline = 'top'

  // Hourly flag band on the white base
  const bandTop = 660
  const bandH = 130
  const n = model.hours.length
  if (n > 0) {
    const w = (S - margin * 2) / n
    model.hours.forEach((h, i) => {
      const hex = FLAG_HEX[h.flag]
      const x = margin + i * w
      ctx.fillStyle = hex.bg
      ctx.fillRect(x, bandTop, Math.ceil(w) - 2, bandH)
      ctx.fillStyle = hex.fg
      ctx.textAlign = 'center'
      ctx.font = sans(30)
      ctx.fillText(String(Math.round(h.wbgtF)), x + w / 2, bandTop + 36)
      if (h.estimated) {
        ctx.font = sans(20)
        ctx.fillText(model.estLabel, x + w / 2, bandTop + 84)
      }
      ctx.fillStyle = '#4c5866'
      ctx.font = sans(22, 600)
      ctx.fillText(h.label, x + w / 2, bandTop + bandH + 10)
    })
  }

  // Footer — safety notices travel with the card, always
  const footerTop = 850
  ctx.fillStyle = '#0c0f14'
  ctx.fillRect(0, footerTop, S, S - footerTop)

  ctx.textAlign = 'left'
  ctx.font = sans(24, 600)
  ctx.fillStyle = '#f2f4f0'
  let y = footerTop + 22
  for (const line of wrapText(ctx, model.safetyNote, S - margin * 2, 3)) {
    ctx.fillText(line, margin, y, S - margin * 2)
    y += 31
  }
  if (model.complianceNote) {
    ctx.font = sans(24, 700)
    ctx.fillStyle = '#f5c518'
    for (const line of wrapText(ctx, model.complianceNote, S - margin * 2, 2)) {
      ctx.fillText(line, margin, y, S - margin * 2)
      y += 31
    }
  }

  // Bottom row sits below whatever the notes needed (the compliance case
  // runs five lines) instead of at a fixed offset that the text can collide with.
  const bottomRowY = Math.max(y + 6, S - 60)
  ctx.fillStyle = '#f2f4f0'
  ctx.font = display(36)
  ctx.fillText(model.siteUrl, margin, bottomRowY)
  ctx.textAlign = 'right'
  ctx.font = sans(22, 600)
  ctx.fillStyle = '#9aa5b1'
  const footerNote = model.anyEstimated
    ? `${model.policyName} · ${model.estimatedNote}`
    : model.policyName
  ctx.fillText(footerNote, S - margin, bottomRowY + 8, S - margin * 2 - 320)
}
