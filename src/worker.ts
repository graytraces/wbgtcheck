import { SUPPORTED_LANGS, isValidPath } from './utils/routeValidation'
import { AIRNOW_REPORTING_AREA_URL, buildAqiPayload, parseReportingArea } from './utils/airnow'

const SUPPORTED_LANGS_SET = new Set<string>(SUPPORTED_LANGS)
const HSTS = 'max-age=31536000; includeSubDomains; preload'

// NWS api.weather.gov requires an identifying User-Agent (see
// weather.gov/documentation/services-web-api "Authentication").
const NWS_USER_AGENT = 'wbgtcheck.com (cardi.workshop@gmail.com)'
// AirNow states no User-Agent requirement, but the Data Exchange Guidelines
// ask that data users stay contactable about schema changes — so identify
// ourselves on that fetch too.
const AIRNOW_USER_AGENT = NWS_USER_AGENT
const NWS_API = 'https://api.weather.gov'
// Edge cache TTL for /api/wbgt responses. NWS gridpoint forecasts update
// roughly hourly; 10 minutes keeps readings fresh while absorbing team-wide
// traffic bursts (whole team opening the same link after a share).
const WBGT_CACHE_SECONDS = 600
// AirNow refreshes reportingarea.dat hourly (:25 and :55 in practice), so an
// hour of edge cache is the natural granularity — nothing fresher exists
// upstream. Applied to both the raw file and the per-coordinate response.
const AQI_CACHE_SECONDS = 3600

function detectLanguage(acceptLanguage: string | null): string {
  if (!acceptLanguage) return 'en'
  const langs = acceptLanguage
    .split(',')
    .map((l) => l.trim().split(';')[0].trim().toLowerCase().split('-')[0])
  for (const lang of langs) {
    if (SUPPORTED_LANGS_SET.has(lang)) return lang
  }
  return 'en'
}

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

interface NwsLayer {
  uom?: string
  values?: Array<{ validTime: string; value: number | null }>
}

// Trim the (large) NWS gridpoint payload down to the layers the client needs.
// wetBulbGlobeTemperature is absent on some NWS office grids (confirmed: EWX /
// Austin–San Antonio) — hasWbgt lets the client switch to the Liljegren
// estimate path without probing.
function slimGridpoint(props: Record<string, unknown>) {
  const pick = (k: string): NwsLayer | null => {
    const layer = props[k] as NwsLayer | undefined
    if (!layer || !Array.isArray(layer.values) || layer.values.length === 0) return null
    return { uom: layer.uom, values: layer.values }
  }
  const wbgt = pick('wetBulbGlobeTemperature')
  return {
    hasWbgt: wbgt !== null,
    wetBulbGlobeTemperature: wbgt,
    temperature: pick('temperature'),
    relativeHumidity: pick('relativeHumidity'),
    windSpeed: pick('windSpeed'),
    skyCover: pick('skyCover'),
  }
}

/**
 * Shared lat/lon validation for the data routes. Coordinates are rounded to
 * 2 decimals (~1 km) so nearby requests collapse onto one cache entry — NWS
 * grid cells are 2.5 km and AirNow reporting areas are far coarser still.
 */
function parseCoords(url: URL): { lat: string; lon: string } | { error: Response } {
  const latParam = url.searchParams.get('lat')
  const lonParam = url.searchParams.get('lon')
  if (latParam === null || latParam === '' || lonParam === null || lonParam === '') {
    return { error: jsonError('lat and lon query parameters are required numbers', 400) }
  }
  const latRaw = Number(latParam)
  const lonRaw = Number(lonParam)
  // NWS and AirNow both cover US states + territories; this box (incl.
  // AK/HI/PR/GU) rejects junk input before it reaches an upstream API.
  if (!Number.isFinite(latRaw) || !Number.isFinite(lonRaw)) {
    return { error: jsonError('lat and lon query parameters are required numbers', 400) }
  }
  if (latRaw < -15 || latRaw > 72 || lonRaw < -180 || lonRaw > 180) {
    return { error: jsonError('coordinates out of range', 400) }
  }
  return { lat: latRaw.toFixed(2), lon: lonRaw.toFixed(2) }
}

