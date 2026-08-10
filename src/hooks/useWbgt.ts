import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WbgtApiResponse } from '../utils/nws'
import { zipToLocation } from '../utils/geocode'
import { fetchWithTimeout } from '../utils/fetchWithTimeout'
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
  /**
   * California is Texas's shape, not Florida's, and the default follows the
   * Texas rule rather than the Florida one.
   *
   * CIF runs three ladders and assigns each school a region category this site
   * cannot read, so any unasked selection is a guess — and the guess must be
   * the STRICT end of the spread. Category 1 stops outdoor activity where
   * Category 3 still says "use discretion" (CIF_SPREAD_EXAMPLE_F), so a
   * Californian who never answers is never told they may do more than their
   * own category allows. CifCategoryPrompt asks above the verdict so the guess
   * announces itself rather than passing for a finding.
   *
   * ⚠️ Never relax this to Category 2 or 3, and never leave California on
   * 'generic': the NATA fallback is more permissive than all three CIF ladders
   * at every band, so falling back to it would make "we did not ask yet" the
   * most permissive answer on the site.
   */
  if (stateAbbr === 'CA') return 'cif-cat-1'
  if (stateAbbr === 'GA') return 'ghsa'
  // Both verified safe to auto-select: SCHSL's thresholds equal the generic
  // NATA bands with warnings added on top; Iowa's are stricter than generic.
  if (stateAbbr === 'SC') return 'schsl'
  if (stateAbbr === 'IA') return 'iowa'
  // MIAA is one statewide policy with no sub-categories, and every one of its
  // bands is stricter than the generic fallback — safe to select on arrival.
  if (stateAbbr === 'MA') return 'miaa'
  /**
   * Florida gets FHSAA §41.8, the PRACTICE index, and the choice is safe in
   * the direction that matters rather than merely available.
   *
   * Policy 41 is two ladders (see FHSAA_CONTEST_* in policyData.js) and this
   * tool does not ask which one the reader is in. Selecting the practice one
   * is not a coin flip: §41.8 is the stricter of the two at every band and
   * forbids outdoor activity at its top, while §41.9.5's hottest band
   * prescribes hydration breaks and contains no band that stops a contest at
   * all. So an unasked Florida reader gets the conservative answer, never the
   * permissive one. Do not flip this to a contest ladder without adding the
   * question first — that would be the Texas class prompt in reverse.
   *
   * ⚠️ Unlike MIAA and Iowa above, this default is NOT uniformly stricter than
   * the generic NATA fallback it replaces, and the note would be dishonest if
   * it claimed otherwise. At exactly 87.0 and exactly 90.0 — two readings out
   * of every tenth in the published range — FHSAA reads one band cooler,
   * because FHSAA prints those temperatures as the TOP of the band below
   * ("82.1 - 87.0", "87.1 - 90.0") while NATA prints them as the bottom of the
   * band above. Both sites are faithful to their own chart. The reason to
   * select FHSAA anyway is not that it is stricter but that it GOVERNS: a
   * Florida school answers to Policy 41, and a generic table it never adopted
   * is not a safer answer for being two tenths more cautious.
   * policyDefaults.test.ts pins both edges so neither can move unnoticed.
   */
  if (stateAbbr === 'FL') return 'fhsaa'
  return 'generic'
}

/** True when `policyId` belongs to `stateAbbr` — explicit choices within a state survive re-location. */
export function policyMatchesState(stateAbbr: string | null, policyId: PolicyId): boolean {
  if (stateAbbr === 'TX') return policyId.startsWith('uil')
  // Any of the three CIF categories is a California choice, exactly as either
  // UIL class is a Texas one: re-entering a California ZIP must not throw away
  // the category the reader answered the prompt with.
  if (stateAbbr === 'CA') return policyId.startsWith('cif-cat')
  if (stateAbbr === 'GA') return policyId === 'ghsa'
  if (stateAbbr === 'SC') return policyId === 'schsl'
  if (stateAbbr === 'IA') return policyId === 'iowa'
  if (stateAbbr === 'MA') return policyId === 'miaa'
  if (stateAbbr === 'FL') return policyId === 'fhsaa'
  // TSSAA is a picker option that is never auto-selected, so it was missing
  // here: a Tennessee reader who chose it lost the choice on the next ZIP
  // entry and silently fell back to generic. The flags are identical, so
  // nothing looked wrong — what goes is the guideline wording and the policy
  // name on the share card.
  if (stateAbbr === 'TN') return policyId === 'tssaa'
  return false
}

