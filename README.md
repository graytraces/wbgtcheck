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
npm run build   # tsc + vite + prerender (32 locale HTML files + sitemap)
```

## Backlog (deliberately deferred)

Recorded during the 2026-08-09 three-axis review; do not pick these up
without weighing the noted risk:

- **Locale lazy-loading** (−21 KB gzip from the entry, measured 2026-08-10):
  both locale files ship in the entry chunk (verified by string probe), so
  every visitor downloads the language they are not reading — en.json is
  21.8 KB gzip and es.json 23.5 KB, 44.3 KB for the pair. Dropping the unused
  one is the saving. Still deferred for the original reason: i18next async
  init risks a first-paint flash of keys, and this needs a WRS-safe loading
  strategy first. (The old "−7 KB" figure was an estimate and understated it
  by roughly a factor of three.)
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
  VA); four more on 2026-08-10 (MA · FL · CA · KY), each gated on reading that
  association's or legislature's own document.
  - ~~**KY** — blocked~~ **shipped 2026-08-10, with a currency caveat.**
    khsaa.org still answers nothing from here, so the document came from a
    Wayback capture of KHSAA's own file ("Contest Alteration Due to WBGT
    Readings", revised 8/22/24). The capture proves publication, not currency,
    and the page leads with that above the table. If KHSAA ever answers, verify
    the revision date and drop the notice.
  - **MO · MD · NJ · LA** — still research-tier, and here is exactly what was
    tried on 2026-08-10 so the next attempt does not repeat it:
    - **MO** — mshsaa.org refuses connections outright (curl exit 000) on every
      path tried. Wayback CDX for the domain returns only track-meet "heat
      sheets", no policy document.
    - **MD** — mpssaa.org returns 403 to automated fetches of `/assets/...`
      and `/health-safety/`. CDX likewise surfaces only track heat sheets.
      Needs the CDP-browser route that unblocked osaa.org, or a direct link.
    - **NJ** — njsiaa.org 404s every guessed path. CDX shows the policy
      documents existed under `/documents/heat-and-humidity-practice-policy`
      and `/documents/heat-participation-policy-guidelines-bp` in 2018, but the
      site has since been rebuilt. Try those Wayback captures, then look for
      the current equivalents.
    - **LA** — lhsaa.org's Sports Medicine page IS reachable, but the only
      heat document it hosts is the generic NATA/Casa inter-association
      acclimatization paper, not an LHSAA WBGT policy with thresholds. Nothing
      state-specific to publish yet.
    - Discovery was hampered by the session's WebSearch budget being exhausted
      before this batch started; the Wayback CDX API (`/cdx/search/cdx`) and
      the CloudFront-inside-the-shell trick did most of the work instead.
  - **FL thresholds** — the statute (§ 1006.165(2)) is published and now on the
    site, but it sets no numbers: it directs the FHSAA to establish them.
    fhsaa.com returned HTTP 500 to every attempt, so Florida ships without a
    band table and says so. Getting that document is the remaining work.
  - **CA picker integration** — the three CIF category ladders are in the
    oracle and on the page, but not in the policy picker: CIF assigns a
    school's category by region from a separate 28-page roster. Wiring them in
    needs the Texas class-prompt pattern, not a default.
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

- ~~**Notify EPA AirNow that we use their data**~~ — **done 2026-08-09**: the
  completed Data Exchange Guidelines agreement form was emailed to
  `dmc@airnowtech.org` from cardi.workshop@gmail.com (contact of record).
  Remaining obligation is passive: keep that contact address current so we get
  schema-change notices, and respond if the DMC replies.
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

From the 2026-08-09 three-perspective review gate (record only):

- ~~**KY retry**~~: resolved 2026-08-10 through a Wayback capture — see the
  state-pages entry above. khsaa.org itself still answers nothing.
- **SCHSL and NYSPHSAA edition checks**: no newer editions were reachable to
  confirm currency; their verifiedOn dates attest the copies we hold.
- **TSSAA 2026-27 edition**: re-verify before the 2027 season — the current
  policy is the October 2024 revision.
- ~~**CIF EXTREME_HEAT PDF**~~: read 2026-08-10. cifstate.org serves an HTML
  shell for its `.pdf` URLs, and the shell contains the real CloudFront
  address — fetching that returned the file. The p.103 band chart is an image,
  so it was rendered to PNG at 170 dpi and read by eye (the TSSAA treatment).
  The heat side of CIF is now verified and on /california.
- **Pre-season source freshness re-verification (2027-05)**: walk EVERY
  source block in policyData.js and airPolicyData.js and confirm the cited
  document is still the current edition — verifiedOn means "confirmed
  current that day", and the NC/WA rebuilds are what it costs when it slips.
