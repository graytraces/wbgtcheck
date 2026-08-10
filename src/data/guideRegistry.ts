/**
 * Typed view over guideRegistry.js (shared with scripts/prerender.mjs).
 * See the .js file for why the lists live in one place.
 */

import {
  STATE_GUIDES as RAW_STATE_GUIDES,
  AIR_GUIDES as RAW_AIR_GUIDES,
  TOPIC_GUIDES as RAW_TOPIC_GUIDES,
  GUIDE_SLUG_BY_ABBR as RAW_SLUG_BY_ABBR,
} from './guideRegistry.js'

/**
 * What the state publishes. The home page's fallback notice is written from
 * this, because one sentence for every state was false in four of the six it
 * appeared on. See guideRegistry.js.
 */
export type LadderKind = 'wbgt-own' | 'heat-index' | 'no-state-numbers'

export interface GuideEntry {
  /** State abbreviation — joins to STATE_DIRECTORY and to the detected location. */
  abbr: string
  /** URL slug, registered in routeValidation and seo.ts. */
  slug: string
  /** pageSEO key. */
  seoKey: string
  /** i18n key for the link label. */
  labelKey: string
  ladder: LadderKind
  /** Only on 'no-state-numbers': who publishes the thresholds instead. */
  numbersSetBy?: 'districts' | 'association'
}

/**
 * A cross-state topical guide. No `abbr`, no `ladder`: it is not a state's
 * page, so the joins GuideEntry carries to STATE_DIRECTORY and to the
 * detected location would be meaningless on it. Keeping it a separate type is
 * what stops one from being added to STATE_GUIDES by autocomplete.
 */
export interface TopicGuideEntry {
  slug: string
  seoKey: string
  labelKey: string
}

export const STATE_GUIDES = RAW_STATE_GUIDES as GuideEntry[]
export const AIR_GUIDES = RAW_AIR_GUIDES as GuideEntry[]
export const TOPIC_GUIDES = RAW_TOPIC_GUIDES as TopicGuideEntry[]
export const GUIDE_SLUG_BY_ABBR = RAW_SLUG_BY_ABBR as Record<string, string | undefined>
