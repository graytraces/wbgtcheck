/**
 * State-by-state WBGT policy directory shown on /states — plain JS so
 * scripts/prerender.mjs and the React app share one copy (see policyData.js
 * for the pattern rationale). Types live in stateDirectory.ts.
 *
 * Classification authority: the 2026-08-09 research verdict
 * (workspace/20260809_wbgt_research_verdict.md), plus a 2026-08-09 primary
 * -source pass that read the association or statutory document directly for
 * TX, GA, SC, TN, IA, NC, NY and VA. Those carry `verified: 'primary'`; only
 * they may have numeric thresholds published anywhere on this site, and each
 * one's numbers live in policyData.js with its source URL. Everything else is
 * `verified: 'research'` and renders with a "confirm with your association"
 * caveat. NO numeric thresholds may be added to this file.
 *
 * KY stays 'research' on purpose: khsaa.org was unreachable during the
 * 2026-08-09 pass, so neither its wording nor its record form could be
 * confirmed. Do not restate the old GE20 claim without reading the document —
 * a GE110 WBGT form also exists and may supersede it.
 */

export const STATE_DIRECTORY = [
  { abbr: 'TX', body: 'UIL', mandate: 'wbgt-required', measurement: 'apps-allowed', verified: 'primary', noteKey: 'tx' },
  { abbr: 'GA', body: 'GHSA', mandate: 'wbgt-required', measurement: 'device-required', verified: 'primary', noteKey: 'ga' },
  { abbr: 'KY', body: 'KHSAA', mandate: 'wbgt-required', measurement: 'device-required', verified: 'research', noteKey: 'ky' },
  { abbr: 'SC', body: 'SCHSL', mandate: 'wbgt-required', measurement: 'device-required', verified: 'primary', noteKey: 'sc' },
  // Iowa's joint guidance says WBGT is "recommended", not mandated — the prior
  // 'wbgt-required' row overstated it. The same document tells schools phone
  // weather apps are not accurate for their venue, hence device-required.
  { abbr: 'IA', body: 'IHSAA/IGHSAU/IHSMA/IHSSA', mandate: 'conditional', measurement: 'device-required', verified: 'primary', noteKey: 'ia' },
  { abbr: 'FL', body: 'FHSAA (Zachary Martin Act)', mandate: 'wbgt-required', measurement: 'unverified', verified: 'research', noteKey: 'fl' },
  // NCHSAA is the one association that names an off-site fallback: a weather
  // station or airport within 5-10 miles when on-site is not accurate.
  { abbr: 'NC', body: 'NCHSAA', mandate: 'conditional', measurement: 'apps-allowed', verified: 'primary', noteKey: 'nc' },
  { abbr: 'VA', body: '§22.1-271.10 (school boards)', mandate: 'wbgt-required', measurement: 'unverified', verified: 'primary', noteKey: 'va' },
  { abbr: 'TN', body: 'TSSAA', mandate: 'conditional', measurement: 'apps-allowed', verified: 'primary', noteKey: 'tn' },
  { abbr: 'MO', body: 'MSHSAA', mandate: 'conditional', measurement: 'unverified', verified: 'research', noteKey: 'mo' },
  { abbr: 'MD', body: 'MPSSAA', mandate: 'conditional', measurement: 'unverified', verified: 'research', noteKey: 'md' },
  { abbr: 'NY', body: 'NYSPHSAA', mandate: 'heat-index', measurement: 'apps-allowed', verified: 'primary', noteKey: 'ny' },
  { abbr: 'NJ', body: 'State law', mandate: 'wbgt-required', measurement: 'unverified', verified: 'research', noteKey: 'nj' },
  { abbr: 'LA', body: 'State law', mandate: 'wbgt-required', measurement: 'unverified', verified: 'research', noteKey: 'la' },
  { abbr: 'CA', body: 'CIF (AB 1653)', mandate: 'standard-pending', measurement: 'unverified', verified: 'research', noteKey: 'ca' },
  { abbr: 'MA', body: 'MIAA', mandate: 'wbgt-required', measurement: 'unverified', verified: 'research', noteKey: 'ma' },
]
