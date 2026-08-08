/**
 * Client-side parsing of the /api/wbgt worker payload (slimmed NWS gridpoint).
 *
 * NWS gridpoint layers are sparse run-length series: each entry is a
 * validTime "ISO start / ISO-8601 duration" covering one or more hours. We
 * expand them onto an hourly grid, take NWS wetBulbGlobeTemperature verbatim
 * where present, and fill holes with the Liljegren estimate (labeled
 * 'estimated') where the office does not publish WBGT — confirmed for EWX
 * (Austin-San Antonio).
 */

import { wbgtLiljegren } from '../lib/liljegren'
import { solarPosition, cloudyGhi, directFraction } from '../lib/solar'
import { cToF, cToK, kmhToMs } from './units'

export interface NwsLayer {
  uom?: string
  values: Array<{ validTime: string; value: number | null }>
}

export interface WbgtApiResponse {
  location: {
    lat: number
    lon: number
    city: string | null
    state: string | null
    timeZone: string | null
  }
  hasWbgt: boolean
  wetBulbGlobeTemperature: NwsLayer | null
  temperature: NwsLayer | null
  relativeHumidity: NwsLayer | null
  windSpeed: NwsLayer | null
  skyCover: NwsLayer | null
}

export type WbgtSource = 'nws' | 'estimated'

export interface HourPoint {
  /** Hour start, epoch ms (UTC). */
  time: number
  wbgtF: number
  source: WbgtSource
  /** Air temperature °F when available (timeline display). */
  tempF: number | null
}

const HOUR_MS = 3600_000

/** Parse the duration half of an NWS validTime (e.g. "PT2H", "P1D", "P1DT6H") into hours. */
export function durationToHours(duration: string): number {
  const m = duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/)
  if (!m) return 1
  const days = m[1] ? Number(m[1]) : 0
  const hours = m[2] ? Number(m[2]) : 0
  const minutes = m[3] ? Number(m[3]) : 0
  const total = days * 24 + hours + Math.ceil(minutes / 60)
  return total > 0 ? total : 1
}

/** Expand a sparse NWS layer into an hour-start-ms → value map. */
export function expandLayer(layer: NwsLayer | null): Map<number, number> {
  const out = new Map<number, number>()
  if (!layer) return out
  for (const { validTime, value } of layer.values) {
    if (value === null || !Number.isFinite(value)) continue
    const [startIso, duration] = validTime.split('/')
    const start = Date.parse(startIso)
    if (!Number.isFinite(start)) continue
    const hours = duration ? durationToHours(duration) : 1
    const startHour = Math.floor(start / HOUR_MS) * HOUR_MS
    for (let h = 0; h < hours; h++) {
      out.set(startHour + h * HOUR_MS, value)
    }
  }
  return out
}

function tempToF(value: number, uom: string | undefined): number {
  return uom === 'wmoUnit:degF' ? value : cToF(value)
}

function windToMs(value: number, uom: string | undefined): number {
  if (uom === 'wmoUnit:m_s-1') return value
  return kmhToMs(value) // NWS gridpoint default is wmoUnit:km_h-1
}

export interface HourlySeriesOptions {
  /** Hour-aligned epoch ms to start from (defaults to the current hour). */
  fromMs?: number
  /** How many hours to produce (default 7 days). */
  hours?: number
}

/**
 * Build the hourly WBGT series the verdict UI consumes.
 *
 * Estimate-path input defaults are deliberately conservative (they push the
 * estimate UP, never down): missing sky cover → clear sky; missing wind →
 * calm (the Liljegren KNMI floor takes over). Pressure is fixed at the
 * standard atmosphere 1013.25 hPa — the worker payload does not carry
 * pressure, and WBGT sensitivity to realistic surface-pressure deviation is
 * far below the model's own error bar.
 */
export function buildHourlySeries(
  api: WbgtApiResponse,
  opts: HourlySeriesOptions = {},
): HourPoint[] {
  const fromMs = opts.fromMs ?? Math.floor(Date.now() / HOUR_MS) * HOUR_MS
  const hours = opts.hours ?? 24 * 7

  const wbgt = expandLayer(api.wetBulbGlobeTemperature)
  const temp = expandLayer(api.temperature)
  const rh = expandLayer(api.relativeHumidity)
  const wind = expandLayer(api.windSpeed)
  const sky = expandLayer(api.skyCover)

  const wbgtUom = api.wetBulbGlobeTemperature?.uom
  const tempUom = api.temperature?.uom
  const windUom = api.windSpeed?.uom

  const points: HourPoint[] = []
  for (let i = 0; i < hours; i++) {
    const t = fromMs + i * HOUR_MS
    const tempC = temp.get(t)
    const tempF = tempC !== undefined ? tempToF(tempC, tempUom) : null

    const wbgtVal = wbgt.get(t)
    if (wbgtVal !== undefined) {
      points.push({ time: t, wbgtF: tempToF(wbgtVal, wbgtUom), source: 'nws', tempF })
      continue
    }

    const rhVal = rh.get(t)
    if (tempC === undefined || rhVal === undefined) continue

    const windVal = wind.get(t)
    const skyVal = sky.get(t)
    const va10 = windVal !== undefined ? windToMs(windVal, windUom) : 0
    const cloudFrac = skyVal !== undefined ? skyVal / 100 : 0

    const { cosZenith } = solarPosition(api.location.lat, api.location.lon, new Date(t))
    const ghi = cloudyGhi(cosZenith, cloudFrac)
    const fdir = directFraction(cloudFrac)

    const tempCVal = tempUom === 'wmoUnit:degF' ? ((tempC - 32) / 1.8) : tempC
    const k = wbgtLiljegren(cToK(tempCVal), rhVal, 1013.25, va10, ghi, fdir, cosZenith)
    if (!Number.isFinite(k)) continue
    points.push({ time: t, wbgtF: cToF(k - 273.15), source: 'estimated', tempF })
  }
  return points
}
