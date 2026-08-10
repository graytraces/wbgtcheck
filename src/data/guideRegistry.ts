/**
 * Typed view over guideRegistry.js (shared with scripts/prerender.mjs).
 * See the .js file for why the lists live in one place.
 */

import {
  STATE_GUIDES as RAW_STATE_GUIDES,
  AIR_GUIDES as RAW_AIR_GUIDES,
  GUIDE_SLUG_BY_ABBR as RAW_SLUG_BY_ABBR,
} from './guideRegistry.js'

export interface GuideEntry {
  /** State abbreviation — joins to STATE_DIRECTORY and to the detected location. */
  abbr: string
  /** URL slug, registered in routeValidation and seo.ts. */
  slug: string
  /** pageSEO key. */
  seoKey: string
  /** i18n key for the link label. */
  labelKey: string
}

export const STATE_GUIDES = RAW_STATE_GUIDES as GuideEntry[]
export const AIR_GUIDES = RAW_AIR_GUIDES as GuideEntry[]
export const GUIDE_SLUG_BY_ABBR = RAW_SLUG_BY_ABBR as Record<string, string | undefined>
