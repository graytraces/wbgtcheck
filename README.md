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

- ~~**AQI axis Phase 1**~~ — shipped on `feat/aqi`. WA/OR/CA policies live in
  `src/data/airPolicyData.js`; `/api/aqi` reads AirNow's keyless hourly
  `reportingarea.dat`. Follow-ups it left open are listed below.
- **Grundstein 2015 regional categories**: oracle-ize Cat 1/2/3 thresholds for
  the generic fallback once the original table is obtained (paywalled).
- **TX county auto-assignment**: NWS `points` responses include a county code;
  auto-pick Class 2/3 once an authoritative county→class list is verified.
  Until then the stricter Class 2 default + user selection stands.
- **Meter ProductBox port**: on-site WBGT meter affiliate/product box from the
  pooldose pattern — **user decision 2026-08-09: on hold.** Commercial elements
  are too heavy for a site this new. Do not port it without a fresh decision.
- **State policy pages**: six shipped on 2026-08-09 (SC · TN · IA · NC · NY ·
  VA), each gated on reading that association's or legislature's own document.
  Remaining verdict-table states and their blockers:
  - **KY** — blocked, not deferred. khsaa.org served nothing to every fetch
    attempt (root, /sports-medicine/, /forms/ge20.pdf, /forms/ge110.pdf, the
    08-23-24 WBGT notice). Two record forms appear to exist — GE20 ("Heat Index
    / Wet Bulb Globe Measurement and Record") and GE110 ("WET BULB GLOBE
    TEMPERATURE (WBGT) MEASUREMENT AND RECORD") — so the old "Form GE20" claim
    was dropped from /states rather than restated unverified. Retry from a
    network that KHSAA answers.
  - **FL · MO · MD · NJ · LA · CA · MA** — not attempted in the 2026-08-09 pass;
    still research-tier. Same gate applies: read the primary document first.
  - **NY WBGT chart** — NY's heat-index ladder is published and now on the site,
    but its WBGT alternative chart is an image keyed to an external regional map
    (castlewilliams.com/wbgt-regions.html). Not reproduced — printing the wrong
    region's numbers is the failure mode this rule exists to prevent.
- **NC/NY tool integration**: both are deliberately absent from the policy
  picker, not merely unimplemented. NCHSAA uses a different threshold family
  (80/85/88/90) plus its own colour code whose names contradict this site's flag
  meanings; NYSPHSAA's ladder is in heat index degrees. Wiring either into
  `classifyWbgt` would emit a confidently wrong flag — `policyOracle.test.ts`
  pins the exclusion.

## AQI axis follow-ups (opened by Phase 1)

- **Notify EPA AirNow that we use their data** — an operational obligation, not
  code. The AirNow Data Exchange Guidelines require that products relying on
  these data "be made known to the relevant federal, state, local, and tribal
  air quality agencies and the EPA AirNow program", and the guidelines document
  ends in a form to return to `dmc@airnowtech.org`. Send it, and keep the
  contact address current so we get schema-change notices.
- **AQI axis Phase 2** (deliberately out of Phase 1 scope): CO / UT / MN / WI
  policies, multi-day AQI forecasts, PurpleAir sensors, and any alerting. Each
  new jurisdiction is gated on fetching its primary document first. Note that
  OSAA's own guidance points schools at the AirNow Fire and Smoke map for
  PurpleAir data, so a PurpleAir layer has a cited rationale when we get there.
- **`reportingarea.dat` schema is pinned by fixture, not contract.** Column
  order is asserted from real rows captured 2026-08-09. AirNow publishes no
  versioned schema for this file, so a silent column change would surface as a
  parse failure (rows dropped → 503), not as wrong numbers. If AirNow ever adds
  a keyed JSON equivalent with the same coverage, revisit.
- **OSAA and CIF sites are Cloudflare-blocked to us.** `osaa.org` returns 403 to
  every automated fetch, including a real logged-in browser over CDP, so §5 of
  the handbook was verified through a Wayback capture of OSAA's own PDF
  (`2026-03-02`, document "Revised February 2024"). `cifncs.org` serves an HTML
  shell for its `.pdf` URLs; the real file sits on CloudFront. Re-verification
  needs those two routes, so budget for it rather than assuming a plain fetch
  works.
- **WA's table is PM2.5-keyed, and we honour that.** If a future jurisdiction
  keys to the overall AQI while WA keys to PM2.5, keep `indexBasis` per policy —
  do not unify onto one number.
