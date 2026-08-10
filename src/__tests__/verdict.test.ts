import { describe, it, expect } from 'vitest'
import {
  annotateHours,
  groupByDay,
  currentVerdict,
  timelineHours,
  restOfDayPeak,
} from '../utils/verdict'
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

})

/**
 * "The rest of today" is a claim about the clock, and the two ways it goes
 * wrong are both silent.
 *
 * `days[0].peak` is the obvious source and it is stale by construction: `days`
 * is memoised on the payload, `buildHourlySeries` starts at the hour of the
 * FETCH, so an hour after load it still counts hours the reader has lived
 * through, and past local midnight `days[0]` is yesterday under today's name.
 * Both produce a confident sentence about a peak that already happened.
 *
 * So this is anchored on the hour the card is showing, and these are the two
 * cases that distinguish the two designs.
 */
describe('restOfDayPeak', () => {
  const day = (offsets: Array<[number, number]>) =>
    annotateHours(
      offsets.map(([o, f]) => point(o, f)),
      UIL_CLASS_3,
      TZ,
    )

  it('ignores hours that have already gone by', () => {
    // 06:00 was the hottest hour of the day and it is 15:00. The morning peak
    // is not a fact about the rest of today.
    const hours = day([[0, 95], [6, 84], [9, 88], [12, 82]])
    const from = hours.find((h) => h.localHour === 15)!
    expect(restOfDayPeak(hours, from)?.wbgtF).toBe(88)
    expect(restOfDayPeak(hours, from)?.localHour).toBe(15)
    // …and from the top of the day it IS the answer.
    expect(restOfDayPeak(hours, hours[0])?.wbgtF).toBe(95)
  })

  it('never reaches into another local day', () => {
    // Past midnight the first day in the series is yesterday. An hour standing
    // on the 11th must not be told the 10th's afternoon is still ahead of it.
    // Offsets are hours from 06:00 CDT on the 10th, so 20 lands at 02:00 on
    // the 11th — the hour a coach checking after midnight is standing in.
    const hours = day([[0, 93], [12, 85], [20, 79], [26, 81]])
    const afterMidnight = hours.find((h) => h.localDate === '2026-08-11')!
    expect(afterMidnight.localHour).toBe(2)
    expect(restOfDayPeak(hours, afterMidnight)?.wbgtF).toBe(81)
    expect(restOfDayPeak(hours, afterMidnight)?.localDate).toBe('2026-08-11')
    // The trap: days[0].peak would have answered 93, which happened on the
    // day before and is the hottest thing in the series.
    expect(groupByDay(hours)[0].peak?.wbgtF).toBe(93)
  })

  it('returns the hour itself when nothing ahead is hotter', () => {
    const hours = day([[6, 91], [9, 84], [12, 80]])
    const from = hours[0]
    expect(restOfDayPeak(hours, from)).toBe(from)
  })

  it('is null when the series has nothing for that day', () => {
    const hours = day([[6, 90]])
    const orphan = { ...hours[0], localDate: '2026-09-01' }
    expect(restOfDayPeak(hours, orphan)).toBeNull()
  })
})
