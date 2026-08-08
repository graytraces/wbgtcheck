import { SUPPORTED_LANGS, isValidPath, PATH_ALIASES } from './utils/routeValidation'

const SUPPORTED_LANGS_SET = new Set<string>(SUPPORTED_LANGS)
const HSTS = 'max-age=31536000; includeSubDomains; preload'

// NWS api.weather.gov requires an identifying User-Agent (see
// weather.gov/documentation/services-web-api "Authentication").
const NWS_USER_AGENT = 'wbgtcheck.com (graytraces@gmail.com)'
const NWS_API = 'https://api.weather.gov'
// Edge cache TTL for /api/wbgt responses. NWS gridpoint forecasts update
// roughly hourly; 10 minutes keeps readings fresh while absorbing team-wide
// traffic bursts (whole team opening the same link after a share).
const WBGT_CACHE_SECONDS = 600

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

async function handleWbgtApi(url: URL, ctx?: ExecutionContext): Promise<Response> {
  const latParam = url.searchParams.get('lat')
  const lonParam = url.searchParams.get('lon')
  if (latParam === null || latParam === '' || lonParam === null || lonParam === '') {
    return jsonError('lat and lon query parameters are required numbers', 400)
  }
  const latRaw = Number(latParam)
  const lonRaw = Number(lonParam)
  // NWS covers US states + territories; this box (incl. AK/HI/PR/GU) rejects
  // junk input before it reaches the upstream API.
  if (!Number.isFinite(latRaw) || !Number.isFinite(lonRaw)) {
    return jsonError('lat and lon query parameters are required numbers', 400)
  }
  if (latRaw < -15 || latRaw > 72 || lonRaw < -180 || lonRaw > 180) {
    return jsonError('coordinates out of range', 400)
  }
  // Round to 2 decimals (~1 km): NWS grid cells are 2.5 km, and rounding
  // collapses nearby requests onto one cache entry.
  const lat = latRaw.toFixed(2)
  const lon = lonRaw.toFixed(2)

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

    const path = url.pathname

    // Static files (sitemap.xml, robots.txt, favicon.ico, etc.) — pass directly to ASSETS
    if (/\.\w+$/.test(path)) {
      return env.ASSETS.fetch(new Request(new URL(request.url).toString()))
    }

    const segments = path.split('/').filter(Boolean)

    // PATH_ALIASES: 301 redirect short/legacy tool slugs to canonical paths
    if (segments.length === 2 && SUPPORTED_LANGS_SET.has(segments[0]) && PATH_ALIASES[segments[1]]) {
      url.pathname = `/${segments[0]}/${PATH_ALIASES[segments[1]]}`
      return new Response(null, {
        status: 301,
        headers: { Location: url.toString(), 'Strict-Transport-Security': HSTS },
      })
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
