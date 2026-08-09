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
export function wbgtFixture(startMs: number, timeZone = 'America/Chicago') {
  return {
    location: { lat: AUSTIN_TX.lat, lon: AUSTIN_TX.lon, city: 'Austin', state: 'TX', timeZone },
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
export function stubForecastFetch(options: { aqi?: unknown } = {}) {
  const start = Date.now() - 2 * 3_600_000
  // Plain shapes rather than Response objects: jsdom ships no fetch, and the
  // callers only touch `.ok` and `.json()`.
  const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: async () => body })
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      const fixture = wbgtFixture(start)
      if (url.includes('/api/wbgt')) return ok(fixture)
      if (url.includes('/points/')) {
        return ok({
          properties: {
            forecastGridData: GRID_URL,
            timeZone: fixture.location.timeZone,
            relativeLocation: { properties: { city: 'Austin', state: 'TX' } },
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

export function renderHome(lang = 'en') {
  return render(
    <MemoryRouter initialEntries={[`/${lang}`]}>
      <Routes>
        <Route path="/:lang" element={<Home />} />
      </Routes>
    </MemoryRouter>,
  )
}
