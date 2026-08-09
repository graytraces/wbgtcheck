/**
 * Raw air-quality policy data — plain JS so BOTH the React app (via
 * airPolicyOracle.ts) and scripts/prerender.mjs import the exact same objects.
 * Same prerender↔client shared-module pattern as policyData.js
 * (wiki: prerender-wrs-prosewipe).
 *
 * ORACLE RULE: every number here was cross-checked against the primary source
 * named in its source block, on the date given. UI copy must DERIVE these
 * numbers by interpolation — never hardcode a threshold in locale JSON.
 *
 * This file is the AIR axis. It is deliberately independent of policyData.js:
 * the air gate is additive and must never relax a heat flag. Nothing here may
 * import from, or be combined arithmetically with, the WBGT oracle.
 *
 * Primary sources fetched and cross-checked 2026-08-09:
 *  - EPA AQI categories + required RGB colors: "Technical Assistance Document
 *    for the Reporting of Daily Air Quality – the Air Quality Index (AQI)",
 *    Table 1 (p.3) and Table 2 (p.4).
 *    https://document.airnow.gov/technical-assistance-document-for-the-reporting-of-daily-air-quailty.pdf
 *  - WA: "Washington Air Quality Guide for School & Child Care Activities",
 *    DOH 334-332, April 2022.
 *    https://cdnsm5-ss18.sharpschool.com/UserFiles/Servers/Server_520831/File/Public%20Health/School%20guidance%20Smoke.pdf
 *  - OR: OSAA 2025-2026 Handbook, Executive Board Policies §5 "AIR QUALITY
 *    GUIDELINES (Revised February 2024)", pp. 52-53.
 *    https://www.osaa.org/docs/handbooks/osaahandbook.pdf
 *  - CA: CIF Bylaw 503.K(2) "Air Quality Index Protocol" (Approved January
 *    2019 Federated Council), printed in the CIF North Coast Section
 *    2026-2027 Constitution & General Bylaws, p.105.
 *    https://www.cifncs.org/governance/2026-2027_NCS_Constitution.pdf
 *  - NFHS: "Position Statement on Physical Activity, Air Quality and
 *    Wildfires", NFHS SMAC, April 2023.
 *    https://www.nfhs.org/media/7212236/nfhs-position-statement-on-air-quality-april-2023-final.pdf
 *  - AirNow data conditions: "EPA AirNow Data Exchange Guidelines", last
 *    updated August 2025. https://docs.airnowapi.org/docs/DataUseGuidelines.pdf
 */

// --- EPA AQI categories ---------------------------------------------------
// Table 1 "Names and colors for the six AQI categories" (p.3) and Table 2
// "Standard AQI color formulas" (p.4). The Data Exchange Guidelines require
// that values "be disseminated in accordance with the AQI and corresponding
// RGB colors as directed in the Technical Assistance Document" — these RGB
// triplets are therefore NOT a design choice and must not be restyled.
//
// EPA also publishes an optional "ColorVision Assist" palette (TAD Table 3)
// for color-vision deficiency. We ship the required standard palette and rely
// on the site-wide rule that color is never the only channel: every AQI
// readout carries the number and the category name as text.

export const AQI_CATEGORIES = [
  {
    id: 'good',
    color: 'green',
    minAqi: 0,
    maxAqi: 50,
    rgb: [0, 228, 0],
    hex: '#00E400',
    sourceLabel: '0 to 50',
  },
  {
    id: 'moderate',
    color: 'yellow',
    minAqi: 51,
    maxAqi: 100,
    rgb: [255, 255, 0],
    hex: '#FFFF00',
    sourceLabel: '51 to 100',
  },
  {
    id: 'unhealthySensitive',
    color: 'orange',
    minAqi: 101,
    maxAqi: 150,
    rgb: [255, 126, 0],
    hex: '#FF7E00',
    sourceLabel: '101 to 150',
  },
  {
    id: 'unhealthy',
    color: 'red',
    minAqi: 151,
    maxAqi: 200,
    rgb: [255, 0, 0],
    hex: '#FF0000',
    sourceLabel: '151 to 200',
  },
  {
    id: 'veryUnhealthy',
    color: 'purple',
    minAqi: 201,
    maxAqi: 300,
    rgb: [143, 63, 151],
    hex: '#8F3F97',
    sourceLabel: '201 to 300',
  },
  {
    id: 'hazardous',
    color: 'maroon',
    minAqi: 301,
    maxAqi: null,
    rgb: [126, 0, 35],
    hex: '#7E0023',
    sourceLabel: '301+',
  },
]

