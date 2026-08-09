# WBGT Check

Heat-safety planning for US high-school coaches and marching band directors:
hourly wet bulb globe temperature for your field, translated into your state
association's activity flags (Texas UIL Class 2/3, Georgia GHSA, NATA example
fallback), with a shareable team-chat card.

- **Not a measurement instrument, not a compliance tool.** Remote estimates
  read low versus on-site meters; the UI says so permanently. See `/disclaimer`.
- Every policy threshold lives in `src/data/policyData.js` (single source,
  shared by React and the prerender) with primary-source URLs and verification
  dates. No number ships without a fetched primary document.
- WBGT holes in the NWS grid (e.g. EWX/Austin) are filled by a TypeScript port
  of ECMWF thermofeel's Liljegren implementation (Apache-2.0, see NOTICE),
  validated against thermofeel's own regression fixture.

## Develop

```bash
npm run dev     # NWS called directly (no worker in dev)
npm test        # tsc + vitest
npm run build   # tsc + vite + prerender (14 locale HTML files + sitemap)
```

## Backlog (deliberately deferred)

Recorded during the 2026-08-09 three-axis review; do not pick these up
without weighing the noted risk:

- **Locale lazy-loading** (−7 KB entry): i18next async init risks a
  first-paint flash of keys — needs a WRS-safe loading strategy first.
- **PWA manifest i18n**: manifest.webmanifest is EN-only; vite-plugin-pwa has
  no per-locale manifest story — revisit if ES installs matter.
- **Icon silhouette duplication**: orange (OctagonAlert) and black (OctagonX)
  share the octagon outline; consider a distinct black-flag glyph.
- **Desktop two-column layout**: verdict left / timeline+week right above
  1024px; mobile-first layout is intentionally single-column today.
- **i18next replacement**: a hand-rolled t() would cut ~30 KB, but drops
  plural/context machinery ES may need later.

From the 2026-08-09 four-axis review (legal · granularity · air quality ·
monetization) — all pending an explicit go decision:

- **AQI axis Phase 1**: WA/OR/CA-NCS air-quality practice policies as a second
  oracle + an AirNow proxy route — awaiting user decision, do not start.
- **Grundstein 2015 regional categories**: oracle-ize Cat 1/2/3 thresholds for
  the generic fallback once the original table is obtained (paywalled).
- **TX county auto-assignment**: NWS `points` responses include a county code;
  auto-pick Class 2/3 once an authoritative county→class list is verified.
  Until then the stricter Class 2 default + user selection stands.
- **Meter ProductBox port**: on-site WBGT meter affiliate/product box from the
  pooldose pattern — awaiting user decision.
- **State policy pages ×15**: expand /texas//georgia-style guides to the other
  verdict-table states, each gated on fetching that association's primary
  document first (oracle rule).