async function handleWbgtApi(url: URL, ctx?: ExecutionContext): Promise<Response> {
  const coords = parseCoords(url)
  if ('error' in coords) return coords.error
  const { lat, lon } = coords

  const cacheKey = new Request(`https://wbgtcheck.com/api/wbgt?lat=${lat}&lon=${lon}`)
  const cache = typeof caches !== 'undefined' ? (caches as unknown as { default: Cache }).default : undefined
  if (cache) {
    const hit = await cache.match(cacheKey)
    if (hit) return hit
  }

  const nwsHeaders = { 'User-Agent': NWS_USER_AGENT, Accept: 'application/geo+json' }

  const pointsRes = await fetch(`${NWS_API}/points/${lat},${lon}`, { headers: nwsHeaders })
  if (!pointsRes.ok) {
    return jsonError(`NWS points lookup failed (${pointsRes.status})`, 502)
  }
  const points = (await pointsRes.json()) as {
    properties?: {
      forecastGridData?: string
      timeZone?: string
      relativeLocation?: { properties?: { city?: string; state?: string } }
    }
  }
  const gridUrl = points.properties?.forecastGridData
  if (!gridUrl || !gridUrl.startsWith(NWS_API)) {
    return jsonError('NWS points response missing grid data URL', 502)
  }

  const gridRes = await fetch(gridUrl, { headers: nwsHeaders })
  if (!gridRes.ok) {
    return jsonError(`NWS gridpoint fetch failed (${gridRes.status})`, 502)
  }
  const grid = (await gridRes.json()) as { properties?: Record<string, unknown> }
  if (!grid.properties) {
    return jsonError('NWS gridpoint response missing properties', 502)
  }

  const body = JSON.stringify({
    location: {
      lat: Number(lat),
      lon: Number(lon),
      city: points.properties?.relativeLocation?.properties?.city ?? null,
      state: points.properties?.relativeLocation?.properties?.state ?? null,
      timeZone: points.properties?.timeZone ?? null,
    },
    ...slimGridpoint(grid.properties),
  })
  const res = new Response(body, {
    headers: {
      'content-type': 'application/json',
      'cache-control': `public, max-age=${WBGT_CACHE_SECONDS}`,
      'access-control-allow-origin': '*',
    },
  })
  if (cache) {
    const put = cache.put(cacheKey, res.clone()).catch(() => {})
    if (ctx) ctx.waitUntil(put)
  }
  return res
}

/**
 * Current AQI for the reporting area nearest the caller's field.
 *
 * Two cache layers: the 2 MB upstream file is cached once per hour under a
 * fixed key (so a whole team opening the same link costs one upstream fetch
 * per colo, not one per coordinate), and each coordinate's JSON is cached for
 * the same hour.
 */
async function handleAqiApi(url: URL, ctx?: ExecutionContext): Promise<Response> {
  const coords = parseCoords(url)
  if ('error' in coords) return coords.error
  const { lat, lon } = coords

  const cache =
    typeof caches !== 'undefined' ? (caches as unknown as { default: Cache }).default : undefined

  const cacheKey = new Request(`https://wbgtcheck.com/api/aqi?lat=${lat}&lon=${lon}`)
  if (cache) {
    const hit = await cache.match(cacheKey)
    if (hit) return hit
  }

  const rawKey = new Request('https://wbgtcheck.com/__airnow/reportingarea.dat')
  let text: string | null = null
  if (cache) {
    const rawHit = await cache.match(rawKey)
    if (rawHit) text = await rawHit.text()
  }
  if (text === null) {
    const upstream = await fetch(AIRNOW_REPORTING_AREA_URL, {
      headers: { 'User-Agent': AIRNOW_USER_AGENT },
    })
    if (!upstream.ok) {
      return jsonError(`AirNow reporting area fetch failed (${upstream.status})`, 502)
    }
    text = await upstream.text()
    if (cache) {
      const stored = new Response(text, {
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': `public, max-age=${AQI_CACHE_SECONDS}`,
        },
      })
      const put = cache.put(rawKey, stored).catch(() => {})
      if (ctx) ctx.waitUntil(put)
    }
  }

  const payload = buildAqiPayload(parseReportingArea(text), Number(lat), Number(lon))
  if (payload === null) {
    return jsonError('no AirNow reporting area with current observations', 503)
  }

  const res = new Response(JSON.stringify(payload), {
    headers: {
      'content-type': 'application/json',
      'cache-control': `public, max-age=${AQI_CACHE_SECONDS}`,
      'access-control-allow-origin': '*',
    },
  })
  if (cache) {
    const put = cache.put(cacheKey, res.clone()).catch(() => {})
    if (ctx) ctx.waitUntil(put)
  }
  return res
}