export const EPA_AQI_SOURCE = {
  name: 'EPA Technical Assistance Document for the Reporting of Daily Air Quality — the Air Quality Index (AQI), Tables 1-2',
  url: 'https://document.airnow.gov/technical-assistance-document-for-the-reporting-of-daily-air-quailty.pdf',
  verifiedOn: '2026-08-09',
}

/**
 * TAD FAQ (p.23): "All AQI values above 300 are part of the Hazardous
 * category. This includes values above 500". The scale itself runs 0-500.
 */
export const AQI_SCALE_MAX = 500

// --- Activity axis (the WA table's rows) ----------------------------------
// WA DOH 334-332 is the only one of the three jurisdictions whose guidance
// varies by activity type/duration, and its row labels carry the durations.

export const ACTIVITY_IDS = ['recess', 'pe', 'athletics']

export const ACTIVITY_DURATIONS = {
  // "Recess (15 minutes)"
  recess: { minutes: 15, hoursMin: null, hoursMax: null },
  // "P.E. (1 hour)"
  pe: { minutes: 60, hoursMin: null, hoursMax: null },
  // "Athletic Events and Practices (Vigorous activity 2-3 hours)"
  athletics: { minutes: null, hoursMin: 2, hoursMax: 3 },
}

/** Default activity for this product's audience (coaches, band directors). */
export const DEFAULT_ACTIVITY_ID = 'athletics'

// --- Washington ------------------------------------------------------------
// DOH 334-332 (April 2022). NOTE the index basis: the table is headed
// "Outside Air Quality Index: PM2.5", so it is keyed to the PM2.5 sub-index,
// not the overall AQI. `indexBasis` drives which number the UI feeds in.
//
// The guide's indoor-air escape hatch ("unless indoor PM2.5 levels are below
// 35.5 µg/m3") is a concentration, not an AQI value.

export const WA_INDOOR_PM25_THRESHOLD_UG_M3 = 35.5

const WA_SOURCE = {
  name: 'Washington Air Quality Guide for School & Child Care Activities (DOH 334-332, April 2022)',
  url: 'https://cdnsm5-ss18.sharpschool.com/UserFiles/Servers/Server_520831/File/Public%20Health/School%20guidance%20Smoke.pdf',
  verifiedOn: '2026-08-09',
}

/**
 * Action codes map to locale copy under `air.actions.*`. Each carries the
 * source's own wording in `quote` so the state page can show the primary
 * document verbatim next to our paraphrase.
 */
export const WA_BANDS = [
  {
    id: 'good',
    minAqi: 0,
    sourceLabel: 'Good (0-50)',
    actions: { recess: 'noRestrictions', pe: 'noRestrictions', athletics: 'noRestrictions' },
  },
  {
    id: 'moderate',
    minAqi: 51,
    sourceLabel: 'Moderate (51-100)',
    actions: {
      recess: 'sensitiveMayStayIndoors',
      pe: 'sensitiveMayStayIndoorsMonitor',
      athletics: 'sensitiveMayOptOut',
    },
  },
  {
    id: 'unhealthySensitive',
    minAqi: 101,
    sourceLabel: 'Unhealthy for Sensitive Groups (101-150)',
    actions: {
      recess: 'sensitiveIndoorsLight',
      pe: 'sensitiveIndoorsOthersLightOutdoor',
      athletics: 'cancelOrMove',
    },
  },
  {
    id: 'unhealthy',
    minAqi: 151,
    sourceLabel: 'Unhealthy (151-200)',
    actions: {
      recess: 'allIndoorsLight',
      pe: 'allIndoorsLight',
      athletics: 'cancelOrMoveConsiderTransit',
    },
  },
  {
    // The WA table's top column is a single ">200" — it does not split EPA's
    // Very Unhealthy (201-300) and Hazardous (301+).
    id: 'veryUnhealthyHazardous',
    minAqi: 201,
    sourceLabel: 'Very Unhealthy/Hazardous (>200)',
    actions: {
      recess: 'allIndoorsFilteredLight',
      pe: 'allIndoorsFilteredLight',
      athletics: 'cancelOrMoveFilteredConsiderTransit',
    },
  },
]

