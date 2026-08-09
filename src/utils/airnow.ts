/**
 * AirNow `reportingarea.dat` parsing.
 *
 * Why this file and not the AirNow API: the API requires a per-account key,
 * while https://files.airnowtech.org/airnow/today/reportingarea.dat is the
 * same program's public hourly file — current observations plus forecasts for
 * every US reporting area, refreshed each hour. One keyless fetch per hour
 * per edge colo covers the whole country, so there is no key to provision,
 * rotate, or leak.
 *
 * Pipe-delimited, 17 fields, one row per (area × pollutant × record):
 *
 *   0  issue date        MM/DD/YY
 *   1  valid date        MM/DD/YY
 *   2  valid time        H:MM (empty on daily records)
 *   3  time zone         PDT | CDT | …
 *   4  day offset        -1 yesterday, 0 today, 2..5 forecast
 *   5  record type       Y yesterday | O observed | F forecast
 *   6  primary pollutant Y | N
 *   7  reporting area
 *   8  state
 *   9  latitude
 *   10 longitude
 *   11 parameter         PM2.5 | PM10 | OZONE | …
 *   12 AQI
 *   13 category name
 *   14 action day        Y | N
 *   15 discussion        (usually empty)
 *   16 reporting agency  ← the credit the AirNow guidelines require first
 */

export const AIRNOW_REPORTING_AREA_URL =
  'https://files.airnowtech.org/airnow/today/reportingarea.dat'

export interface ReportingRow {
  validDate: string
  validTime: string
  timeZone: string
  recordType: string
  primary: boolean
  area: string
  state: string
  lat: number
  lon: number
  parameter: string
  aqi: number
  category: string
  agency: string
}

export interface AqiReading {
  aqi: number
  /** Category name exactly as the agency reported it (must not be altered). */
  category: string
  parameter: string
}

export interface AqiPayload {
  area: {
    name: string
    state: string
    lat: number
    lon: number
    distanceKm: number
  }
  observed: {
    /** As reported, not reformatted. */
    date: string
    time: string
    timeZone: string
    /** Best-effort epoch ms for staleness checks; null when unparseable. */
    epochMs: number | null
  }
  /** Highest sub-index across the area's reported pollutants (the AQI). */
  overall: AqiReading
  /** PM2.5 sub-index when reported — WA's table is keyed to PM2.5. */
  pm25: AqiReading | null
  /** Reporting agencies, credited before EPA AirNow per the data guidelines. */
  agencies: string[]
  /** Always true: AirNow observational data are preliminary by definition. */
  preliminary: true
}

/** Fixed UTC offsets for the zone abbreviations AirNow emits. */
const TZ_OFFSET_HOURS: Record<string, number> = {
  HST: -10,
  HDT: -9,
  AKST: -9,
  AKDT: -8,
  PST: -8,
  PDT: -7,
  MST: -7,
  MDT: -6,
  CST: -6,
  CDT: -5,
  EST: -5,
  EDT: -4,
  AST: -4,
  ADT: -3,
  SST: -11,
  ChST: 10,
  GST: 10,
}

export function parseReportingArea(text: string): ReportingRow[] {
  const rows: ReportingRow[] = []
  for (const line of text.split('\n')) {
    if (!line) continue
    const f = line.split('|')
    if (f.length < 17) continue
    const lat = Number(f[9])
    const lon = Number(f[10])
    const aqi = Number(f[12])
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(aqi)) continue
    rows.push({
      validDate: f[1],
      validTime: f[2],
      timeZone: f[3],
      recordType: f[5],
      primary: f[6] === 'Y',
      area: f[7],
      state: f[8],
      lat,
      lon,
      parameter: f[11],
      aqi,
      category: f[13],
      agency: f[16].trim(),
    })
  }
  return rows
}

const EARTH_RADIUS_KM = 6371

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/**
 * Epoch ms for an AirNow "MM/DD/YY" + "H:MM" + zone-abbreviation stamp.
 * Returns null rather than guessing when the zone is unknown.
 */
export function observationEpochMs(
  date: string,
  time: string,
  timeZone: string,
): number | null {
  const offset = TZ_OFFSET_HOURS[timeZone]
  if (offset === undefined) return null
  const dm = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(date)
  const tm = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!dm || !tm) return null
  const [, mm, dd, yy] = dm
  const [, hh, mi] = tm
  const utc = Date.UTC(
    2000 + Number(yy),
    Number(mm) - 1,
    Number(dd),
    Number(hh) - offset,
    Number(mi),
  )
  return Number.isFinite(utc) ? utc : null
}

/**
 * Current-observation payload for the reporting area nearest to lat/lon.
 * Only 'O' (observed) records are considered — 'Y' is yesterday's summary and
 * 'F' rows are forecasts, which this phase does not surface.
 */
export function buildAqiPayload(
  rows: ReportingRow[],
  lat: number,
  lon: number,
): AqiPayload | null {
  const observed = rows.filter((r) => r.recordType === 'O')
  if (observed.length === 0) return null

  let bestKey: string | null = null
  let bestDistance = Infinity
  const byArea = new Map<string, ReportingRow[]>()
  for (const row of observed) {
    const key = `${row.area}|${row.state}`
    const list = byArea.get(key)
    if (list) list.push(row)
    else byArea.set(key, [row])
  }
  for (const [key, list] of byArea) {
    const d = haversineKm(lat, lon, list[0].lat, list[0].lon)
    if (d < bestDistance) {
      bestDistance = d
      bestKey = key
    }
  }
  if (bestKey === null) return null

  const areaRows = byArea.get(bestKey)!
  // The AQI is the highest sub-index among the reported pollutants; the file's
  // `primary` flag marks the same row, but max() also covers files where the
  // flag is missing on every row for an area.
  let overallRow = areaRows[0]
  for (const row of areaRows) {
    if (row.aqi > overallRow.aqi) overallRow = row
  }
  const pm25Row = areaRows.find((r) => r.parameter === 'PM2.5') ?? null

  const agencies: string[] = []
  for (const row of areaRows) {
    if (row.agency && !agencies.includes(row.agency)) agencies.push(row.agency)
  }

  return {
    area: {
      name: overallRow.area,
      state: overallRow.state,
      lat: overallRow.lat,
      lon: overallRow.lon,
      distanceKm: Math.round(bestDistance * 10) / 10,
    },
    observed: {
      date: overallRow.validDate,
      time: overallRow.validTime,
      timeZone: overallRow.timeZone,
      epochMs: observationEpochMs(
        overallRow.validDate,
        overallRow.validTime,
        overallRow.timeZone,
      ),
    },
    overall: {
      aqi: overallRow.aqi,
      category: overallRow.category,
      parameter: overallRow.parameter,
    },
    pm25: pm25Row
      ? { aqi: pm25Row.aqi, category: pm25Row.category, parameter: pm25Row.parameter }
      : null,
    agencies,
    preliminary: true,
  }
}
