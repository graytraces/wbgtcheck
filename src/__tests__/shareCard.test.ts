import { describe, it, expect } from 'vitest'
import { buildShareCardModel } from '../utils/shareCard'
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
