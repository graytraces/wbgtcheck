import type { FlagColor } from '../data/policyOracle'
import type { DaySummary, HourVerdict } from './verdict'
import { timelineHours } from './verdict'
import { FLAG_HEX } from './flagStyles'

/**
 * Share card: a 1080×1080 PNG for the team group chat. The day's peak flag
 * color is the background — the verdict reads before any text does — with the
 * hourly flag band, date, location and site URL. Drawing is split from data
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
    hours,
    anyEstimated: hours.some((h) => h.estimated),
    title: opts.title,
    estimatedNote: opts.estimatedNote,
    siteUrl: 'wbgtcheck.com',
  }
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

  // Verdict block — peak flag color owns the top of the card
  ctx.fillStyle = peak.bg
  ctx.fillRect(0, 0, S, 760)

  ctx.fillStyle = peak.fg
  ctx.textBaseline = 'top'
  ctx.font = sans(34)
  ctx.textAlign = 'left'
  ctx.fillText(model.title.toUpperCase(), 60, 56)
  ctx.textAlign = 'right'
  ctx.fillText(model.dateLabel, S - 60, 56)

  ctx.textAlign = 'left'
  ctx.font = sans(40)
  ctx.fillText(model.locationLabel, 60, 120, S - 120)

  ctx.font = display(400)
  ctx.fillText(String(Math.round(model.peakWbgtF)), 48, 200)
  const numWidth = ctx.measureText(String(Math.round(model.peakWbgtF))).width
  ctx.font = display(90)
  ctx.fillText('°F', 64 + numWidth, 250)
  ctx.font = sans(36)
  ctx.fillText('WBGT PEAK', 64 + numWidth, 360)

  ctx.font = display(120)
  ctx.fillText(model.peakFlagLabel.toUpperCase(), 60, 600)

  // Hourly flag band
  const bandTop = 800
  const bandH = 150
  const margin = 60
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
      ctx.fillText(String(Math.round(h.wbgtF)), x + w / 2, bandTop + 44)
      if (h.estimated) {
        ctx.font = sans(20)
        ctx.fillText('EST', x + w / 2, bandTop + 92)
      }
      ctx.fillStyle = '#9aa5b1'
      ctx.font = sans(22, 600)
      ctx.fillText(h.label, x + w / 2, bandTop + bandH + 12)
    })
  }

  // Footer strip on neutral dark
  ctx.fillStyle = '#0c0f14'
  ctx.fillRect(0, 760, S, 40)
  ctx.fillStyle = '#0c0f14'
  ctx.fillRect(0, S - 84, S, 84)
  ctx.fillStyle = '#f2f4f0'
  ctx.textAlign = 'left'
  ctx.font = display(40)
  ctx.fillText(model.siteUrl, margin, S - 68)
  ctx.textAlign = 'right'
  ctx.font = sans(24, 600)
  ctx.fillStyle = '#9aa5b1'
  const footerNote = model.anyEstimated
    ? `${model.policyName} · ${model.estimatedNote}`
    : model.policyName
  ctx.fillText(footerNote, S - margin, S - 60, S - margin * 2 - 320)
}
