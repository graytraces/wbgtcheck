import type { TFunction } from 'i18next'
import type { BandGuideline, FlagColor } from '../data/policyOracle'
import { guidelineSentences as shared } from '../lib/guidelineSentences.js'

/**
 * Typed wrapper over the shared (prerender + client) sentence assembly in
 * lib/guidelineSentences.js. Every number in the output comes from the policy
 * oracle — the i18n layer only holds sentence templates.
 */
export function guidelineSentences(flag: FlagColor, g: BandGuideline, t: TFunction): string[] {
  return shared(flag, g, (key, params) => t(key, params ?? {}))
}
