import { describe, it, expect } from 'vitest'
import { pickTimelineDay, timelineHours, type DaySummary } from '../utils/verdict'
import en from '../locales/en.json'
import es from '../locales/es.json'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The late-evening hole.
 *
 * The hourly strip only draws 6am-9pm. Open the site at 10pm and every hour
 * left in today is outside that window, so the panel rendered "No forecast
 * data for this period" — while the week strip directly beneath it said
 * "Shown hour by hour above" about the same day. One of the two was lying, at
 * the exact hour this site is built for: the copy promises planning tomorrow's
 * practice with tonight's forecast.
 */

const hour = (localHour: number, wbgtF = 80): DaySummary['hours'][number] =>
  ({ localHour, wbgtF }) as DaySummary['hours'][number]

const day = (date: string, hours: number[]): DaySummary => ({
  date,
  peak: hours.length ? hour(hours[0]) : null,
  hours: hours.map((h) => hour(h)),
})

describe('which day the hourly strip shows', () => {
  it('shows today when today still has hours in the window', () => {
    const days = [day('2026-08-14', [15, 16, 17]), day('2026-08-15', [7, 8])]
    expect(pickTimelineDay(days, null)?.date).toBe('2026-08-14')
  })

  it('falls forward to tomorrow once today has nothing left to draw', () => {
    // 22:00 and 23:00 are real forecast hours; they are simply outside 6-21.
    const today = day('2026-08-14', [22, 23])
    const tomorrow = day('2026-08-15', [7, 8, 15])
    expect(timelineHours(today)).toHaveLength(0)
    expect(pickTimelineDay([today, tomorrow], null)?.date).toBe('2026-08-15')
  })

  it('still honours an explicit pick, including one with no drawable hours', () => {
    const today = day('2026-08-14', [15])
    const tomorrow = day('2026-08-15', [23])
    expect(pickTimelineDay([today, tomorrow], '2026-08-15')?.date).toBe('2026-08-15')
  })

  it('stays on today when no day has drawable hours, rather than jumping', () => {
    const days = [day('2026-08-14', [23]), day('2026-08-15', [0])]
    expect(pickTimelineDay(days, null)?.date).toBe('2026-08-14')
  })

  it('handles an empty forecast without throwing', () => {
    expect(pickTimelineDay([], null)).toBeNull()
  })

  it('names the auto-advanced day "Tomorrow", not the weekday nobody clicked', () => {
    for (const dict of [en, es]) {
      expect(dict.verdict.tomorrowHeading).toBeTruthy()
      expect(dict.verdict.tomorrowHeading).not.toBe(dict.verdict.todayHeading)
    }
    const src = readFileSync(join(process.cwd(), 'src/pages/Home.tsx'), 'utf8')
    expect(src).toContain("t('verdict.tomorrowHeading')")
    // Only when the reader did not choose the day themselves.
    expect(src).toContain('autoAdvancedToNextDay')
  })
})
