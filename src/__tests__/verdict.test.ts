import { describe, it, expect } from 'vitest'
import { annotateHours, groupByDay, currentVerdict, timelineHours, flagSeverity } from '../utils/verdict'
import type { HourPoint } from '../utils/nws'
import { UIL_CLASS_3, classifyWbgt } from '../data/policyOracle'

const TZ = 'America/Chicago'
const HOUR = 3600_000
// 2026-08-10 06:00 local (CDT, UTC-5)
const DAY_START = Date.parse('2026-08-10T11:00:00+00:00')

function point(hourOffset: number, wbgtF: number): HourPoint {
  return { time: DAY_START + hourOffset * HOUR, wbgtF, source: 'nws', tempF: null }
}

describe('verdict annotation', () => {
  it('derives each hour flag from the policy oracle (no independent thresholds)', () => {
    const points = [point(0, 75), point(6, 88.5), point(9, 92.5)]
    const annotated = annotateHours(points, UIL_CLASS_3, TZ)
    annotated.forEach((h, i) => {
      expect(h.flag).toBe(classifyWbgt(UIL_CLASS_3, points[i].wbgtF).flag)
    })
    expect(annotated.map((h) => h.flag)).toEqual(['green', 'orange', 'black'])
  })

  it('computes local hour and date in the forecast time zone', () => {
    const [h] = annotateHours([point(0, 80)], UIL_CLASS_3, TZ)
    expect(h.localHour).toBe(6)
    expect(h.localDate).toBe('2026-08-10')
  })

  it('groups by local day and finds the WBGT peak', () => {
    const points = [point(0, 78), point(8, 91), point(12, 85), point(26, 80)]
    const days = groupByDay(annotateHours(points, UIL_CLASS_3, TZ))
    expect(days).toHaveLength(2)
    expect(days[0].peak?.wbgtF).toBe(91)
    expect(days[0].peak?.flag).toBe('red')
  })

  it('currentVerdict returns the containing hour, else the next one', () => {
    const hours = annotateHours([point(0, 78), point(1, 82)], UIL_CLASS_3, TZ)
    expect(currentVerdict(hours, DAY_START + 10 * 60_000)?.time).toBe(DAY_START)
    expect(currentVerdict(hours, DAY_START - 2 * HOUR)?.time).toBe(DAY_START)
    expect(currentVerdict(hours, DAY_START + 5 * HOUR)).toBeNull()
  })

  it('timelineHours keeps the 6:00-21:00 planning window', () => {
    const points = Array.from({ length: 24 }, (_, i) => point(i - 6, 80)) // full local day
    const days = groupByDay(annotateHours(points, UIL_CLASS_3, TZ))
    const windowHours = timelineHours(days[0])
    expect(windowHours.every((h) => h.localHour >= 6 && h.localHour <= 21)).toBe(true)
    expect(windowHours.length).toBe(16)
  })

  it('flag severity is monotonic green→black', () => {
    expect(flagSeverity('green')).toBeLessThan(flagSeverity('yellow'))
    expect(flagSeverity('yellow')).toBeLessThan(flagSeverity('orange'))
    expect(flagSeverity('orange')).toBeLessThan(flagSeverity('red'))
    expect(flagSeverity('red')).toBeLessThan(flagSeverity('black'))
  })
})
