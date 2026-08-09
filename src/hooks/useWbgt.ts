import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WbgtApiResponse } from '../utils/nws'
import { zipToLocation } from '../utils/geocode'
import { trackLocationSet } from '../utils/analytics'
import type { PolicyId } from '../data/policyOracle'
import { POLICIES } from '../data/policyOracle'

const LOCATION_KEY = 'wbgt-location'
const POLICY_KEY = 'wbgt-policy'
/**
 * Records that a Texas user has answered the UIL class question, so the prompt
 * is asked once and not on every visit. Separate from POLICY_KEY because that
 * key cannot distinguish "defaulted to Class 2" from "chose Class 2" — and the
 * whole point of the prompt is that the default is a guess.
 */
const UIL_CLASS_KEY = 'wbgt-uil-class'

export interface SavedLocation {
  lat: number
  lon: number
  /** Display label, e.g. "Austin, TX" or "78701". */
  label: string
  stateAbbr: string | null
}

export type WbgtStatus = 'idle' | 'locating' | 'loading' | 'ready' | 'error'

/**
 * A forecast older than this is stale for practice decisions — the UI must
 * warn and offer a refresh rather than keep showing old numbers silently
 * (the one fatal failure mode named by the legal review).
 */
export const STALE_AFTER_MS = 60 * 60_000

export function isStale(fetchedAt: number | null, now: number): boolean {
  return fetchedAt !== null && now - fetchedAt > STALE_AFTER_MS
}

/**
 * Default policy per state. UIL classes are assigned by county (most of
 * eastern/central Texas is Class 3; the Panhandle and far West Texas are
 * Class 2), but no authoritative county list is available to auto-assign —
 * so Texas defaults to the STRICTER Class 2 and the UI steers the user to
 * pick their class from the UIL map. Never flip this default to the more
 * permissive Class 3.
 */
export function defaultPolicyFor(stateAbbr: string | null): PolicyId {
  if (stateAbbr === 'TX') return 'uil-class-2'
  if (stateAbbr === 'GA') return 'ghsa'
  // Both verified safe to auto-select: SCHSL's thresholds equal the generic
  // NATA bands with warnings added on top; Iowa's are stricter than generic.
  if (stateAbbr === 'SC') return 'schsl'
  if (stateAbbr === 'IA') return 'iowa'
  return 'generic'
}

/** True when `policyId` belongs to `stateAbbr` — explicit choices within a state survive re-location. */
export function policyMatchesState(stateAbbr: string | null, policyId: PolicyId): boolean {
  if (stateAbbr === 'TX') return policyId.startsWith('uil')
  if (stateAbbr === 'GA') return policyId === 'ghsa'
  if (stateAbbr === 'SC') return policyId === 'schsl'
  if (stateAbbr === 'IA') return policyId === 'iowa'
  return false
}

function loadSaved<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function save(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full/blocked — non-fatal
  }
}

const NWS_HEADERS = { Accept: 'application/geo+json' }

/**
 * Dev-mode fallback: `vite dev` has no worker, so we compose the same
 * points→gridpoint flow directly against api.weather.gov (which serves CORS).
 * Production always goes through /api/wbgt (User-Agent + edge cache).
 */
async function fetchWbgtDev(lat: number, lon: number): Promise<WbgtApiResponse> {
  const points = await fetch(
    `https://api.weather.gov/points/${lat.toFixed(2)},${lon.toFixed(2)}`,
    { headers: NWS_HEADERS },
  ).then((r) => {
    if (!r.ok) throw new Error(`points ${r.status}`)
    return r.json() as Promise<{
      properties: {
        forecastGridData: string
        timeZone?: string
        relativeLocation?: { properties?: { city?: string; state?: string } }
      }
    }>
  })
  const grid = await fetch(points.properties.forecastGridData, { headers: NWS_HEADERS }).then(
    (r) => {
      if (!r.ok) throw new Error(`grid ${r.status}`)
      return r.json() as Promise<{ properties: Record<string, unknown> }>
    },
  )
  const pick = (k: string) => {
    const layer = grid.properties[k] as WbgtApiResponse['temperature']
    return layer && Array.isArray(layer.values) && layer.values.length > 0 ? layer : null
  }
  const wbgt = pick('wetBulbGlobeTemperature')
  return {
    location: {
      lat,
      lon,
      city: points.properties.relativeLocation?.properties?.city ?? null,
      state: points.properties.relativeLocation?.properties?.state ?? null,
      timeZone: points.properties.timeZone ?? null,
    },
    hasWbgt: wbgt !== null,
    wetBulbGlobeTemperature: wbgt,
    temperature: pick('temperature'),
    relativeHumidity: pick('relativeHumidity'),
    windSpeed: pick('windSpeed'),
    skyCover: pick('skyCover'),
  }
}

async function fetchWbgt(lat: number, lon: number): Promise<WbgtApiResponse> {
  if (import.meta.env.DEV) return fetchWbgtDev(lat, lon)
  const res = await fetch(`/api/wbgt?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`)
  if (!res.ok) throw new Error(`api ${res.status}`)
  return res.json() as Promise<WbgtApiResponse>
}

