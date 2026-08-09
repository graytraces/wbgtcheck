import { describe, it, expect } from 'vitest'
import {
  parseReportingArea,
  buildAqiPayload,
  haversineKm,
  observationEpochMs,
} from '../utils/airnow'

/**
 * reportingarea.dat parsing. The fixture rows below are real lines from
 * https://files.airnowtech.org/airnow/today/reportingarea.dat (fetched
 * 2026-08-09), trimmed to the areas under test.
 */

const FIXTURE = [
  // Aberdeen WA — yesterday summary, current observation, then forecasts.
  '08/08/26|08/07/26||PDT|-1|Y|Y|Aberdeen|WA|47.1076|-123.7837|PM2.5|38|Good|No||Olympic Region Clean Air Agency',
  '08/08/26|08/08/26|23:00|PDT|0|O|Y|Aberdeen|WA|47.1076|-123.7837|PM2.5|26|Good|No||Olympic Region Clean Air Agency',
  '08/06/26|08/09/26||PDT|3|F|Y|Aberdeen|WA|47.1076|-123.7837|PM2.5|28|Good|No||Olympic Region Clean Air Agency',
  // Albany OR — observation.
  '08/08/26|08/08/26|23:00|PDT|0|O|Y|Albany|OR|44.6157|-123.0915|PM2.5|17|Good|No||Oregon Dept. of Environmental Quality',
  // Portland OR — two pollutants; OZONE is the higher sub-index and primary.
  '08/08/26|08/08/26|23:00|PDT|0|O|N|Portland|OR|45.5051|-122.6750|PM2.5|60|Moderate|No||Oregon Dept. of Environmental Quality',
  '08/08/26|08/08/26|23:00|PDT|0|O|Y|Portland|OR|45.5051|-122.6750|OZONE|155|Unhealthy|Yes||Oregon Dept. of Environmental Quality',
  // Malformed rows that must not crash or pollute the dataset.
  'garbage line without pipes',
  '08/08/26|08/08/26|23:00|PDT|0|O|Y|Broken|XX|notalat|notalon|PM2.5|12|Good|No||Nobody',
  '',
].join('\n')

describe('parseReportingArea', () => {
  it('parses well-formed rows and drops malformed ones', () => {
    const rows = parseReportingArea(FIXTURE)
    expect(rows).toHaveLength(6)
    expect(rows.some((r) => r.area === 'Broken')).toBe(false)
  })

  it('maps every field to the documented column', () => {
    const row = parseReportingArea(FIXTURE).find(
      (r) => r.area === 'Aberdeen' && r.recordType === 'O',
    )!
    expect(row).toMatchObject({
      validDate: '08/08/26',
      validTime: '23:00',
      timeZone: 'PDT',
      recordType: 'O',
      primary: true,
      area: 'Aberdeen',
      state: 'WA',
      parameter: 'PM2.5',
      aqi: 26,
      category: 'Good',
      agency: 'Olympic Region Clean Air Agency',
    })
    expect(row.lat).toBeCloseTo(47.1076, 4)
    expect(row.lon).toBeCloseTo(-123.7837, 4)
  })

  it('tolerates an empty payload', () => {
    expect(parseReportingArea('')).toEqual([])
  })
})

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm(45, -122, 45, -122)).toBeCloseTo(0, 6)
  })

  it('matches a known separation (Portland↔Albany ≈ 100 km)', () => {
    const d = haversineKm(45.5051, -122.675, 44.6157, -123.0915)
    expect(d).toBeGreaterThan(95)
    expect(d).toBeLessThan(110)
  })
})

describe('observationEpochMs', () => {
  it('resolves a PDT stamp to the right UTC instant', () => {
    // 23:00 PDT on 08/08/26 is 06:00 UTC on 08/09/26.
    expect(observationEpochMs('08/08/26', '23:00', 'PDT')).toBe(
      Date.parse('2026-08-09T06:00:00Z'),
    )
  })

  it('returns null rather than guessing an unknown zone or blank time', () => {
    expect(observationEpochMs('08/08/26', '23:00', 'XYZ')).toBeNull()
    expect(observationEpochMs('08/08/26', '', 'PDT')).toBeNull()
    expect(observationEpochMs('not-a-date', '23:00', 'PDT')).toBeNull()
  })
})

describe('buildAqiPayload', () => {
  const rows = parseReportingArea(FIXTURE)

  it('picks the nearest reporting area with a current observation', () => {
    // Coordinates just outside Portland.
    const payload = buildAqiPayload(rows, 45.52, -122.68)!
    expect(payload.area.name).toBe('Portland')
    expect(payload.area.state).toBe('OR')
    expect(payload.area.distanceKm).toBeLessThan(5)
  })

  it('reports the highest sub-index as the AQI, naming its pollutant', () => {
    const payload = buildAqiPayload(rows, 45.52, -122.68)!
    // OZONE 155 outranks PM2.5 60 — the AQI is the max sub-index.
    expect(payload.overall).toEqual({ aqi: 155, category: 'Unhealthy', parameter: 'OZONE' })
  })

  it('also exposes PM2.5 separately (WA policy is keyed to that sub-index)', () => {
    const payload = buildAqiPayload(rows, 45.52, -122.68)!
    expect(payload.pm25).toEqual({ aqi: 60, category: 'Moderate', parameter: 'PM2.5' })
  })

  it('leaves pm25 null when the area reports no PM2.5', () => {
    const ozoneOnly = parseReportingArea(
      '08/08/26|08/08/26|23:00|PDT|0|O|Y|OzoneTown|OR|44.0|-123.0|OZONE|120|Unhealthy for Sensitive Groups|No||Oregon Dept. of Environmental Quality',
    )
    expect(buildAqiPayload(ozoneOnly, 44, -123)!.pm25).toBeNull()
  })

  it('ignores yesterday and forecast records', () => {
    // Aberdeen's yesterday row is 38 and its forecast is 28; only the 26
    // observation may surface.
    const payload = buildAqiPayload(rows, 47.1076, -123.7837)!
    expect(payload.area.name).toBe('Aberdeen')
    expect(payload.overall.aqi).toBe(26)
  })

  it('credits the reporting agency, as the AirNow guidelines require', () => {
    const payload = buildAqiPayload(rows, 47.1076, -123.7837)!
    expect(payload.agencies).toEqual(['Olympic Region Clean Air Agency'])
  })

  it('always flags the reading as preliminary', () => {
    expect(buildAqiPayload(rows, 45.52, -122.68)!.preliminary).toBe(true)
  })

  it('passes the observation timestamp through as reported', () => {
    const payload = buildAqiPayload(rows, 45.52, -122.68)!
    expect(payload.observed).toMatchObject({
      date: '08/08/26',
      time: '23:00',
      timeZone: 'PDT',
    })
    expect(payload.observed.epochMs).toBe(Date.parse('2026-08-09T06:00:00Z'))
  })

  it('returns null when no area has a current observation', () => {
    const forecastOnly = parseReportingArea(
      '08/06/26|08/09/26||PDT|3|F|Y|Aberdeen|WA|47.1076|-123.7837|PM2.5|28|Good|No||Olympic Region Clean Air Agency',
    )
    expect(buildAqiPayload(forecastOnly, 47, -123)).toBeNull()
    expect(buildAqiPayload([], 47, -123)).toBeNull()
  })
})
