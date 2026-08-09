import type { FlagColor, HeatPolicy } from '../data/policyOracle'
import { classifyWbgt, isBorderline } from '../data/policyOracle'
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

export function annotateHours(
  points: HourPoint[],
  policy: HeatPolicy,
  timeZone: string,
): HourVerdict[] {
  return points.map((p) => {
    const band = classifyWbgt(policy, p.wbgtF)
    const { date, hour } = localParts(p.time, timeZone)
    return {
      ...p,
      flag: band.flag,
      borderline: isBorderline(policy, p.wbgtF),
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