/**
 * GeolocationPositionError → the message that tells the user what to DO.
 *
 * The codes are fixed by spec (1 denied, 2 unavailable, 3 timeout) and are
 * compared as literals on purpose. The previous test read `err.code ===
 * err.PERMISSION_DENIED`, a constant that lives on the error object itself —
 * any polyfilled or non-standard error lacking it turned a denial into
 * "Location is unavailable on this device", which sends someone to check their
 * hardware when the fix is a permission prompt they dismissed. A timeout got
 * the same wrong message; it now has its own, since retrying is worth
 * suggesting there and pointless for the other two.
 */
export function geolocationErrorKey(code: number): string {
  if (code === 1) return 'location.geoDenied'
  if (code === 3) return 'location.geoTimeout'
  return 'location.geoUnavailable'
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
  const points = await fetchWithTimeout(
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
  const grid = await fetchWithTimeout(points.properties.forecastGridData, { headers: NWS_HEADERS }).then(
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

/** Identity of a forecast point — see `loadedPointRef` in the hook. */
function pointKey(lat: number, lon: number): string {
  return `${lat},${lon}`
}

async function fetchWbgt(lat: number, lon: number): Promise<WbgtApiResponse> {
  if (import.meta.env.DEV) return fetchWbgtDev(lat, lon)
  const res = await fetchWithTimeout(`/api/wbgt?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`)
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
  /**
   * California's answer, and it is deliberately NOT a stored key.
   *
   * Texas gets one (UIL_CLASS_KEY) because POLICY_KEY cannot tell "defaulted
   * to Class 2" from "chose Class 2". California has the same ambiguity and a
   * cheaper way out of most of it: the prompt only ever renders while the
   * flags on screen really ARE the unanswered default, so anyone who picked
   * Category 2 or 3 is recognised across visits by POLICY_KEY alone, and the
   * "until you choose" sentence is true whenever the prompt is up.
   *
   * What that costs is one group: a school genuinely on Category 1 is asked
   * again on the next visit, because choosing the default leaves no trace to
   * distinguish it from not answering. Clicking the same button again is a
   * no-op and the sentence beside it is still true, so the cost is repetition
   * rather than a wrong flag.
   *
   * Closing it properly means a new localStorage key, and privacyDisclosure
   * .test.tsx correctly refuses any storage key the privacy page does not
   * describe — that page's copy is outside this change. Do not add the key
   * without adding its sentence to privacy.storageContent in both locales.
   */
  const [cifCategoryChosenHere, setCifCategoryChosenHere] = useState(false)
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

  /**
   * The forecast is keyed on the POINT, not on the identity of the location
   * object.
   *
   * The state-adoption effect at the bottom of this hook replaces `location`
   * with a new object carrying the same coordinates — it only fills in the
   * state abbreviation and the city label NWS reported. With `[location]` as
   * the dependency, that swap tore this effect down and re-ran it: a reader
   * who tapped "Use my location" got the verdict, and then watched the whole
   * ready page turn back into "Loading…" for one more upstream round trip
   * (points + gridpoint, twice). Nothing in the upgrade moves the point, so
   * nothing in it needs a new forecast.
   *
   * The refresh button still forces one through `fetchTick`.
   */
  const lat = location?.lat ?? null
  const lon = location?.lon ?? null
  /**
   * The point `data` is a forecast FOR, written only when one lands.
   *
   * `data !== null` cannot answer that question: after a move whose forecast
   * failed, `data` still holds the PREVIOUS point's numbers. This is a heat
   * safety tool, so the one thing it must never do is show one town's WBGT
   * under another town's name — hence a key rather than a truthiness check.
   */
  const loadedPointRef = useRef<string | null>(null)
  useEffect(() => {
    if (lat === null || lon === null) return
    let cancelled = false
    setStatus('loading')
    setErrorKey(null)
    fetchWbgt(lat, lon)
      .then((res) => {
        if (cancelled) return
        loadedPointRef.current = pointKey(lat, lon)
        setData(res)
        setFetchedAt(Date.now())
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        loadedPointRef.current = null
        setStatus('error')
        setErrorKey('location.forecastFailed')
      })
    return () => {
      cancelled = true
    }
  }, [lat, lon, fetchTick])

  const refetch = useCallback(() => {
    setFetchTick((t) => t + 1)
  }, [])

  const applyLocation = useCallback(
    (incoming: SavedLocation, method: 'zip' | 'geolocation') => {
      /**
       * Re-applying the point the reader is ALREADY on.
       *
       * `setZip` and `useMyLocation` both set `status = 'locating'` before they
       * know where they are going, and the fetch effect above — deliberately
       * keyed on the POINT — is the only code that ever leaves that state. When
       * the incoming coordinates equal the current ones, its deps do not
       * change, so it never re-runs and `status` stays 'locating' forever: Home
       * replaces the whole ready page with "Loading…", and neither escape it
       * offers (the retry lives in the `'error'` branch, the refresh in the
       * `'ready'` one) is reachable. Only a reload gets out.
       *
       * Two ordinary gestures land here. Retyping the ZIP you are on returns
       * the same centroid by construction, and tapping "Use my location" twice
       * inside `maximumAge` returns the browser's cached position — bit for
       * bit the same reading.
       */
      const samePoint =
        location !== null && location.lat === incoming.lat && location.lon === incoming.lon
      /**
       * Nor may re-applying it FORGET anything. The geolocation path knows only
       * coordinates: it labels the point with them and saves `stateAbbr: null`,
       * and the NWS state adoption below fills both in afterwards. Re-applying
       * that raw result over an adopted location un-adopts it — and with a null
       * state the policy re-derivation below falls back to the state default,
       * so a Texas coach who explicitly chose UIL Class 3 was silently moved to
       * the Class 2 default by tapping the location button a second time.
       */
      const loc: SavedLocation = samePoint
        ? { ...incoming, label: location.label, stateAbbr: location.stateAbbr ?? incoming.stateAbbr }
        : incoming
      if (samePoint) {
        // Restore the terminal status the fetch effect will not. Restoring
        // 'ready' is only honest when the forecast for this exact point is in
        // hand; when it is not (the first attempt failed), re-submitting can
        // only mean retry — otherwise the pin merely moves from 'locating' to
        // 'loading', which has no way out either.
        if (loadedPointRef.current === pointKey(incoming.lat, incoming.lon)) setStatus('ready')
        else setFetchTick((t) => t + 1)
      }
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
    [location],
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
        setErrorKey(geolocationErrorKey(err.code))
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
    // Same contract for California's region category, including the strict
    // default: choosing Category 1 from the prompt is a CHOICE, and must stop
    // the question being asked again even though it selects what was already
    // on screen. Session-scoped — see cifCategoryChosenHere above.
    if (id.startsWith('cif-cat')) setCifCategoryChosenHere(true)
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

  /**
   * Whether California's category question is settled — and therefore whether
   * the prompt may be hidden.
   *
   * The second clause is what makes the first one unnecessary most of the
   * time: anything other than the unanswered default IS an answer, whether it
   * came from the prompt, the picker, or a previous visit through POLICY_KEY.
   * Gating on this also guarantees the prompt's "until you choose, every flag
   * uses the strictest ladder" line is never on screen beside a flag from some
   * other ladder — including for a Californian who moved the picker to NATA.
   */
  const cifCategoryChosen =
    cifCategoryChosenHere || policyId !== defaultPolicyFor('CA')

  return {
    location,
    policy,
    policyId,
    uilClassChosen,
    cifCategoryChosen,
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