export function useWbgt() {
  const [location, setLocation] = useState<SavedLocation | null>(() =>
    loadSaved<SavedLocation>(LOCATION_KEY),
  )
  const [policyId, setPolicyIdState] = useState<PolicyId>(() => {
    const saved = loadSaved<PolicyId>(POLICY_KEY)
    return saved && saved in POLICIES ? saved : defaultPolicyFor(loadSaved<SavedLocation>(LOCATION_KEY)?.stateAbbr ?? null)
  })
  const [uilClassChosen, setUilClassChosen] = useState<boolean>(
    () => loadSaved<PolicyId>(UIL_CLASS_KEY) !== null,
  )
  const [status, setStatus] = useState<WbgtStatus>(location ? 'loading' : 'idle')
  const [data, setData] = useState<WbgtApiResponse | null>(null)
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [fetchTick, setFetchTick] = useState(0)

  // location_set('saved'): a restored localStorage location counts as a
  // returning session — fire once on mount, not on later changes.
  const restoredFromStorage = useRef(location !== null)
  useEffect(() => {
    if (restoredFromStorage.current) trackLocationSet('saved')
  }, [])

  useEffect(() => {
    if (!location) return
    let cancelled = false
    setStatus('loading')
    setErrorKey(null)
    fetchWbgt(location.lat, location.lon)
      .then((res) => {
        if (cancelled) return
        setData(res)
        setFetchedAt(Date.now())
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
        setErrorKey('location.forecastFailed')
      })
    return () => {
      cancelled = true
    }
  }, [location, fetchTick])

  const refetch = useCallback(() => {
    setFetchTick((t) => t + 1)
  }, [])

  const applyLocation = useCallback(
    (loc: SavedLocation, method: 'zip' | 'geolocation') => {
      setLocation(loc)
      save(LOCATION_KEY, loc)
      trackLocationSet(method)
      // Re-derive the policy default only when the state actually changed —
      // an explicit user choice within the same state is preserved.
      setPolicyIdState((cur) => {
        const resolved = policyMatchesState(loc.stateAbbr, cur)
          ? cur
          : defaultPolicyFor(loc.stateAbbr)
        save(POLICY_KEY, resolved)
        return resolved
      })
    },
    [],
  )

  const setZip = useCallback(
    async (zip: string) => {
      setStatus('locating')
      setErrorKey(null)
      try {
        const geo = await zipToLocation(zip)
        applyLocation(
          { lat: geo.lat, lon: geo.lon, label: `${geo.city}, ${geo.stateAbbr}`, stateAbbr: geo.stateAbbr },
          'zip',
        )
      } catch (e) {
        setStatus(location ? 'ready' : 'idle')
        const msg = e instanceof Error ? e.message : ''
        setErrorKey(
          msg === 'invalid-zip'
            ? 'location.zipInvalid'
            : msg === 'zip-not-found'
              ? 'location.zipNotFound'
              : 'location.lookupFailed',
        )
      }
    },
    [applyLocation, location],
  )

  const useMyLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setErrorKey('location.geoUnavailable')
      return
    }
    setStatus('locating')
    setErrorKey(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyLocation(
          {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            label: `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`,
            stateAbbr: null,
          },
          'geolocation',
        )
      },
      (err) => {
        setStatus(location ? 'ready' : 'idle')
        setErrorKey(err.code === err.PERMISSION_DENIED ? 'location.geoDenied' : 'location.geoUnavailable')
      },
      { maximumAge: 300_000, timeout: 15_000 },
    )
  }, [applyLocation, location])

  const setPolicyId = useCallback((id: PolicyId) => {
    setPolicyIdState(id)
    save(POLICY_KEY, id)
    // Any explicit UIL pick — from the prompt or from the picker — answers the
    // class question for good.
    if (id.startsWith('uil')) {
      save(UIL_CLASS_KEY, id)
      setUilClassChosen(true)
    }
  }, [])

  const clearLocation = useCallback(() => {
    setLocation(null)
    setData(null)
    setStatus('idle')
    try {
      window.localStorage.removeItem(LOCATION_KEY)
    } catch {
      // ignore
    }
  }, [])

  // When geolocation gave no state, adopt the state NWS reports for the point.
  useEffect(() => {
    if (data && location && !location.stateAbbr && data.location.state) {
      const upgraded: SavedLocation = {
        ...location,
        stateAbbr: data.location.state,
        label: data.location.city ? `${data.location.city}, ${data.location.state}` : location.label,
      }
      setLocation(upgraded)
      save(LOCATION_KEY, upgraded)
      setPolicyIdState((cur) => {
        const resolved = policyMatchesState(upgraded.stateAbbr, cur)
          ? cur
          : defaultPolicyFor(upgraded.stateAbbr)
        save(POLICY_KEY, resolved)
        return resolved
      })
    }
  }, [data, location])

  const policy = useMemo(() => POLICIES[policyId], [policyId])

  return {
    location,
    policy,
    policyId,
    uilClassChosen,
    status,
    data,
    fetchedAt,
    errorKey,
    setZip,
    useMyLocation,
    setPolicyId,
    clearLocation,
    refetch,
  }
}
