/**
 * Typed view over stateDirectory.js (shared with scripts/prerender.mjs).
 * See the .js file for sourcing rules — no numeric thresholds, TX/GA only
 * carry primary verification.
 */

import { STATE_DIRECTORY as RAW } from './stateDirectory.js'

export type MeasurementClass = 'apps-allowed' | 'device-required' | 'unverified'

export interface StateDirectoryRow {
  abbr: string
  /** Governing body (association / statute) short label. */
  body: string
  /** WBGT mandate status per the research verdict. */
  mandate: 'wbgt-required' | 'conditional' | 'heat-index' | 'standard-pending'
  measurement: MeasurementClass
  /** 'primary' — association document re-fetched 2026-08-09; 'research' — verdict doc only. */
  verified: 'primary' | 'research'
  /** i18n key under states.notes.* with the one-line nuance for this row. */
  noteKey: string
}

export const STATE_DIRECTORY = RAW as StateDirectoryRow[]
