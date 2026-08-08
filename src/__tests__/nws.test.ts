import { describe, it, expect } from 'vitest'
import { durationToHours, expandLayer, buildHourlySeries } from '../utils/nws'
import type { WbgtApiResponse } from '../utils/nws'
import { cToF } from '../utils/units'

const T0 = Date.parse('2026-08-10T12:00:00+00:00')
const HOUR = 3600_000

function baseResponse(overrides: Partial<WbgtApiResponse>): WbgtApiResponse {
  return {
    location: { lat: 30.27, lon: -97.74, city: 'Austin', state: 'TX', timeZone: 'America/Chicago' },
    hasWbgt: false,
    wetBulbGlobeTemperature: null,
    temperature: null,
    relativeHumidity: null,
    windSpeed: null,
    skyCover: null,
    ...overrides,
  }
}

describe('NWS validTime parsing', () => {
  it('parses hour, day, and mixed durations', () => {
    expect(durationToHours('PT1H')).toBe(1)
    expect(durationToHours('PT6H')).toBe(6)
    expect(durationToHours('P1D')).toBe(24)
    expect(durationToHours('P1DT2H')).toBe(26)
  })

  it('expands run-length values onto the hourly grid', () => {
    const map = expandLayer({
      uom: 'wmoUnit:degC',
      values: [
        { validTime: '2026-08-10T12:00:00+00:00/PT2H', value: 30 },
        { validTime: '2026-08-10T14:00:00+00:00/PT1H', value: 31 },
        { validTime: '2026-08-10T15:00:00+00:00/PT1H', value: null },
      ],
    })
    expect(map.get(T0)).toBe(30)
    expect(map.get(T0 + HOUR)).toBe(30)
    expect(map.get(T0 + 2 * HOUR)).toBe(31)
    expect(map.get(T0 + 3 * HOUR)).toBeUndefined()
  })
})

describe('buildHourlySeries', () => {
  it('uses NWS WBGT verbatim (degC → degF) and labels it nws', () => {
    const api = baseResponse({
      hasWbgt: true,
      wetBulbGlobeTemperature: {
        uom: 'wmoUnit:degC',
        values: [{ validTime: '2026-08-10T12:00:00+00:00/PT2H', value: 30 }],
      },
    })
    const series = buildHourlySeries(api, { fromMs: T0, hours: 2 })
    expect(series).toHaveLength(2)
    expect(series[0].source).toBe('nws')
    expect(series[0].wbgtF).toBeCloseTo(cToF(30), 6)
  })

  it('fills WBGT holes with a Liljegren estimate labeled estimated', () => {
    const api = baseResponse({
      temperature: {
        uom: 'wmoUnit:degC',
        values: [{ validTime: '2026-08-10T18:00:00+00:00/PT3H', value: 36 }],
      },
      relativeHumidity: {
        uom: 'wmoUnit:percent',
        values: [{ validTime: '2026-08-10T18:00:00+00:00/PT3H', value: 45 }],
      },
      windSpeed: {
        uom: 'wmoUnit:km_h-1',
        values: [{ validTime: '2026-08-10T18:00:00+00:00/PT3H', value: 15 }],
      },
      skyCover: {
        uom: 'wmoUnit:percent',
        values: [{ validTime: '2026-08-10T18:00:00+00:00/PT3H', value: 20 }],
      },
    })
    const from = Date.parse('2026-08-10T18:00:00+00:00') // ~1 pm CDT, sun up
    const series = buildHourlySeries(api, { fromMs: from, hours: 3 })
    expect(series).toHaveLength(3)
    for (const p of series) {
      expect(p.source).toBe('estimated')
      // 36 °C / 45% RH afternoon must land in the verdict decision range —
      // a unit slip would leave this bracket immediately.
      expect(p.wbgtF).toBeGreaterThan(80)
      expect(p.wbgtF).toBeLessThan(105)
    }
  })

  it('prefers NWS WBGT over the estimate for the same hour', () => {
    const api = baseResponse({
      hasWbgt: true,
      wetBulbGlobeTemperature: {
        uom: 'wmoUnit:degC',
        values: [{ validTime: '2026-08-10T18:00:00+00:00/PT1H', value: 29 }],
      },
      temperature: {
        uom: 'wmoUnit:degC',
        values: [{ validTime: '2026-08-10T18:00:00+00:00/PT2H', value: 36 }],
      },
      relativeHumidity: {
        uom: 'wmoUnit:percent',
        values: [{ validTime: '2026-08-10T18:00:00+00:00/PT2H', value: 45 }],
      },
    })
    const from = Date.parse('2026-08-10T18:00:00+00:00')
    const series = buildHourlySeries(api, { fromMs: from, hours: 2 })
    expect(series[0].source).toBe('nws')
    expect(series[0].wbgtF).toBeCloseTo(cToF(29), 6)
    expect(series[1].source).toBe('estimated')
  })

  it('skips hours with no usable data instead of guessing', () => {
    const api = baseResponse({})
    expect(buildHourlySeries(api, { fromMs: T0, hours: 5 })).toHaveLength(0)
  })

  it('missing wind and sky default conservatively (clear sky, calm wind → higher estimate)', () => {
    const noWindSky = baseResponse({
      temperature: {
        uom: 'wmoUnit:degC',
        values: [{ validTime: '2026-08-10T18:00:00+00:00/PT1H', value: 36 }],
      },
      relativeHumidity: {
        uom: 'wmoUnit:percent',
        values: [{ validTime: '2026-08-10T18:00:00+00:00/PT1H', value: 45 }],
      },
    })
    const withWindSky = baseResponse({
      temperature: noWindSky.temperature,
      relativeHumidity: noWindSky.relativeHumidity,
      windSpeed: {
        uom: 'wmoUnit:km_h-1',
        values: [{ validTime: '2026-08-10T18:00:00+00:00/PT1H', value: 25 }],
      },
      skyCover: {
        uom: 'wmoUnit:percent',
        values: [{ validTime: '2026-08-10T18:00:00+00:00/PT1H', value: 90 }],
      },
    })
    const from = Date.parse('2026-08-10T18:00:00+00:00')
    const bare = buildHourlySeries(noWindSky, { fromMs: from, hours: 1 })[0]
    const informed = buildHourlySeries(withWindSky, { fromMs: from, hours: 1 })[0]
    expect(bare.wbgtF).toBeGreaterThan(informed.wbgtF)
  })
})