export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    // Normalize: http→https, www→non-www, trailing slash — combined into single 301
    const needsNormalize =
      url.protocol === 'http:' ||
      url.hostname.startsWith('www.') ||
      (url.pathname.length > 1 && url.pathname.endsWith('/'))
    if (needsNormalize) {
      url.protocol = 'https:'
      if (url.hostname.startsWith('www.')) url.hostname = url.hostname.slice(4)
      if (url.pathname.length > 1 && url.pathname.endsWith('/'))
        url.pathname = url.pathname.slice(0, -1)
      return new Response(null, {
        status: 301,
        headers: { Location: url.toString(), 'Strict-Transport-Security': HSTS },
      })
    }

    // NWS proxy — before all routing/validation so it can never collide with
    // page routes. Keeps the NWS User-Agent requirement server-side and adds
    // ~10 min edge caching.
    if (url.pathname === '/api/wbgt') {
      return handleWbgtApi(url, ctx)
    }

    // AirNow AQI proxy — same reasoning as /api/wbgt: keeps the hourly
    // upstream file on the edge instead of shipping 2 MB to every client.
    if (url.pathname === '/api/aqi') {
      return handleAqiApi(url, ctx)
    }

    const path = url.pathname

    // Static files (sitemap.xml, robots.txt, favicon.ico, etc.) — pass directly to ASSETS
    if (/\.\w+$/.test(path)) {
      return env.ASSETS.fetch(new Request(new URL(request.url).toString()))
    }

    // Lang-prefixed path: validate then serve via ASSETS or 404 + noindex
    const firstSegment = path.split('/')[1]
    if (SUPPORTED_LANGS_SET.has(firstSegment)) {
      if (isValidPath(path)) {
        return env.ASSETS.fetch(new Request(new URL(request.url).toString()))
      }
      const fallback = await env.ASSETS.fetch(new Request(new URL('/en.html', request.url).toString()))
      const headers = new Headers(fallback.headers)
      headers.set('X-Robots-Tag', 'noindex')
      headers.set('Strict-Transport-Security', HSTS)
      return new Response(fallback.body, { status: 404, headers })
    }

    // Bare path — validate then redirect to language-prefixed canonical URL
    const lang = detectLanguage(request.headers.get('Accept-Language'))
    const validationPath = path === '/' ? `/${lang}` : `/${lang}${path}`
    if (!isValidPath(validationPath)) {
      const fallback = await env.ASSETS.fetch(new Request(new URL('/en.html', request.url).toString()))
      const headers = new Headers(fallback.headers)
      headers.set('X-Robots-Tag', 'noindex')
      headers.set('Strict-Transport-Security', HSTS)
      return new Response(fallback.body, { status: 404, headers })
    }

    // Redirect bare path to language-prefixed URL — ASSETS serves the .html file directly
    const redirectUrl = new URL(request.url)
    redirectUrl.pathname = validationPath
    return new Response(null, {
      status: 302,
      headers: { Location: redirectUrl.toString(), 'Strict-Transport-Security': HSTS },
    })
  },
}
