import { describe, it, expect } from 'vitest'
import { pageSEO } from '../seo'
import { VALID_TOOLS, VALID_PAGES } from '../utils/routeValidation'
import en from '../locales/en.json'
import es from '../locales/es.json'

/**
 * Route/SEO chain sync: seo.ts registry ↔ routeValidation ↔ locale seo.*
 * namespaces. A slug missing from VALID_TOOLS 404s at the worker; a key
 * missing from a locale breaks prerender.
 */

describe('SEO chain registration', () => {
  const registeredPaths = Object.values(pageSEO)
    .map((p) => p.path)
    .filter((p) => p !== '')

  it('every registered path is worker-valid (VALID_TOOLS ∪ VALID_PAGES)', () => {
    for (const path of registeredPaths) {
      expect(
        VALID_TOOLS.has(path) || VALID_PAGES.has(path),
        `${path} missing from routeValidation`,
      ).toBe(true)
    }
  })

  it('every worker-valid slug has a pageSEO entry (no orphan routes)', () => {
    for (const slug of [...VALID_TOOLS, ...VALID_PAGES]) {
      expect(registeredPaths, `${slug} missing from seo.ts`).toContain(slug)
    }
  })

  it('every pageSEO key has seo.* title+description in both locales', () => {
    const enSeo = en.seo as Record<string, { title?: string; description?: string }>
    const esSeo = es.seo as Record<string, { title?: string; description?: string }>
    for (const { key } of Object.values(pageSEO)) {
      expect(enSeo[key]?.title, `en seo.${key}.title`).toBeTruthy()
      expect(enSeo[key]?.description, `en seo.${key}.description`).toBeTruthy()
      expect(esSeo[key]?.title, `es seo.${key}.title`).toBeTruthy()
      expect(esSeo[key]?.description, `es seo.${key}.description`).toBeTruthy()
    }
  })

  it('no aggregateRating anywhere in the SEO layer (structured-data policy)', () => {
    const serialized = JSON.stringify({ pageSEO, en, es })
    expect(serialized).not.toContain('aggregateRating')
    expect(serialized).not.toContain('ratingValue')
    expect(serialized).not.toContain('reviewCount')
  })

  it('NC and WA seo strings never regain the superseded-edition claims', () => {
    // These phrases described documents the 2026-08 rebuilds replaced: NC's
    // weather-station clause and colour code died with the 2015 chart; WA's
    // activity-type axis ("recess, P.E. …") and the 5-3-1 visibility check
    // belong to other documents. Body copy may still name them historically
    // ("earlier editions allowed…") — the seo blocks may not assert them.
    // Scoped to seo: air.activityExample.short legitimately says "recess".
    const banned = [
      /weather station/i,
      /colou?r code/i,
      /recess/i,
      /5-3-1/,
      /estaci[oó]n meteorol[oó]gica/i,
      /c[oó]digo de color/i,
      /recreo/i,
    ]
    const blocks: Array<[string, unknown]> = [
      ['en seo.northCarolina', en.seo.northCarolina],
      ['en seo.washingtonAir', en.seo.washingtonAir],
      ['es seo.northCarolina', es.seo.northCarolina],
      ['es seo.washingtonAir', es.seo.washingtonAir],
    ]
    for (const [label, block] of blocks) {
      const text = JSON.stringify(block)
      for (const re of banned) {
        expect(re.test(text), `${label} matches ${re}`).toBe(false)
      }
    }
  })
})
