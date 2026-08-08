/**
 * State-by-state WBGT policy directory shown on /states.
 *
 * Classification authority: the 2026-08-09 research verdict
 * (workspace/20260809_wbgt_research_verdict.md). Only TX and GA were
 * additionally re-verified against association primary documents on
 * 2026-08-09 (see policyOracle.ts) — those two carry `verified: 'primary'`
 * and are the only states whose numeric thresholds appear anywhere on this
 * site. Everything else is `verified: 'research'` and renders with a
 * "confirm with your association" caveat. NO numeric thresholds may be added
 * to this file.
 */

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

export const STATE_DIRECTORY: StateDirectoryRow[] = [
  { abbr: 'TX', body: 'UIL', mandate: 'wbgt-required', measurement: 'apps-allowed', verified: 'primary', noteKey: 'tx' },
  { abbr: 'GA', body: 'GHSA', mandate: 'wbgt-required', measurement: 'device-required', verified: 'primary', noteKey: 'ga' },
  { abbr: 'KY', body: 'KHSAA', mandate: 'wbgt-required', measurement: 'device-required', verified: 'research', noteKey: 'ky' },
  { abbr: 'SC', body: 'SCHSL', mandate: 'wbgt-required', measurement: 'device-required', verified: 'research', noteKey: 'sc' },
  { abbr: 'IA', body: 'IHSAA/IGHSAU', mandate: 'wbgt-required', measurement: 'unverified', verified: 'research', noteKey: 'ia' },
  { abbr: 'FL', body: 'FHSAA (Zachary Martin Act)', mandate: 'wbgt-required', measurement: 'unverified', verified: 'research', noteKey: 'fl' },
  { abbr: 'NC', body: 'NCHSAA', mandate: 'conditional', measurement: 'unverified', verified: 'research', noteKey: 'nc' },
  { abbr: 'VA', body: '§22.1-271.10 (school boards)', mandate: 'wbgt-required', measurement: 'unverified', verified: 'research', noteKey: 'va' },
  { abbr: 'TN', body: 'TSSAA', mandate: 'conditional', measurement: 'apps-allowed', verified: 'research', noteKey: 'tn' },
  { abbr: 'MO', body: 'MSHSAA', mandate: 'conditional', measurement: 'unverified', verified: 'research', noteKey: 'mo' },
  { abbr: 'MD', body: 'MPSSAA', mandate: 'conditional', measurement: 'unverified', verified: 'research', noteKey: 'md' },
  { abbr: 'NY', body: 'NYSPHSAA', mandate: 'heat-index', measurement: 'apps-allowed', verified: 'research', noteKey: 'ny' },
  { abbr: 'NJ', body: 'State law', mandate: 'wbgt-required', measurement: 'unverified', verified: 'research', noteKey: 'nj' },
  { abbr: 'LA', body: 'State law', mandate: 'wbgt-required', measurement: 'unverified', verified: 'research', noteKey: 'la' },
  { abbr: 'CA', body: 'CIF (AB 1653)', mandate: 'standard-pending', measurement: 'unverified', verified: 'research', noteKey: 'ca' },
  { abbr: 'MA', body: 'MIAA', mandate: 'wbgt-required', measurement: 'unverified', verified: 'research', noteKey: 'ma' },
]
