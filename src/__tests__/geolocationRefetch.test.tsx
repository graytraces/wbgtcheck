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
 * "Use my location" fetched the forecast twice and blanked the ready page.
 *
 * The geolocation path saves `stateAbbr: null`, because the browser hands back
 * coordinates and nothing else. When the forecast lands, useWbgt adopts the
 * state NWS reports for the point and calls `setLocation` with a NEW object —
 * same coordinates, filled-in state and city label. The fetch effect was keyed
 * on that object's identity, so it tore down and re-ran: `setStatus('loading')`
 * and a second full upstream round trip (points + gridpoint again).
 *
 * What the reader saw: tap the primary CTA, get the verdict, and then watch the
 * entire ready page — verdict card, hourly strip, week strip, log — replaced by
 * "Loading…" for one network round trip before it came back.
 *
 * The forecast is delayed here on purpose. With an instant stub React batches
 * the two commits and the flash never reaches the DOM, which is why none of the
 * existing Home tests could see this.
 */

let store: Map<string, string>

const DALLAS = { lat: 32.78, lon: -96.8 }
/** What useWbgt labels a geolocated point before NWS names it. */
const coordLabel = (lat: number, lon: number) => `${lat.toFixed(2)}, ${lon.toFixed(2)}`

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
  // No saved location: the geolocation button is the way in, and that is the
  // path carrying the defect.
  store.set('wbgt-uil-class', JSON.stringify('uil-class-3'))
  stubGeolocation()
  stubForecastFetch({ aqi: aqiFixture(), delayMs: 15 })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('use my location', () => {
  it('adopts the NWS state without re-fetching the forecast', async () => {
    renderHome()
    fireEvent.click(screen.getByRole('button', { name: en.location.geoButton }))

    // First ready: the point has no state yet, so the card is labeled with the
    // coordinates.
    await waitFor(() =>
      expect(screen.getByText(coordLabel(AUSTIN_TX.lat, AUSTIN_TX.lon))).toBeInTheDocument(),
    )
    // Then the state upgrade lands and the label becomes the place name.
    await waitFor(() => expect(screen.getByText('Austin, TX')).toBeInTheDocument())

    // One trip upstream, not two. The upgrade does not move the point, so it
    // cannot need a new forecast.
    expect(
      urlsFetched().filter((url) => url.includes('/points/')),
      'the points lookup ran twice for one location',
    ).toHaveLength(1)
    expect(gridpoints(), 'the gridpoint forecast was fetched twice').toBe(1)

    // And the state really was adopted — this must not pass by the upgrade
    // simply never happening.
    expect(JSON.parse(store.get('wbgt-location') ?? '{}').stateAbbr).toBe('TX')
  })

  it('never puts the ready page back into Loading', async () => {
    renderHome()
    fireEvent.click(screen.getByRole('button', { name: en.location.geoButton }))
    await waitFor(() =>
      expect(screen.getByText(coordLabel(AUSTIN_TX.lat, AUSTIN_TX.lon))).toBeInTheDocument(),
    )

    // From the moment the verdict is on screen, watch every commit. The flash
    // lasts a full round trip, so it cannot hide between mutation records.
    let blankedAfterReady = false
    const observer = new MutationObserver(() => {
      if (screen.queryByText(en.common.loading)) blankedAfterReady = true
    })
    observer.observe(document.body, { subtree: true, childList: true, characterData: true })
    try {
      await waitFor(() => expect(screen.getByText('Austin, TX')).toBeInTheDocument())
      // Time for a spurious refetch to have started and shown itself.
      await new Promise((resolve) => setTimeout(resolve, 40))
    } finally {
      observer.disconnect()
    }

    expect(blankedAfterReady, 'the ready page was replaced by "Loading…"').toBe(false)
    expect(screen.getByText('Austin, TX')).toBeInTheDocument()
    expect(screen.queryByText(en.common.loading)).not.toBeInTheDocument()
  })
})

/**
 * Keying the effect on the coordinates must not cost the two things that
 * legitimately re-fetch: the staleness banner's refresh, and moving.
 */
describe('what still re-fetches after the fix', () => {
  it('refresh asks upstream again for the same point', async () => {
    store.set('wbgt-location', JSON.stringify(AUSTIN_TX))
    const { result } = renderHook(() => useWbgt())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(gridpoints()).toBe(1)

    act(() => result.current.refetch())
    await waitFor(() => expect(gridpoints()).toBe(2))
  })

  it('moving to a new point fetches that point', async () => {
    store.set('wbgt-location', JSON.stringify(AUSTIN_TX))
    const { result } = renderHook(() => useWbgt())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(gridpoints()).toBe(1)

    stubGeolocation(DALLAS.lat, DALLAS.lon)
    act(() => result.current.useMyLocation())
    await waitFor(() => expect(gridpoints()).toBe(2))
    expect(result.current.location?.lat).toBe(DALLAS.lat)
    expect(urlsFetched().some((url) => url.includes(`/points/${DALLAS.lat.toFixed(2)}`))).toBe(true)
  })
})