export const WA_ACTION_QUOTES = {
  noRestrictions: 'No restrictions.',
  sensitiveMayStayIndoors: 'Allow children with health conditions (see below*) to stay indoors.',
  sensitiveMayStayIndoorsMonitor:
    'Allow children with health conditions to stay indoors and monitor symptoms for those who participate. Increase rest periods for these children as needed.',
  sensitiveMayOptOut:
    'Allow children with health conditions to opt out and monitor symptoms for those who join. Increase rest periods for these children.',
  sensitiveIndoorsLight:
    'Keep children with health conditions indoors. Keep activity levels light for these children unless indoor PM2.5 levels are below 35.5 µg/m3 (see following page).',
  sensitiveIndoorsOthersLightOutdoor:
    'Keep children with health conditions indoors. Keep activities light for these children unless indoor PM2.5 levels are below 35.5 µg/m3. For others, limit to light outdoor activities. Allow any children to stay indoors if they do not want to go outside.',
  allIndoorsLight:
    'Keep all children indoors. Keep activity levels light unless indoor PM2.5 levels are below 35.5 µg/m3.',
  allIndoorsFilteredLight:
    'Keep all children indoors. Keep activity levels light unless indoor air is filtered, and indoor PM2.5 levels are below 35.5 µg/m3.',
  cancelOrMove:
    "Cancel children's outdoor athletic events and practices or move them to an area with safer air quality, either indoors or to a different location.",
  cancelOrMoveConsiderTransit:
    "Cancel children's outdoor athletic events and practices or move them to an area with safer air quality, either indoors or to a different location. Consider time spent in poor air quality during transit before relocating.",
  cancelOrMoveFilteredConsiderTransit:
    "Cancel children's outdoor athletic events and practices or move them to an area with safer air quality, either indoors with filtered air or to a different location. Consider time spent in poor air quality during transit before relocating.",
}

/**
 * "*Health conditions include asthma and other lung disease, respiratory
 * infection, heart disease, and diabetes."
 */
export const WA_HEALTH_CONDITIONS_QUOTE =
  'Health conditions include asthma and other lung disease, respiratory infection, heart disease, and diabetes.'

export const WA_AIR_POLICY = {
  id: 'wa-doh',
  stateAbbr: 'WA',
  /** 'pm25' — the WA table is headed "Outside Air Quality Index: PM2.5". */
  indexBasis: 'pm25',
  variesByActivity: true,
  /** Health-department guidance for schools, not an athletics-association rule. */
  instrumentType: 'health-guidance',
  bands: WA_BANDS,
  actionQuotes: WA_ACTION_QUOTES,
  source: WA_SOURCE,
}

// --- Oregon ----------------------------------------------------------------
// OSAA 2025-2026 Handbook, Executive Board Policies §5 (Revised February
// 2024). The table's own first column starts at 51 — OSAA states no action
// for 0-50, and we must not invent one.
//
// OSAA is the only source of the three that publishes an explicit AQI↔5-3-1
// visibility mapping, so the mileage ranges are oracle data here (NFHS
// describes the 5-3-1 method but maps no AQI numbers to it).

const OR_SOURCE = {
  name: 'OSAA 2025-2026 Handbook, Executive Board Policies §5 Air Quality Guidelines (Revised February 2024)',
  url: 'https://www.osaa.org/docs/handbooks/osaahandbook.pdf',
  verifiedOn: '2026-08-09',
}

export const OR_BANDS = [
  {
    id: 'notStated',
    minAqi: 0,
    sourceLabel: '',
    visibilityLabel: null,
    action: null,
  },
  {
    id: 'moderate',
    minAqi: 51,
    sourceLabel: '51-100',
    visibilityLabel: '5-15 Miles',
    action: 'sensitiveConsiderIndoor',
  },
  {
    id: 'unhealthySensitive',
    minAqi: 101,
    sourceLabel: '101-150',
    visibilityLabel: '3-5 Miles',
    action: 'addRestBreaksConsiderReschedule',
  },
  {
    id: 'unhealthy',
    minAqi: 151,
    sourceLabel: '151-200',
    visibilityLabel: '1-3 Miles',
    action: 'cancelOrMoveLowerAqi',
  },
  {
    // OSAA prints ">200" as its top row; the required action text is identical
    // to the 151-200 row.
    id: 'above200',
    minAqi: 201,
    sourceLabel: '>200',
    visibilityLabel: '1 Mile',
    action: 'cancelOrMoveLowerAqi',
  },
]

