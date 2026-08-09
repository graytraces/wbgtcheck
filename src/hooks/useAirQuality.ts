import { useCallback, useEffect, useState } from 'react'
import type { AqiPayload } from '../utils/airnow'
import type { ActivityId, AirPolicy } from '../data/airPolicyOracle'
import {
  ACTIVITY_IDS,
  AIR_OBSERVATION_STALE_MINUTES,
  DEFAULT_ACTIVITY_ID,
} from '../data/airPolicyOracle'

const ACTIVITY_KEY = 'wbgt-activity'

export type AirStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * There is no dev fallback here, unlike useWbgt: reportingarea.dat is a 2 MB
 * file served without CORS headers, so it can only be read server-side. Under
 * `vite dev` (no worker) /api/aqi 404s and the gate renders its unavailable
 * state — that is expected, not a bug.
 */
async function fetchAqi(lat: number, lon: number): Promise<AqiPayload> {
  const res = await fetch(`/api/aqi?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`)
  if (!res.ok) throw new Error(`api ${res.status}`)
  return res.json() as Promise<AqiPayload>
}

function loadActivity(): ActivityId {
  try {
    const raw = window.localStorage.getItem(ACTIVITY_KEY)
    if (raw && (ACTIVITY_IDS as readonly string[]).includes(raw)) return raw as ActivityId
  } catch {
    // storage blocked — fall through to the default
  }
  return DEFAULT_ACTIVITY_ID as ActivityId
}

export type ObservationAge = 'fresh' | 'stale' | 'unknown'

/**
 * How old the reported observation is — or that we cannot tell.
 *
 * `observationEpochMs` returns null whenever AirNow hands us a time-zone
 * abbreviation outside TZ_OFFSET_HOURS, or a stamp its regexes do not match.
 * That used to read as "not stale", so a reading of unknown age — in practice
 * the last one AirNow published for that area, possibly hours old — was shown
 * as current with no warning at all. Not knowing the age of a safety reading
 * is not the same as knowing it is fresh, and the safe direction is to say so.
 */
export function observationAge(epochMs: number | null, now: number): ObservationAge {
  if (epochMs === null) return 'unknown'
  return now - epochMs > AIR_OBSERVATION_STALE_MINUTES * 60_000 ? 'stale' : 'fresh'
}

/** True when the reading must not be presented as current — unknown counts. */
export function isObservationStale(epochMs: number | null, now: number): boolean {
  return observationAge(epochMs, now) !== 'fresh'
}

export interface AirReading {
  aqi: number
  category: string
  parameter: string
  /** Which index this value is, so the label can say so. */
  basis: 'pm25' | 'overall'
}

/**
 * The value a jurisdiction's thresholds are actually keyed to. WA's table is
 * a PM2.5 table; feeding it an ozone-driven overall AQI would misapply it.
 * Falls back to the overall AQI when the area reports no PM2.5.
 */
export function readingForPolicy(
  payload: AqiPayload,
  policy: AirPolicy | null,
): AirReading {
  if (policy?.indexBasis === 'pm25' && payload.pm25) {
    return { ...payload.pm25, basis: 'pm25' }
  }
  return { ...payload.overall, basis: 'overall' }
}

export function useAirQuality(lat: number | null, lon: number | null) {
  const [status, setStatus] = useState<AirStatus>('idle')
  const [data, setData] = useState<AqiPayload | null>(null)
  const [activity, setActivityState] = useState<ActivityId>(loadActivity)
  const [fetchTick, setFetchTick] = useState(0)

  useEffect(() => {
    if (lat === null || lon === null) {
      setStatus('idle')
      setData(null)
      return
    }
    let cancelled = false
    setStatus('loading')
    fetchAqi(lat, lon)
      .then((res) => {
        if (cancelled) return
        setData(res)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setData(null)
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [lat, lon, fetchTick])

  /**
   * Re-read AirNow. Wired to the same button as the WBGT refresh: refreshing
   * the heat forecast while leaving an hour-old air reading on screen would be
   * exactly the silent-stale failure the stale notice exists to prevent.
   */
  const refetch = useCallback(() => {
    setFetchTick((t) => t + 1)
  }, [])

  const setActivity = useCallback((next: ActivityId) => {
    setActivityState(next)
    try {
      window.localStorage.setItem(ACTIVITY_KEY, next)
    } catch {
      // non-fatal
    }
  }, [])

  return { status, data, activity, setActivity, refetch }
}
