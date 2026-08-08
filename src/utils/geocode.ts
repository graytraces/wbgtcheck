/**
 * ZIP → coordinates via zippopotam.us.
 *
 * Chosen over the Census Bureau geocoder: both are key-free, but zippopotam
 * answers a bare ZIP directly (Census's geocoder wants full street addresses
 * plus a benchmark parameter and its ZIP-only matching is unreliable),
 * responds with open CORS, and returns the state abbreviation in the same
 * call — which we need to auto-select the policy layer. Trade-off: it
 * resolves the ZIP centroid, which is exactly the granularity a 2.5 km NWS
 * grid cell needs.
 */

export interface GeocodeResult {
  lat: number
  lon: number
  city: string
  stateAbbr: string
}

export async function zipToLocation(zip: string): Promise<GeocodeResult> {
  const cleaned = zip.trim()
  if (!/^\d{5}$/.test(cleaned)) {
    throw new Error('invalid-zip')
  }
  const res = await fetch(`https://api.zippopotam.us/us/${cleaned}`)
  if (res.status === 404) throw new Error('zip-not-found')
  if (!res.ok) throw new Error('zip-lookup-failed')
  const data = (await res.json()) as {
    places?: Array<{
      'place name': string
      latitude: string
      longitude: string
      'state abbreviation': string
    }>
  }
  const place = data.places?.[0]
  if (!place) throw new Error('zip-not-found')
  return {
    lat: Number(place.latitude),
    lon: Number(place.longitude),
    city: place['place name'],
    stateAbbr: place['state abbreviation'],
  }
}