export const OR_ACTION_QUOTES = {
  sensitiveConsiderIndoor:
    'Athletes who are unusually sensitive to air pollution should consider indoor activities only. Athletes with asthma should have rescue inhalers readily available and pretreat before exercise if directed by their healthcare provider. All athletes with respiratory illness, asthma, lung or heart disease should monitor symptoms and reduce/cease activity if symptoms arise. Increase rest periods as needed.',
  addRestBreaksConsiderReschedule:
    'Athletes who are unusually sensitive to air pollution should consider indoor activities only. Athletes with asthma should have rescue inhalers readily available and pretreat before exercise if directed by their healthcare provider. All athletes with respiratory illness, asthma, lung or heart disease should monitor symptoms and reduce/cease activity if symptoms arise. Athletes with asthma or other lung diseases, heart conditions or diabetes may need additional rest breaks during practices / contests. Consider rescheduling to a different time and / or an area with a lower AQI. Schools should consider the impact of elevated AQI lasting for multiple days and the impact of prolonged exposure for athletes and staff on multiple practice session days when making decisions. Consider moving practices indoors, if available. Be aware that, depending on a venue’s ventilation system, indoor air quality levels can approach outdoor levels.',
  cancelOrMoveLowerAqi:
    'All outdoor activities (practice and competition) shall be canceled or moved to an area with a lower AQI. Move practices indoors, if available. Be aware that, depending on a venue’s ventilation system, indoor air quality levels can approach outdoor levels.',
}

/**
 * OSAA §5.C.1: schools without a nearby monitor "should utilize the 5-3-1
 * Visibility Index", and §5.C.1(c): "always use the more conservative of
 * multiple metrics (AQI, 5-3-1 Visibility Index, etc.)."
 */
export const OR_CONSERVATIVE_METRIC_QUOTE =
  'Be aware that conditions may change rapidly and always use the more conservative of multiple metrics (AQI, 5-3-1 Visibility Index, etc.).'

export const OR_AIR_POLICY = {
  id: 'or-osaa',
  stateAbbr: 'OR',
  indexBasis: 'overall',
  variesByActivity: false,
  instrumentType: 'association-policy',
  bands: OR_BANDS,
  actionQuotes: OR_ACTION_QUOTES,
  source: OR_SOURCE,
}

// --- California ------------------------------------------------------------
// CIF Bylaw 503.K(2)(a), approved January 2019 Federated Council. This is a
// statewide CIF membership rule ("All CIF member schools"), reproduced in each
// section's constitution — not a section-specific bylaw. It is a hard
// threshold, not graduated guidance, and the bylaw is silent below it.

export const CA_REFRAIN_AT_OR_ABOVE_AQI = 151

const CA_SOURCE = {
  name: 'CIF Bylaw 503.K(2) Air Quality Index Protocol (Approved January 2019 Federated Council), as printed in the CIF North Coast Section 2026-2027 Constitution & General Bylaws, p.105',
  url: 'https://www.cifncs.org/governance/2026-2027_NCS_Constitution.pdf',
  verifiedOn: '2026-08-09',
}

export const CA_RULE_QUOTE =
  'All CIF member schools must refrain from outdoor practice and/or competition when the Air Quality Index is 151 or higher.'

/**
 * The same bylaw sentence that names the acceptable data sources. This is the
 * CA analogue of UIL_APP_MEASUREMENT_QUOTE: the governing body names
 * airnow.gov itself, which is what this site's air gate reads.
 */
export const CA_READING_SOURCE_QUOTE =
  'Schools may use readings for their local area obtained through www.airnow.gov or a measurement device located outdoors on their physical campus.'

export const CA_BANDS = [
  {
    id: 'belowThreshold',
    minAqi: 0,
    sourceLabel: '',
    action: null,
  },
  {
    id: 'refrainOutdoor',
    minAqi: CA_REFRAIN_AT_OR_ABOVE_AQI,
    sourceLabel: '151 or higher',
    action: 'refrainOutdoor',
  },
]

export const CA_ACTION_QUOTES = {
  refrainOutdoor: CA_RULE_QUOTE,
}

