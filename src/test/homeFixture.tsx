import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi } from 'vitest'
import Home from '../pages/Home'

/**
 * Shared harness for tests that need Home in its READY state — the state that
 * actually holds the product (verdict card, hourly strip, week strip, log).
 * Several audit findings were about what that state shows and in what order,
 * which is untestable from the idle page.
 */

export function installMemoryStorage(): Map<string, string> {
  const store = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    },
  })
  return store
}

/**
 * A time zone guaranteed to read differently from the machine running the
 * tests — the away-game case, without pinning the suite to one CI locale.
 *
 * Kiritimati is UTC+14 and Midway is UTC-11: 25 hours apart, so no single
 * device zone can agree with both. A test that hardcodes one zone instead
 * silently goes vacuous on any runner that happens to sit in it, which is how
 * "the log stamps the device's clock" survived a timezone fix.
 */
export function awayTimeZone(atMs = Date.now()): string {
  const at = new Date(atMs)
  const shown = (timeZone?: string) =>
    new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(at)
  const device = shown()
  const away = ['Pacific/Kiritimati', 'Pacific/Midway'].find((tz) => shown(tz) !== device)
  if (!away) throw new Error('no away zone differs from the runner — check the ICU build')
  return away
}

export const AUSTIN_TX = {
  lat: 30.27,
  lon: -97.74,
  label: 'Austin, TX',
  stateAbbr: 'TX',
}

function hourly(startMs: number, hours: number, fn: (i: number) => number) {
  const values = []
  for (let i = 0; i < hours; i++) {
    const t = new Date(startMs + i * 3_600_000).toISOString().replace(/\.\d{3}Z$/, '+00:00')
    values.push({ validTime: `${t}/PT1H`, value: fn(i) })
  }
  return values
}

/**
 * Four days of hourly WBGT peaking each afternoon, warm enough that a Texas
 * forecast lands in the restricted bands — the conditions the tool exists for.
 */
export interface FixturePlace {
  city: string
  state: string
}

export function wbgtFixture(
  startMs: number,
  timeZone = 'America/Chicago',
  place: FixturePlace = { city: 'Austin', state: 'TX' },
) {
  return {
    location: { lat: AUSTIN_TX.lat, lon: AUSTIN_TX.lon, city: place.city, state: place.state, timeZone },
    hasWbgt: true,
    wetBulbGlobeTemperature: {
      uom: 'wmoUnit:degC',
      values: hourly(startMs, 96, (i) => 28 + 5 * Math.sin(i / 4)),
    },
    temperature: { uom: 'wmoUnit:degC', values: hourly(startMs, 96, (i) => 32 + 5 * Math.sin(i / 4)) },
    relativeHumidity: { uom: 'wmoUnit:percent', values: hourly(startMs, 96, () => 60) },
    windSpeed: { uom: 'wmoUnit:km_h-1', values: hourly(startMs, 96, () => 10) },
    skyCover: { uom: 'wmoUnit:percent', values: hourly(startMs, 96, () => 30) },
  }
}

/**
 * Stubs fetch for both API routes. AirNow is left failing by default: TX has
 * no verified state air policy, so the gate's unavailable state is exactly
 * what a Texas user sees.
 */
const GRID_URL = 'https://api.weather.gov/gridpoints/EWX/150,90'

/**
 * Stubs every forecast route Home can take. Both lanes are covered because
 * `import.meta.env.DEV` is true under vitest, so useWbgt takes its dev
 * fallback (points→gridpoint against api.weather.gov) rather than /api/wbgt.
 *
 * AirNow is left failing by default: Texas has no verified state air policy,
 * so the gate's unavailable state is exactly what a Texas user sees.
 */
export function stubForecastFetch(
  options: {
    aqi?: unknown
    /** City/state NWS reports for the point — what the geolocation path adopts. */
    place?: FixturePlace
    /**
     * Delays every forecast response by this many ms. With an instant stub
     * React batches the commits around a re-fetch, so a spurious second round
     * trip is invisible to the DOM; a delay makes the intermediate "Loading…"
     * state observable, which is what the reader actually sees.
     */
    delayMs?: number
  } = {},
) {
  const start = Date.now() - 2 * 3_600_000
  const place = options.place ?? { city: 'Austin', state: 'TX' }
  // Plain shapes rather than Response objects: jsdom ships no fetch, and the
  // callers only touch `.ok` and `.json()`.
  const ok = (body: unknown) => {
    const res = { ok: true, status: 200, json: async () => body }
    if (!options.delayMs) return Promise.resolve(res)
    return new Promise<typeof res>((resolve) => setTimeout(() => resolve(res), options.delayMs))
  }
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      const fixture = wbgtFixture(start, 'America/Chicago', place)
      if (url.includes('/api/wbgt')) return ok(fixture)
      if (url.includes('/points/')) {
        return ok({
          properties: {
            forecastGridData: GRID_URL,
            timeZone: fixture.location.timeZone,
            relativeLocation: { properties: { city: place.city, state: place.state } },
          },
        })
      }
      if (url.startsWith(GRID_URL)) {
        return ok({
          properties: {
            wetBulbGlobeTemperature: fixture.wetBulbGlobeTemperature,
            temperature: fixture.temperature,
            relativeHumidity: fixture.relativeHumidity,
            windSpeed: fixture.windSpeed,
            skyCover: fixture.skyCover,
          },
        })
      }
      if (url.includes('/api/aqi')) {
        if (options.aqi === undefined) return Promise.reject(new Error('no aqi in test'))
        return ok(options.aqi)
      }
      return Promise.reject(new Error(`unstubbed fetch: ${url}`))
    }),
  )
}

/** A clean AirNow reading for an area with no verified state policy. */
export function aqiFixture() {
  return {
    area: { name: 'Austin', state: 'TX', lat: 30.27, lon: -97.74, distanceKm: 6 },
    observed: { date: '08/10/26', time: '09:00', timeZone: 'CDT', epochMs: Date.now() },
    overall: { aqi: 42, category: 'Good', parameter: 'PM2.5' },
    pm25: { aqi: 42, category: 'Good', parameter: 'PM2.5' },
    agencies: ['Texas Commission on Environmental Quality'],
    preliminary: true,
  }
}

export function renderHome(lang = 'en') {
  return render(
    <MemoryRouter initialEntries={[`/${lang}`]}>
      <Routes>
        <Route path="/:lang" element={<Home />} />
      </Routes>
    </MemoryRouter>,
  )
}
