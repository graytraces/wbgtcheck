/**
 * State-by-state WBGT policy directory shown on /states — plain JS so
 * scripts/prerender.mjs and the React app share one copy (see policyData.js
 * for the pattern rationale). Types live in stateDirectory.ts.
 *
 * Classification authority: the 2026-08-09 research verdict
 * (workspace/20260809_wbgt_research_verdict.md), plus primary-source passes
 * that read the association or statutory document directly — 2026-08-09 for
 * TX, GA, SC, TN, IA, NC, NY and VA, then 2026-08-10 for MA, FL, CA and KY.
 * Those twelve carry `verified: 'primary'`; only they may have numeric
 * thresholds published anywhere on this site, and each one's numbers live in
 * policyData.js with its source URL. Everything else is `verified: 'research'`
 * and renders with a "confirm with your association" caveat. NO numeric
 * thresholds may be added to this file.
 *
 * KY is primary but carries a caveat the others do not: khsaa.org answers
 * nothing from here, so its document was read from a web-archive capture
 * (revised 8/22/24). That capture proves publication, not currency, and the
 * /kentucky page leads with that. Its `mandate` is 'conditional' rather than
 * 'wbgt-required' because the document is contest-alteration guidance and
 * states no general duty to use WBGT — the same downgrade Iowa received.
 */

export const STATE_DIRECTORY = [
  { abbr: 'TX', body: 'UIL', mandate: 'wbgt-required', measurement: 'apps-allowed', verified: 'primary', noteKey: 'tx' },
  { abbr: 'GA', body: 'GHSA', mandate: 'wbgt-required', measurement: 'device-required', verified: 'primary', noteKey: 'ga' },
  { abbr: 'KY', body: 'KHSAA', mandate: 'conditional', measurement: 'device-required', verified: 'primary', noteKey: 'ky' },
  { abbr: 'SC', body: 'SCHSL', mandate: 'wbgt-required', measurement: 'device-required', verified: 'primary', noteKey: 'sc' },
  // Iowa's joint guidance says WBGT is "recommended", not mandated — the prior
  // 'wbgt-required' row overstated it. The same document tells schools phone
  // weather apps are not accurate for their venue, hence device-required.
  { abbr: 'IA', body: 'IHSAA/IGHSAU/IHSMA/IHSSA', mandate: 'conditional', measurement: 'device-required', verified: 'primary', noteKey: 'ia' },
  { abbr: 'FL', body: 'FHSAA (Zachary Martin Act)', mandate: 'conditional', measurement: 'device-required', verified: 'primary', noteKey: 'fl' },
  // 2025-26 handbook §2.3.5: "scientifically approved device". The earlier
  // weather-station/airport fallback clause is GONE from the current edition
  // — do not restore 'apps-allowed' from old copies of the guidance PDF.
  { abbr: 'NC', body: 'NCHSAA', mandate: 'conditional', measurement: 'device-required', verified: 'primary', noteKey: 'nc' },
  { abbr: 'VA', body: '§22.1-271.10 (school boards)', mandate: 'wbgt-required', measurement: 'unverified', verified: 'primary', noteKey: 'va' },
  { abbr: 'TN', body: 'TSSAA', mandate: 'conditional', measurement: 'apps-allowed', verified: 'primary', noteKey: 'tn' },
  { abbr: 'MO', body: 'MSHSAA', mandate: 'conditional', measurement: 'unverified', verified: 'research', noteKey: 'mo' },
  { abbr: 'MD', body: 'MPSSAA', mandate: 'conditional', measurement: 'unverified', verified: 'research', noteKey: 'md' },
  { abbr: 'NY', body: 'NYSPHSAA', mandate: 'heat-index', measurement: 'apps-allowed', verified: 'primary', noteKey: 'ny' },
  { abbr: 'NJ', body: 'State law', mandate: 'wbgt-required', measurement: 'unverified', verified: 'research', noteKey: 'nj' },
  { abbr: 'LA', body: 'State law', mandate: 'wbgt-required', measurement: 'unverified', verified: 'research', noteKey: 'la' },
  { abbr: 'CA', body: 'CIF (AB 1653)', mandate: 'wbgt-required', measurement: 'apps-allowed', verified: 'primary', noteKey: 'ca' },
  { abbr: 'MA', body: 'MIAA', mandate: 'wbgt-required', measurement: 'device-required', verified: 'primary', noteKey: 'ma' },
]