export const CA_AIR_POLICY = {
  id: 'ca-cif',
  stateAbbr: 'CA',
  indexBasis: 'overall',
  variesByActivity: false,
  instrumentType: 'association-bylaw',
  bands: CA_BANDS,
  actionQuotes: CA_ACTION_QUOTES,
  source: CA_SOURCE,
}

export const AIR_POLICIES = {
  'wa-doh': WA_AIR_POLICY,
  'or-osaa': OR_AIR_POLICY,
  'ca-cif': CA_AIR_POLICY,
}

/** State → policy id. Every other state gets the EPA category only. */
export const AIR_POLICY_BY_STATE = {
  WA: 'wa-doh',
  OR: 'or-osaa',
  CA: 'ca-cif',
}

// --- NFHS 5-3-1 visibility method -----------------------------------------
// NFHS SMAC position statement, April 2023. NFHS describes the method but
// assigns no AQI numbers to the landmark distances — do not add any. The
// OSAA table above is the only verified AQI↔visibility mapping we carry.

export const NFHS_LANDMARK_MILES = [1, 3, 5]

const NFHS_SOURCE = {
  name: 'NFHS Position Statement on Physical Activity, Air Quality and Wildfires (SMAC, April 2023)',
  url: 'https://www.nfhs.org/media/7212236/nfhs-position-statement-on-air-quality-april-2023-final.pdf',
  verifiedOn: '2026-08-09',
}

export const NFHS_531_QUOTE =
  'Using an online satellite map, locate three landmarks that can be seen from a specific venue. The landmarks you choose should be 1 mile away, 3 miles away and 5 miles away. Standing with the sun behind you, look at the three objects and when the outline of the landmark can no longer be seen, then the visibility range is less than the distance marker.'

export const NFHS_RECHECK_QUOTE =
  'When the air is smoky and hazy, monitoring the AQI or the Visibility Index should be done at least hourly during competitions and practices as conditions can change quickly.'

/** The warning that "move it indoors" is not automatically safer. */
export const NFHS_INDOOR_WORSE_QUOTE =
  'If the HVAC system cannot appropriately manage the burden of pollutants in the air, indoor air quality MAY BE WORSE than the outdoor air and it is not appropriate to practice or workout indoors.'

/** April 2023 added marching band to the statement's scope, verbatim. */
export const NFHS_SCOPE_QUOTE =
  'Please note that all of the above principles are not limited to athletic events and should also be followed for physical education classes, marching band, and other outdoor activities involving physical activity in order to protect both students and staff.'

export const NFHS_AIR_SOURCE = NFHS_SOURCE

// --- AirNow data conditions ------------------------------------------------
// EPA AirNow Data Exchange Guidelines (last updated August 2025). Three
// obligations bind this site directly:
//   1. observational data are preliminary and must be labeled as such
//      wherever displayed;
//   2. credit goes FIRST to the reporting air agency, then to EPA AirNow;
//   3. values must be shown with the AQI's required RGB colors (see
//      AQI_CATEGORIES above) and must not be altered.
// The guidelines also state the data "should not be used to ... act as
// guidance, or support any other government or public decision-making" —
// which is why the air gate is framed as planning input, never as clearance.

export const AIRNOW_SOURCE = {
  name: 'EPA AirNow Data Exchange Guidelines (last updated August 2025)',
  url: 'https://docs.airnowapi.org/docs/DataUseGuidelines.pdf',
  verifiedOn: '2026-08-09',
}

export const AIRNOW_PRELIMINARY_QUOTE =
  'AirNow observational data are not fully verified or validated; these data are subject to change and should be considered preliminary.'

export const AIRNOW_NOT_FOR_DECISIONS_QUOTE =
  'they should not be used to formulate or support regulation, ascertain trends, act as guidance, or support any other government or public decision-making'

export const AIRNOW_CREDIT_QUOTE =
  'Credit should first be given to the appropriate source—federal, state, local, and tribal air quality agencies and the EPA AirNow program—in products, publications, presentations, or any other related distribution.'

/** Fallback credit when a row carries no agency name. */
export const AIRNOW_PROGRAM_CREDIT = 'EPA AirNow'

/**
 * Reporting areas are area-wide values from the nearest agency monitor, which
 * can sit many miles from a field. Beyond this distance the UI stops implying
 * the number represents the field and says so.
 */
export const AIR_AREA_FAR_KM = 40

/** Observations older than this are shown as stale rather than current. */
export const AIR_OBSERVATION_STALE_MINUTES = 120
