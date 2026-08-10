import type { FlagColor, HeatPolicy } from '../data/policyOracle'
import { classifyWbgt, isBorderline } from '../data/policyOracle'
import { displayedWbgtF } from './units'
import type { HourPoint } from './nws'

export interface HourVerdict extends HourPoint {
  flag: FlagColor
  borderline: boolean
  /** Local hour 0-23 in the forecast location's time zone. */
  localHour: number
  /** Local calendar date (YYYY-MM-DD) in the forecast location's time zone. */
  localDate: string
}

export interface DaySummary {
  date: string
  /** Hottest hour of the day (by WBGT); null when the day has no data. */
  peak: HourVerdict | null
  hours: HourVerdict[]
}

function localParts(timeMs: number, timeZone: string): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date(timeMs))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const hour = Number(get('hour')) % 24 // Intl emits '24' for midnight in some engines
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour }
}

/**
 * Every hour, carrying the flag for the number that will be PRINTED for it.
 *
 * The reading is snapped to its displayed precision here, once, and the flag
 * is derived from the snapped value — so the reading, its flag, the log row it
 * writes and the share card it draws can never disagree about which band a
 * number is in. Classifying the raw float instead put a reading of 86.95 on
 * screen as "87.0 °F" with the YELLOW flag while the UIL chart beside the
 * coach says 87.0 begins ORANGE.
 *
 * `wbgtF` is overwritten rather than shadowed by a second field on purpose:
 * every consumer downstream (verdict card, timeline, week strip, log
 * quick-add, share card) already reads `wbgtF`, and a parallel "display value"
 * would be a second number for one reading — the exact defect the display
 * rules in utils/units.ts exist to prevent.
 */
export function annotateHours(
  points: HourPoint[],
  policy: HeatPolicy,
  timeZone: string,
): HourVerdict[] {
  return points.map((p) => {
    const shownF = displayedWbgtF(p.wbgtF)
    const band = classifyWbgt(policy, shownF)
    const { date, hour } = localParts(p.time, timeZone)
    return {
      ...p,
      wbgtF: shownF,
      flag: band.flag,
      borderline: isBorderline(policy, shownF),
      localHour: hour,
      localDate: date,
    }
  })
}

export function groupByDay(hours: HourVerdict[], maxDays = 7): DaySummary[] {
  const byDate = new Map<string, HourVerdict[]>()
  for (const h of hours) {
    const list = byDate.get(h.localDate)
    if (list) list.push(h)
    else byDate.set(h.localDate, [h])
  }
  const days: DaySummary[] = []
  for (const [date, dayHours] of byDate) {
    let peak: HourVerdict | null = null
    for (const h of dayHours) {
      if (!peak || h.wbgtF > peak.wbgtF) peak = h
    }
    days.push({ date, peak, hours: dayHours })
    if (days.length >= maxDays) break
  }
  return days
}

/** The verdict for the hour containing `nowMs`, or the next available hour. */
export function currentVerdict(hours: HourVerdict[], nowMs: number): HourVerdict | null {
  const hourStart = Math.floor(nowMs / 3600_000) * 3600_000
  return hours.find((h) => h.time === hourStart) ?? hours.find((h) => h.time > nowMs) ?? null
}

/** Daytime window shown on the today timeline (planning hours, local time). */
const TIMELINE_START_HOUR = 6
const TIMELINE_END_HOUR = 21

export function timelineHours(day: DaySummary): HourVerdict[] {
  return day.hours.filter(
    (h) => h.localHour >= TIMELINE_START_HOUR && h.localHour <= TIMELINE_END_HOUR,
  )
}

/**
 * Which day the hourly strip shows.
 *
 * An explicit pick from the week strip always wins. With no pick, the default
 * is today — except late in the evening, when every hour left in today falls
 * outside the strip's window and the panel renders "No forecast data for this
 * period" while the week strip beside it says the hours are shown above. That
 * is exactly the hour this site is for, planning tomorrow's practice the night
 * before, so with nothing left to show for today it falls forward to the first
 * day that has hours.
 */
export function pickTimelineDay(
  days: DaySummary[],
  selectedDate: string | null,
): DaySummary | null {
  const chosen = days.find((d) => d.date === selectedDate)
  if (chosen) return chosen
  const today = days[0] ?? null
  if (today && timelineHours(today).length > 0) return today
  return days.find((d) => timelineHours(d).length > 0) ?? today
}
