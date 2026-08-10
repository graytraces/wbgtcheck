import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react'
import i18n from '../i18n'
import en from '../locales/en.json'
import { useWbgt } from '../hooks/useWbgt'
import {
  installMemoryStorage,
  stubForecastFetch,
  renderHome,
  aqiFixture,
  AUSTIN_TX,
} from '../test/homeFixture'

/**
 * Re-applying the coordinates you are ALREADY on stranded the page in
 * "Loading…" for good.
 *
 * The fetch effect is keyed on the point (`[lat, lon, fetchTick]`) so the NWS
 * state adoption cannot trigger a second round trip. But `setZip` and
 * `useMyLocation` set `status = 'locating'` unconditionally and that effect is
 * the ONLY code that leaves the state. When the incoming point equals the
 * current one the deps do not change, the effect never re-runs, and `status`
 * is pinned at 'locating' — Home renders `{location && busy && <Loading/>}`
 * and gates the verdict on `status === 'ready'`, so the entire ready page is
 * replaced by "Loading…" with no error, no retry (that branch needs
 * `status === 'error'`) and no way out but a page reload.
 *
 * Both triggers are ordinary:
 *   - open the inline editor and retype the ZIP you are on — `zipToLocation`
 *     is a deterministic centroid lookup, so the coordinates are identical;
 *   - tap "Use my location" twice within five minutes — `useMyLocation` passes
 *     `{ maximumAge: 300_000 }`, so the browser hands back the cached
 *     position, identical by construction. The geolocation button sits inside
 *     the editor, where re-tapping reads as a refresh gesture.
 */

let store: Map<string, string>

const AUSTIN_ZIP = '78701'
const AUSTIN_ZIPS = {
  [AUSTIN_ZIP]: { lat: AUSTIN_TX.lat, lon: AUSTIN_TX.lon, city: 'Austin', stateAbbr: 'TX' },
}

function stubGeolocation(lat = AUSTIN_TX.lat, lon = AUSTIN_TX.lon) {
  const getCurrentPosition = vi.fn((success: PositionCallback) => {
    success({ coords: { latitude: lat, longitude: lon } } as GeolocationPosition)
  })
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  })
  return getCurrentPosition
}

function urlsFetched() {
  const mock = globalThis.fetch as unknown as { mock: { calls: unknown[][] } }
  return mock.mock.calls.map((call) => String(call[0]))
}

const gridpoints = () => urlsFetched().filter((url) => url.includes('/gridpoints/')).length

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  store = installMemoryStorage()
  window.sessionStorage.clear()
  // Already located and already past the UIL class question: the defect needs
  // a reader who is on the ready page before they touch the editor.
  store.set('wbgt-location', JSON.stringify(AUSTIN_TX))
  store.set('wbgt-uil-class', JSON.stringify('uil-class-3'))
  store.set('wbgt-policy', JSON.stringify('uil-class-3'))
  stubGeolocation()
  stubForecastFetch({ aqi: aqiFixture(), zips: AUSTIN_ZIPS })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** The ready page is on screen when the hourly strip's heading is. */
const readyPage = () => screen.queryByText(en.verdict.todayHeading)

/**
 * The verdict card carries the dotted-underline "Change location" beside the
 * place name; a second copy sits further down the page. The first is the one
 * a reader taps, and both open the same editor.
 */
const openEditor = () =>
  fireEvent.click(screen.getAllByRole('button', { name: en.location.change })[0])

async function renderReady() {
  renderHome()
  await waitFor(() => expect(readyPage()).toBeInTheDocument())
}

describe('re-submitting the point you are already on', () => {
  it('comes back from the ZIP you are already on instead of hanging on Loading', async () => {
    await renderReady()

    openEditor()
    fireEvent.change(screen.getByLabelText(en.location.zipPlaceholder), {
      target: { value: AUSTIN_ZIP },
    })
    fireEvent.click(screen.getByRole('button', { name: en.location.zipButton }))

    // The verdict must return. Before the fix the page sat in "Loading…"
    // forever: no error branch, no retry, nothing but a reload.
    await waitFor(() => expect(readyPage(), 'the ready page never came back').toBeInTheDocument())
    expect(screen.queryByText(en.common.loading)).not.toBeInTheDocument()
  })

  it('comes back from a second "Use my location" inside the 5-minute cache window', async () => {
    await renderReady()

    openEditor()
    fireEvent.click(screen.getByRole('button', { name: en.location.geoButton }))

    await waitFor(() => expect(readyPage(), 'the ready page never came back').toBeInTheDocument())
    expect(screen.queryByText(en.common.loading)).not.toBeInTheDocument()
  })

  it('leaves the status terminal, and asks upstream for nothing it already has', async () => {
    const { result } = renderHook(() => useWbgt())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(gridpoints()).toBe(1)

    await act(async () => {
      result.current.useMyLocation()
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    // The point did not move and the forecast for it is in hand, so the
    // deliberate no-refetch decision stands: this is a restore, not a reload.
    expect(gridpoints(), 'the same point was fetched again').toBe(1)
    expect(result.current.data).not.toBeNull()
  })

  it('re-fetches instead of pinning "Loading…" when the forecast never arrived', async () => {
    // The status must be terminal, but "restore what we had" is only right
    // when we HAVE it. After a failed forecast there is nothing to go back to,
    // so the re-submission has to mean retry — otherwise the fix trades a
    // permanent 'locating' for a permanent 'loading', which has no retry
    // affordance either.
    const live = globalThis.fetch as unknown as (input: string) => Promise<unknown>
    let forecastFails = true
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (forecastFails && (url.includes('/points/') || url.includes('/gridpoints/'))) {
          return Promise.reject(new Error('upstream down'))
        }
        return live(url)
      }),
    )

    const { result } = renderHook(() => useWbgt())
    await waitFor(() => expect(result.current.status).toBe('error'))

    forecastFails = false
    await act(async () => {
      await result.current.setZip(AUSTIN_ZIP)
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.data).not.toBeNull()
  })
})

/**
 * The same code path decides what "the same point" keeps. The geolocation
 * branch labels a point with its coordinates and `stateAbbr: null` — the
 * browser reports nothing else — and the NWS state adoption fills both in
 * afterwards. Re-applying the raw geolocation result over an already-adopted
 * location therefore un-adopts it, and `applyLocation` re-derives the policy
 * from `stateAbbr: null`: an explicit UIL Class 3 choice silently becomes the
 * Class 2 default. Nothing on screen says so; the flags just change.
 */
describe('re-locating to the same point keeps what is known about it', () => {
  /**
   * One test, not two: the place name comes back on its own either way, since
   * the adoption effect simply re-runs over the un-adopted location. The
   * policy does not — re-derivation from a null state resolves to the state
   * DEFAULT, so the reader's own choice is gone and nothing on screen says so.
   */
  it('keeps the adopted state, its place name, and the policy chosen for it', async () => {
    const { result } = renderHook(() => useWbgt())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.policyId).toBe('uil-class-3')

    await act(async () => {
      result.current.useMyLocation()
    })
    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(result.current.location?.label).toBe('Austin, TX')
    expect(result.current.location?.stateAbbr).toBe('TX')
    expect(result.current.policyId, 'the reader was downgraded to the default').toBe('uil-class-3')
    expect(JSON.parse(store.get('wbgt-policy') ?? '""')).toBe('uil-class-3')
  })
})
