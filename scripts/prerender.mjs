/**
 * Prerender script (EN + ES).
 *
 * Generates dist/{lang}.html and dist/{lang}/{page}.html with locale meta
 * tags, JSON-LD, and [data-prerender] body content, plus sitemap.xml.
 *
 * Body content mirrors what the React pages render — same locale keys, same
 * oracle data via src/data/policyData.js and the shared sentence assembly in
 * src/lib/guidelineSentences.js — so prerendered HTML and post-JS DOM carry
 * the same prose (wiki: prerender-wrs-prosewipe).
 *
 * Usage: node scripts/prerender.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import {
  POLICIES,
  UIL_CLASS_2,
  UIL_CLASS_3,
  GHSA,
  SCHSL,
  TSSAA,
  IOWA_CATEGORY_2,
  MIAA,
  KHSAA_WBGT_REFERENCE,
  KY_RECHECK_INTERVAL_MINUTES,
  KY_REVISION,
  KY_REVISION_ISO,
  KY_LOWEST_BAND_FLOOR,
  KY_ONSITE_ONLY_QUOTE,
  KY_OFFSITE_INVALID_QUOTE,
  KY_FOOTBALL_ONSITE_QUOTE,
  CIF_CATEGORIES,
  CIF_LEGAL_BASIS,
  CIF_AIR_BYLAW_CITATION,
  CIF_BYLAW_L_SUBJECT,
  CIF_GAP_EXAMPLE_LOWER,
  CIF_GAP_EXAMPLE_UPPER,
  CIF_GAP_EXAMPLE_SKIPPED,
  CIF_WBGT_REQUIRED_QUOTE,
  CIF_NO_DEVICE_QUOTE,
  CIF_NOAA_TOOL_URL,
  CIF_CANCEL_QUOTE,
  CIF_CATEGORY_ROSTER_URL,
  CIF_ACCLIMATIZATION_DAYS_MIN,
  CIF_ACCLIMATIZATION_DAYS_MAX,
  CIF_FIVE_DAY_QUOTE,
  CIF_ONE_PRACTICE_QUOTE,
  CIF_FOOTBALL_EQUIPMENT_QUOTE,
  CIF_COOLING_METHOD_QUOTE,
  CIF_HEAT_SOURCE,
  FL_STATUTE_SECTION,
  FL_STATUTE_CITATION,
  FL_ONSITE_MEASUREMENT_QUOTE,
  FL_MODIFY_QUOTE,
  FL_COOLING_ZONE_QUOTE,
  FL_EAP_QUOTE,
  FL_YEAR_ROUND_QUOTE,
  FL_TRAINING_QUOTE,
  FL_STATUTE_SOURCE,
  MIAA_DEVICE_QUOTE,
  MIAA_INDOOR_QUOTE,
  MIAA_COMPETITION_QUOTE,
  MIAA_TABLE_SCOPE_QUOTE,
  MIAA_NO_GAMES_FOOTNOTE_QUOTE,
  MIAA_COOLING_ZONE_WBGT_F,
  NCHSAA_REFERENCE,
  NYSPHSAA_HEAT_INDEX_REFERENCE,
  UIL_EFFECTIVE_DATE,
  UIL_READING_BEFORE_PRACTICE_MAX_MINUTES,
  UIL_READING_INTERVAL_MINUTES,
  UIL_INSTRUMENT_OR_INTERNET_QUOTE,
  UIL_FAQ_FORECAST_QUOTE,
  UIL_FAQ_SOURCE,
  UIL_MANDATE_2026_QUOTE,
  UIL_RECORDKEEPING_QUOTE,
  UIL_INTERNET_CADENCE_QUOTE,
  UIL_LINKED_TOOL,
  GHSA_INSTRUMENT_QUOTE,
  GHSA_POLICY_YEAR_ROUND_QUOTE,
  GHSA_RANGE_HOLD_MINUTES,
  GHSA_RANGE_HOLD_QUOTE,
  GHSA_NO_REVERT_QUOTE,
  GHSA_ESCALATE_QUOTE,
  GHSA_NO_APPS_QUOTE,
  GHSA_MONITOR_EVERY_PRACTICE_QUOTE,
  GHSA_REMINDER_SOURCE,
  GHSA_READING_INTERVAL_MINUTES,
  GHSA_READING_LEAD_MINUTES,
  GHSA_CALIBRATION_INTERVAL_YEARS,
  GHSA_FAQ_WBGT_HI_COMPARISON,
  SCHSL_APP_QUOTE,
  SCHSL_CALIBRATION_INTERVAL_YEARS,
  SCHSL_COLD_IMMERSION_WBGT_F,
  SCHSL_DEVICE_QUOTE,
  SCHSL_RANGE_HOLD_MINUTES,
  SCHSL_READING_INTERVAL_MINUTES,
  SCHSL_READING_LEAD_MINUTES,
  SCHSL_REQUIRED_QUOTE,
  SCHSL_TOP_BOUNDARY_TEXT_QUOTE,
  SCHSL_CONTINUOUS_QUOTE,
  TSSAA_APP_QUOTE,
  TSSAA_COLD_TUB_QUOTE,
  TSSAA_EITHER_QUOTE,
  TSSAA_HEAT_INDEX_BANDS,
  TSSAA_REVISION,
  TSSAA_WBGT_FIRST_CHOICE_QUOTE,
  IOWA_ACCLIMATIZE_DEVICE_MAX_MINUTES,
  IOWA_ACCLIMATIZE_DEVICE_MIN_MINUTES,
  IOWA_AMBIENT_TRIGGER_F,
  IOWA_APP_QUOTE,
  IOWA_CATEGORY_NUMBER,
  IOWA_DEVICE_HEIGHT_FEET,
  IOWA_READING_INTERVAL_MINUTES,
  IOWA_RECOMMENDED_QUOTE,
  NCHSAA_DEVICE_QUOTE,
  NCHSAA_CADENCE_QUOTE,
  NCHSAA_MANDATE_QUOTE,
  NYSPHSAA_AMBIENT_TRIGGER_F,
  NYSPHSAA_APPROVED_ON,
  NYSPHSAA_APP_QUOTE,
  NYSPHSAA_CHECK_LEAD_HOURS,
  NYSPHSAA_UPDATED_ON,
  NYSPHSAA_WARNING_BREAK_INTERVAL_MINUTES,
  NYSPHSAA_ZIP_QUOTE,
  VA_CANCEL_QUOTE,
  VA_CODE_CITATION,
  VA_CODE_SECTION,
  VA_CONSISTENCY_QUOTE,
  VA_ICE_WBGT_F,
  VA_MIN_TIERS,
  VA_STATUTE_SOURCE,
  REMOTE_UNDERESTIMATE_MIN_C,
  REMOTE_UNDERESTIMATE_MAX_C,
} from '../src/data/policyData.js'
import { guidelineSentences } from '../src/lib/guidelineSentences.js'
import { STATE_DIRECTORY } from '../src/data/stateDirectory.js'
import { STATE_GUIDES, AIR_GUIDES, GUIDE_SLUG_BY_ABBR } from '../src/data/guideRegistry.js'
import { feedbackMailto } from '../src/data/feedbackContact.js'
import { MAX_LOG_ENTRIES } from '../src/data/logRetention.js'
import {
  WA_AIR_POLICY,
  OR_AIR_POLICY,
  CA_AIR_POLICY,
  WA_SENSITIVE_GROUP_QUOTE,
  WA_DATA_SOURCE_QUOTE,
  WA_SMOKE_BLOG,
  OR_CONSERVATIVE_METRIC_QUOTE,
  CA_RULE_QUOTE,
  CA_READING_SOURCE_QUOTE,
  CA_REFRAIN_AT_OR_ABOVE_AQI,
  NFHS_LANDMARK_MILES,
  ACTIVITY_IDS,
  AIRNOW_SOURCE,
  EPA_AQI_SOURCE,
  NFHS_AIR_SOURCE,
  NFHS_531_QUOTE,
} from '../src/data/airPolicyData.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, '..', 'dist')
const localesDir = join(__dirname, '..', 'src', 'locales')

const SUPPORTED_LANGS = ['en', 'es']
const localeMap = { en: 'en_US', es: 'es_US' }
const SITE_URL = 'https://wbgtcheck.com'

const today = new Date().toISOString().split('T')[0]

// Grundstein bias numbers interpolate from the oracle constants — locale
// JSON holds only {{min}}/{{max}} templates (mirrors the React call sites).
const BIAS_PARAMS = { min: REMOTE_UNDERESTIMATE_MIN_C, max: REMOTE_UNDERESTIMATE_MAX_C }

// key must match the seo.* namespace in the locale files AND src/seo.ts
const pages = [
  { key: 'home', path: '', dateModified: today },
  { key: 'texas', path: 'texas', dateModified: today },
  { key: 'georgia', path: 'georgia', dateModified: today },
  { key: 'southCarolina', path: 'south-carolina', dateModified: today },
  { key: 'tennessee', path: 'tennessee', dateModified: today },
  { key: 'iowa', path: 'iowa', dateModified: today },
  { key: 'northCarolina', path: 'north-carolina', dateModified: today },
  { key: 'newYork', path: 'new-york', dateModified: today },
  { key: 'virginia', path: 'virginia', dateModified: today },
  { key: 'massachusetts', path: 'massachusetts', dateModified: today },
  { key: 'florida', path: 'florida', dateModified: today },
  { key: 'california', path: 'california', dateModified: today },
  { key: 'kentucky', path: 'kentucky', dateModified: today },
  { key: 'wbgtVsHeatIndex', path: 'wbgt-vs-heat-index', dateModified: today },
  { key: 'states', path: 'states', dateModified: today },
  { key: 'washingtonAir', path: 'washington-air-quality', dateModified: today },
  { key: 'oregonAir', path: 'oregon-air-quality', dateModified: today },
  { key: 'californiaAir', path: 'california-air-quality', dateModified: today },
  { key: 'privacy', path: 'privacy', dateModified: today },
  { key: 'disclaimer', path: 'disclaimer', dateModified: today },
]

const locales = {}
for (const lang of SUPPORTED_LANGS) {
  locales[lang] = JSON.parse(readFileSync(join(localesDir, `${lang}.json`), 'utf-8'))
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;')
}

/** Mini-t: dot-path lookup with EN fallback + {{var}} interpolation. */
function makeT(lang) {
  const resolve = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
  return (key, params = {}) => {
    const template = resolve(locales[lang], key) ?? resolve(locales.en, key)
    if (typeof template !== 'string') return ''
    return template.replace(/\{\{(\w+)\}\}/g, (_, name) => String(params[name] ?? ''))
  }
}

function getPageUrl(lang, pagePath) {
  return pagePath === '' ? `${SITE_URL}/${lang}` : `${SITE_URL}/${lang}/${pagePath}`
}

function generateMetaTags(lang, page) {
  const seoData = locales[lang].seo[page.key] ?? locales.en.seo[page.key]
  if (!seoData) {
    throw new Error(`Missing SEO data for key: "${page.key}" in lang: "${lang}"`)
  }
  const { title, description } = seoData
  const keywords = seoData.keywords ?? ''
  const canonicalUrl = getPageUrl(lang, page.path)
  const ogLocale = localeMap[lang]

  const hreflangTags = SUPPORTED_LANGS.map(
    (l) =>
      `    <link data-prerender="true" rel="alternate" hreflang="${l}" href="${getPageUrl(l, page.path)}" />`,
  ).join('\n')
  const xDefaultTag = `\n    <link data-prerender="true" rel="alternate" hreflang="x-default" href="${getPageUrl('en', page.path)}" />`

  // WebApplication only for the actual application page (home). Content pages
  // get BreadcrumbList below. No aggregateRating anywhere — ever.
  const jsonLd =
    page.path === ''
      ? {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: title,
          url: canonicalUrl,
          description,
          applicationCategory: 'UtilityApplication',
          operatingSystem: 'All',
          inLanguage: localeMap[lang].replace('_', '-'),
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: title,
          description,
          inLanguage: localeMap[lang].replace('_', '-'),
          dateModified: page.dateModified,
          author: { '@type': 'Organization', name: 'WBGT Check' },
          publisher: { '@type': 'Organization', name: 'WBGT Check', url: SITE_URL },
          mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
        }

  return `
    <title>${escapeHtml(title)}</title>
    <meta data-prerender="true" name="description" content="${escapeAttr(description)}" />
    <meta data-prerender="true" name="keywords" content="${escapeAttr(keywords)}" />
    <meta data-prerender="true" property="og:type" content="website" />
    <meta data-prerender="true" property="og:title" content="${escapeAttr(title)}" />
    <meta data-prerender="true" property="og:description" content="${escapeAttr(description)}" />
    <meta data-prerender="true" property="og:url" content="${canonicalUrl}" />
    <meta data-prerender="true" property="og:locale" content="${ogLocale}" />
    <meta data-prerender="true" name="twitter:card" content="summary" />
    <meta data-prerender="true" name="twitter:title" content="${escapeAttr(title)}" />
    <meta data-prerender="true" name="twitter:description" content="${escapeAttr(description)}" />
    <link data-prerender="true" rel="canonical" href="${canonicalUrl}" />
${hreflangTags}${xDefaultTag}
    <script data-prerender="true" type="application/ld+json">${JSON.stringify(jsonLd)}</script>`
}

function generateBreadcrumbJsonLd(lang, page) {
  if (page.path === '') return null
  const homeName = locales[lang]?.seo?.home?.title ?? 'WBGT Check'
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: homeName, item: `${SITE_URL}/${lang}` },
      {
        '@type': 'ListItem',
        position: 2,
        name: locales[lang]?.seo?.[page.key]?.title ?? page.key,
      },
    ],
  }
}

function policyTableHtml(policy, t) {
  const rows = [...policy.bands]
    .reverse()
    .map((band) => {
      const sentences = guidelineSentences(band.flag, band.guideline, t)
        .map((s) => `<li>${escapeHtml(s)}</li>`)
        .join('')
      return `<tr><th scope="row">${escapeHtml(t(`flags.${band.flag}.label`))} ${escapeHtml(band.sourceLabel)}</th><td><ul>${sentences}</ul></td></tr>`
    })
    .join('')
  return `<table><thead><tr><th>${escapeHtml(t('verdict.wbgtLabel'))} (°F)</th><th>${escapeHtml(t('texas.tableGuidelines'))}</th></tr></thead><tbody>${rows}</tbody></table>`
}

/** NCHSAA's chart — the current handbook's two columns, coolest row first. */
function referenceTableHtml(table, t) {
  const rows = [...table.rows]
    .reverse()
    .map((row) => {
      const items = row.textKeys.map((key) => `<li>${escapeHtml(t(key))}</li>`)
      if (row.breakMinutes !== null && row.breakEveryMinutes !== null) {
        items.push(
          `<li>${escapeHtml(
            t('northCarolina.breakCell', {
              minutes: row.breakMinutes,
              every: row.breakEveryMinutes,
            }),
          )}</li>`,
        )
      }
      return `<tr><td>${escapeHtml(row.sourceLabel)}</td><td><ul>${items.join('')}</ul></td></tr>`
    })
    .join('')
  return `<table><thead><tr><th>${escapeHtml(t('northCarolina.colWbgt'))}</th><th>${escapeHtml(
    t('northCarolina.colGuideline'),
  )}</th></tr></thead><tbody>${rows}</tbody></table>`
}

/** NYSPHSAA's heat-index ladder — HEAT INDEX degrees, never WBGT. */
function newYorkTableHtml(t) {
  const rows = [...NYSPHSAA_HEAT_INDEX_REFERENCE.rows]
    .reverse()
    .map((row) => {
      const items = row.textKeys
        .map(
          (key) =>
            `<li>${escapeHtml(t(key, { minutes: NYSPHSAA_WARNING_BREAK_INTERVAL_MINUTES }))}</li>`,
        )
        .join('')
      const tier = `${t(`newYork.tiers.${row.tierKey}`)} — ${
        row.required ? t('newYork.requiredLabel') : t('newYork.recommendedLabel')
      }`
      return `<tr><td>${escapeHtml(row.sourceLabel)}</td><td>${escapeHtml(
        tier,
      )}</td><td><ul>${items}</ul></td></tr>`
    })
    .join('')
  return `<table><thead><tr><th>${escapeHtml(t('newYork.colHeatIndex'))}</th><th>${escapeHtml(
    t('newYork.colTier'),
  )}</th><th>${escapeHtml(t('newYork.colAction'))}</th></tr></thead><tbody>${rows}</tbody></table>`
}

/** Duration column head — mirrors the React table header (label + example). */
function activityDurationLabel(id, t) {
  return `${t(`air.activity.${id}`)} (${t(`air.activityExample.${id}`)})`
}

function visibilityBody(t) {
  return t('air.visibilityBody', {
    near: NFHS_LANDMARK_MILES[0],
    mid: NFHS_LANDMARK_MILES[1],
    far: NFHS_LANDMARK_MILES[2],
  })
}

/** Correction invitation — mirrors components/CorrectionNote.tsx. */
function correctionNoteHtml(t, topic, lang) {
  // Mirrors components/CorrectionNote.tsx, including the non-English note that
  // quotations are left in the association's own words.
  const quotes =
    lang && lang !== 'en' ? `<p>${escapeHtml(t('common.quotesInEnglish'))}</p>` : ''
  return `${quotes}<p>${escapeHtml(t('common.correctionNote'))} <a href="${feedbackMailto(`wbgtcheck correction: ${topic}`)}">${escapeHtml(t('common.correctionCta'))}</a></p>`
}

/** Attribution block — mirrors components/AirDataSources.tsx. */
function airDataSourcesHtml(t, withVisibilityQuote) {
  const links = [AIRNOW_SOURCE, EPA_AQI_SOURCE, NFHS_AIR_SOURCE]
    .map((s) => `<li><a href="${s.url}">${escapeHtml(s.name)}</a></li>`)
    .join('')
  const quote = withVisibilityQuote
    ? `<blockquote>${escapeHtml(NFHS_531_QUOTE)}</blockquote>`
    : ''
  return `<h2>${escapeHtml(t('air.dataSourcesHeading'))}</h2><p>${escapeHtml(
    t('air.dataSourcesBody'),
  )}</p>${quote}<ul>${links}</ul>`
}

/** AQI band × duration table (WA) — same cells as pages/WashingtonAir.tsx. */
function airActivityTableHtml(policy, t) {
  const head = ACTIVITY_IDS.map(
    (id) => `<th>${escapeHtml(activityDurationLabel(id, t))}</th>`,
  ).join('')
  const rows = policy.bands
    .map((band) => {
      const cells = ACTIVITY_IDS.map(
        (id) => `<td>${escapeHtml(t(`air.actions.${band.actions[id]}`))}</td>`,
      ).join('')
      return `<tr><td>${escapeHtml(band.sourceLabel)}</td>${cells}</tr>`
    })
    .join('')
  return `<table><thead><tr><th>${escapeHtml(t('air.tableAqi'))}</th>${head}</tr></thead><tbody>${rows}</tbody></table>`
}

/** AQI band table with the visibility column (OR) — mirrors pages/OregonAir.tsx. */
function airBandTableHtml(policy, t) {
  const rows = policy.bands
    .filter((band) => band.action !== null)
    .map(
      (band) =>
        `<tr><td>${escapeHtml(band.sourceLabel)}</td><td>${escapeHtml(
          band.visibilityLabel ?? '',
        )}</td><td>${escapeHtml(t(`air.actions.${band.action}`))}</td></tr>`,
    )
    .join('')
  return `<table><thead><tr><th>${escapeHtml(t('air.tableAqi'))}</th><th>${escapeHtml(
    t('air.tableVisibility'),
  )}</th><th>${escapeHtml(t('air.tableAction'))}</th></tr></thead><tbody>${rows}</tbody></table>`
}

function generateBodyContent(lang, page) {
  const t = makeT(lang)
  const parts = []
  const push = (html) => parts.push(html)

  if (page.path === '') {
    push(`<h1>${escapeHtml(t('home.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('home.heroBadge'))}</p>`)
    push(`<p>${escapeHtml(t('home.intro'))}</p>`)
    const sectionCount = (locales[lang].home?.sections ?? locales.en.home.sections).length
    for (let i = 0; i < sectionCount; i++) {
      push(
        `<h2>${escapeHtml(t(`home.sections.${i}.heading`))}</h2><p>${escapeHtml(
          t(`home.sections.${i}.body`, BIAS_PARAMS),
        )}</p>`,
      )
    }
    push('<nav><ul>')
    for (const p of pages) {
      if (p.path === '' || p.key === 'privacy' || p.key === 'disclaimer') continue
      const title = (locales[lang].seo[p.key] ?? locales.en.seo[p.key]).title
      push(`<li><a href="/${lang}/${p.path}">${escapeHtml(title)}</a></li>`)
    }
    push('</ul></nav>')
    push(`<p>${escapeHtml(t('common.footer.safetySummary'))}</p>`)
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
  } else if (page.key === 'texas') {
    push(`<h1>${escapeHtml(t('texas.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('texas.intro', { effectiveDate: UIL_EFFECTIVE_DATE }))}</p>`)
    push(`<h2>${escapeHtml(t('texas.mandate2026Heading'))}</h2>`)
    push(`<p>${escapeHtml(t('texas.mandate2026Body', { quote: UIL_MANDATE_2026_QUOTE }))}</p>`)
    push(
      `<p>${escapeHtml(
        t('texas.recordkeepingNote', {
          before: UIL_READING_BEFORE_PRACTICE_MAX_MINUTES,
          interval: UIL_READING_INTERVAL_MINUTES,
          record: UIL_RECORDKEEPING_QUOTE,
        }),
      )}</p>`,
    )
    push(`<h2>${escapeHtml(t('texas.classesHeading'))}</h2><p>${escapeHtml(t('texas.classesBody'))}</p>`)
    push(`<h2>${escapeHtml(t('texas.tableHeading'))}</h2>`)
    push(`<h3>${escapeHtml(t('texas.tableClass2'))}</h3>`)
    push(policyTableHtml(UIL_CLASS_2, t))
    push(`<h3>${escapeHtml(t('texas.tableClass3'))}</h3>`)
    push(policyTableHtml(UIL_CLASS_3, t))
    push(`<h2>${escapeHtml(t('texas.measurementHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(
        t('measurement.uilTiming', {
          before: UIL_READING_BEFORE_PRACTICE_MAX_MINUTES,
          interval: UIL_READING_INTERVAL_MINUTES,
        }),
      )}</p>`,
    )
    push(`<p>${escapeHtml(t('texas.measurementApps'))}</p>`)
    push(
      `<p>${escapeHtml(t('texas.internetCadenceNote', { quote: UIL_INTERNET_CADENCE_QUOTE }))}</p>`,
    )
    push(`<p>${escapeHtml(t('texas.competitionNote'))}</p>`)
    push(`<p>${escapeHtml(t('texas.bandNote'))}</p>`)
    push(`<h2>${escapeHtml(t('texas.legalityHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(
        t('texas.legalityBody', {
          req: UIL_INSTRUMENT_OR_INTERNET_QUOTE,
          faq: UIL_FAQ_FORECAST_QUOTE,
        }),
      )}</p>`,
    )
    push(`<p>${escapeHtml(t('texas.legalityNoList'))}</p>`)
    push(
      `<p>${escapeHtml(t('texas.linkedToolNote', { name: UIL_LINKED_TOOL.name }))} <a href="${UIL_LINKED_TOOL.url}">${escapeHtml(UIL_LINKED_TOOL.url)}</a></p>`,
    )
    push(
      `<p><a href="${UIL_FAQ_SOURCE.url}">${escapeHtml(UIL_FAQ_SOURCE.name)}</a> (${escapeHtml(t('policies.verifiedOn', { date: UIL_FAQ_SOURCE.verifiedOn }))})</p>`,
    )
    push(
      `<p>${escapeHtml(t('texas.sourceBody', { verifiedOn: UIL_CLASS_3.source.verifiedOn }))} <a href="${UIL_CLASS_3.source.url}">${escapeHtml(UIL_CLASS_3.source.name)}</a></p>`,
    )
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
    push(correctionNoteHtml(t, 'texas', lang))
  } else if (page.key === 'georgia') {
    push(`<h1>${escapeHtml(t('georgia.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('georgia.intro', { yearRound: GHSA_POLICY_YEAR_ROUND_QUOTE }))}</p>`)
    push(`<h2>${escapeHtml(t('georgia.deviceHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(
        t('georgia.deviceBody', {
          quote: GHSA_INSTRUMENT_QUOTE,
          interval: GHSA_READING_INTERVAL_MINUTES,
          lead: GHSA_READING_LEAD_MINUTES,
          years: GHSA_CALIBRATION_INTERVAL_YEARS,
        }),
      )}</p>`,
    )
    push(`<p>${escapeHtml(t('georgia.seasonNote'))}</p>`)
    push(
      `<p>${escapeHtml(
        t('georgia.noAppsBody', {
          noApps: GHSA_NO_APPS_QUOTE,
          monitor: GHSA_MONITOR_EVERY_PRACTICE_QUOTE,
        }),
      )}</p>`,
    )
    push(`<p>${escapeHtml(t('georgia.deviceWarning'))}</p>`)
    push(
      `<p><a href="${GHSA_REMINDER_SOURCE.url}">${escapeHtml(GHSA_REMINDER_SOURCE.name)}</a> (${escapeHtml(t('policies.verifiedOn', { date: GHSA_REMINDER_SOURCE.verifiedOn }))})</p>`,
    )
    push(`<h2>${escapeHtml(t('georgia.tableHeading'))}</h2>`)
    push(policyTableHtml(GHSA, t))
    push(`<h2>${escapeHtml(t('georgia.holdHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(
        t('georgia.holdBody', {
          hold: GHSA_RANGE_HOLD_MINUTES,
          hold1: GHSA_RANGE_HOLD_QUOTE,
          hold2: GHSA_NO_REVERT_QUOTE,
          escalate: GHSA_ESCALATE_QUOTE,
        }),
      )}</p>`,
    )
    push(`<p>${escapeHtml(t('georgia.holdPlanning'))}</p>`)
    push(`<h2>${escapeHtml(t('georgia.practiceDefHeading'))}</h2><p>${escapeHtml(t('georgia.practiceDefBody'))}</p>`)
    push(
      `<p>${escapeHtml(t('georgia.sourceBody', { verifiedOn: GHSA.source.verifiedOn }))} <a href="${GHSA.source.url}">${escapeHtml(GHSA.source.name)}</a></p>`,
    )
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
    push(correctionNoteHtml(t, 'georgia', lang))
  } else if (page.key === 'southCarolina') {
    push(`<h1>${escapeHtml(t('southCarolina.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('southCarolina.intro'))}</p>`)
    push(`<h2>${escapeHtml(t('southCarolina.deviceHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(
        t('southCarolina.deviceBody', {
          required: SCHSL_REQUIRED_QUOTE,
          device: SCHSL_DEVICE_QUOTE,
          apps: SCHSL_APP_QUOTE,
        }),
      )}</p>`,
    )
    push(`<p>${escapeHtml(t('southCarolina.deviceWarning'))}</p>`)
    push(`<h2>${escapeHtml(t('southCarolina.tableHeading'))}</h2>`)
    push(policyTableHtml(SCHSL, t))
    push(
      `<p>${escapeHtml(
        t('southCarolina.boundaryNote', {
          tableLabel: SCHSL.bands[0].sourceLabel,
          textLabel: SCHSL_TOP_BOUNDARY_TEXT_QUOTE,
        }),
      )}</p>`,
    )
    push(`<h2>${escapeHtml(t('southCarolina.measurementHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(
        t('southCarolina.measurementTiming', {
          lead: SCHSL_READING_LEAD_MINUTES,
          interval: SCHSL_READING_INTERVAL_MINUTES,
        }),
      )}</p>`,
    )
    push(
      `<p>${escapeHtml(t('southCarolina.measurementHold', { hold: SCHSL_RANGE_HOLD_MINUTES }))}</p>`,
    )
    push(
      `<p>${escapeHtml(
        t('southCarolina.measurementCalibration', { years: SCHSL_CALIBRATION_INTERVAL_YEARS }),
      )}</p>`,
    )
    push(
      `<p>${escapeHtml(
        t('southCarolina.immersionNote', { immersion: SCHSL_COLD_IMMERSION_WBGT_F }),
      )}</p>`,
    )
    push(
      `<p>${escapeHtml(
        t('southCarolina.continuousNote', { quote: SCHSL_CONTINUOUS_QUOTE }),
      )}</p>`,
    )
    push(
      `<p>${escapeHtml(t('southCarolina.sourceBody', { verifiedOn: SCHSL.source.verifiedOn }))} <a href="${SCHSL.source.url}">${escapeHtml(SCHSL.source.name)}</a></p>`,
    )
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
    push(correctionNoteHtml(t, 'south-carolina', lang))
  } else if (page.key === 'tennessee') {
    push(`<h1>${escapeHtml(t('tennessee.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('tennessee.intro'))}</p>`)
    push(`<h2>${escapeHtml(t('tennessee.choiceHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(
        t('tennessee.choiceBody', {
          either: TSSAA_EITHER_QUOTE,
          firstChoice: TSSAA_WBGT_FIRST_CHOICE_QUOTE,
        }),
      )}</p>`,
    )
    push(`<h2>${escapeHtml(t('tennessee.tableHeading'))}</h2>`)
    push(policyTableHtml(TSSAA, t))
    push(`<p>${escapeHtml(t('tennessee.lowBandNote'))}</p>`)
    push(`<h2>${escapeHtml(t('tennessee.hiTableHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('tennessee.hiTableNote'))}</p>`)
    push(
      `<table><thead><tr><th>${escapeHtml(t('tennessee.hiColHeatIndex'))}</th><th>${escapeHtml(
        t('tennessee.hiColWbgt'),
      )}</th></tr></thead><tbody>${TSSAA_HEAT_INDEX_BANDS.map(
        (b) => `<tr><td>${escapeHtml(b.sourceLabel)}</td><td>${escapeHtml(b.pairsWithWbgt)}</td></tr>`,
      ).join('')}</tbody></table>`,
    )
    push(`<h2>${escapeHtml(t('tennessee.appsHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('tennessee.appsBody', { apps: TSSAA_APP_QUOTE }))}</p>`)
    push(`<p>${escapeHtml(t('tennessee.deviceWarning'))}</p>`)
    push(`<h2>${escapeHtml(t('tennessee.coldTubHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('tennessee.coldTubBody', { quote: TSSAA_COLD_TUB_QUOTE }))}</p>`)
    push(`<h2>${escapeHtml(t('tennessee.scopeHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('tennessee.scopeBody'))}</p>`)
    push(
      `<p>${escapeHtml(
        t('tennessee.sourceBody', {
          revision: TSSAA_REVISION,
          verifiedOn: TSSAA.source.verifiedOn,
        }),
      )} <a href="${TSSAA.source.url}">${escapeHtml(TSSAA.source.name)}</a></p>`,
    )
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
    push(correctionNoteHtml(t, 'tennessee', lang))
  } else if (page.key === 'iowa') {
    push(`<h1>${escapeHtml(t('iowa.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('iowa.intro'))}</p>`)
    push(`<h2>${escapeHtml(t('iowa.recommendedHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('iowa.recommendedBody', { recommended: IOWA_RECOMMENDED_QUOTE }))}</p>`)
    push(`<p>${escapeHtml(t('iowa.categoryBody', { category: IOWA_CATEGORY_NUMBER }))}</p>`)
    push(`<p>${escapeHtml(t('iowa.triggerNote', { trigger: IOWA_AMBIENT_TRIGGER_F }))}</p>`)
    push(`<h2>${escapeHtml(t('iowa.tableHeading'))}</h2>`)
    push(policyTableHtml(IOWA_CATEGORY_2, t))
    push(
      `<p>${escapeHtml(
        t('iowa.boundaryNote', {
          tableLow: IOWA_CATEGORY_2.bands[4].sourceLabel,
          tableNext: IOWA_CATEGORY_2.bands[3].sourceLabel,
        }),
      )}</p>`,
    )
    push(`<h2>${escapeHtml(t('iowa.appsHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('iowa.appsBody', { apps: IOWA_APP_QUOTE }))}</p>`)
    push(`<p>${escapeHtml(t('iowa.deviceWarning'))}</p>`)
    push(`<h2>${escapeHtml(t('iowa.measurementHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(
        t('iowa.measurementBody', {
          accMin: IOWA_ACCLIMATIZE_DEVICE_MIN_MINUTES,
          accMax: IOWA_ACCLIMATIZE_DEVICE_MAX_MINUTES,
          height: IOWA_DEVICE_HEIGHT_FEET,
          interval: IOWA_READING_INTERVAL_MINUTES,
        }),
      )}</p>`,
    )
    push(`<h2>${escapeHtml(t('iowa.bandHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('iowa.bandBody'))}</p>`)
    push(
      `<p>${escapeHtml(t('iowa.sourceBody', { verifiedOn: IOWA_CATEGORY_2.source.verifiedOn }))} <a href="${IOWA_CATEGORY_2.source.url}">${escapeHtml(IOWA_CATEGORY_2.source.name)}</a></p>`,
    )
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
    push(correctionNoteHtml(t, 'iowa', lang))
  } else if (page.key === 'northCarolina') {
    push(`<h1>${escapeHtml(t('northCarolina.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('northCarolina.intro'))}</p>`)
    push(`<h2>${escapeHtml(t('northCarolina.measurementHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(
        t('northCarolina.measurementBody', {
          device: NCHSAA_DEVICE_QUOTE,
          cadence: NCHSAA_CADENCE_QUOTE,
        }),
      )}</p>`,
    )
    push(`<h2>${escapeHtml(t('northCarolina.pickerExclusionHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('northCarolina.pickerExclusionBody'))}</p>`)
    push(`<h2>${escapeHtml(t('northCarolina.tableHeading'))}</h2>`)
    push(referenceTableHtml(NCHSAA_REFERENCE, t))
    push(`<h2>${escapeHtml(t('northCarolina.mandateHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(t('northCarolina.mandateBody', { mandate: NCHSAA_MANDATE_QUOTE }))}</p>`,
    )
    push(
      `<p>${escapeHtml(t('northCarolina.sourceBody', { verifiedOn: NCHSAA_REFERENCE.source.verifiedOn }))} <a href="${NCHSAA_REFERENCE.source.url}">${escapeHtml(NCHSAA_REFERENCE.source.name)}</a></p>`,
    )
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
    push(correctionNoteHtml(t, 'north-carolina', lang))
  } else if (page.key === 'newYork') {
    push(`<h1>${escapeHtml(t('newYork.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('newYork.intro'))}</p>`)
    push(`<h2>${escapeHtml(t('newYork.notWbgtHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(
        t('newYork.notWbgtBody', {
          lead: NYSPHSAA_CHECK_LEAD_HOURS,
          trigger: NYSPHSAA_AMBIENT_TRIGGER_F,
        }),
      )}</p>`,
    )
    push(`<h2>${escapeHtml(t('newYork.appHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(t('newYork.appBody', { app: NYSPHSAA_APP_QUOTE, zip: NYSPHSAA_ZIP_QUOTE }))}</p>`,
    )
    push(`<p>${escapeHtml(t('newYork.appCaveat'))}</p>`)
    push(`<h2>${escapeHtml(t('newYork.tableHeading'))}</h2>`)
    push(newYorkTableHtml(t))
    push(`<p>${escapeHtml(t('newYork.wbgtChartNote'))}</p>`)
    push(
      `<p>${escapeHtml(
        t('newYork.sourceBody', {
          approved: NYSPHSAA_APPROVED_ON,
          updated: NYSPHSAA_UPDATED_ON,
          verifiedOn: NYSPHSAA_HEAT_INDEX_REFERENCE.source.verifiedOn,
        }),
      )} <a href="${NYSPHSAA_HEAT_INDEX_REFERENCE.source.url}">${escapeHtml(NYSPHSAA_HEAT_INDEX_REFERENCE.source.name)}</a></p>`,
    )
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
    push(correctionNoteHtml(t, 'new-york', lang))
  } else if (page.key === 'kentucky') {
    push(`<h1>${escapeHtml(t('kentucky.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('kentucky.intro'))}</p>`)
    push(`<h2>${escapeHtml(t('kentucky.currencyHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(
        t('kentucky.currencyBody', {
          revision: lang === 'es' ? KY_REVISION_ISO : KY_REVISION,
        }),
      )}</p>`,
    )
    push(`<h2>${escapeHtml(t('kentucky.tableHeading'))}</h2>`)
    push(
      `<table><thead><tr><th>${escapeHtml(t('kentucky.colRange'))}</th><th>${escapeHtml(t('kentucky.colActions'))}</th></tr></thead><tbody>${KHSAA_WBGT_REFERENCE.rows
        .map(
          (row) =>
            `<tr><th scope="row">${escapeHtml(row.sourceLabel)}</th><td><ul>${row.textKeys
              .map((key) => `<li>${escapeHtml(t(key))}</li>`)
              .join('')}</ul></td></tr>`,
        )
        .join('')}</tbody></table>`,
    )
    push(
      `<p>${escapeHtml(t('kentucky.recheckNote', { interval: KY_RECHECK_INTERVAL_MINUTES }))}</p>`,
    )
    push(`<p>${escapeHtml(t('kentucky.scopeNote'))}</p>`)
    push(
      `<p>${escapeHtml(t('kentucky.belowBandsNote', { floor: KY_LOWEST_BAND_FLOOR }))}</p>`,
    )
    push(`<h2>${escapeHtml(t('kentucky.measurementHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('kentucky.measurementBody', { quote: KY_ONSITE_ONLY_QUOTE }))}</p>`)
    push(`<p>${escapeHtml(t('kentucky.invalidBody', { quote: KY_OFFSITE_INVALID_QUOTE }))}</p>`)
    push(`<p>${escapeHtml(t('kentucky.footballBody', { quote: KY_FOOTBALL_ONSITE_QUOTE }))}</p>`)
    push(`<p>${escapeHtml(t('kentucky.deviceWarning'))}</p>`)
    push(`<h2>${escapeHtml(t('kentucky.pickerExclusionHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('kentucky.pickerExclusionBody'))}</p>`)
    push(
      `<h2>${escapeHtml(t('kentucky.sourceHeading'))}</h2><p>${escapeHtml(t('kentucky.sourceBody', { verifiedOn: KHSAA_WBGT_REFERENCE.source.verifiedOn }))} <a href="${KHSAA_WBGT_REFERENCE.source.url}">${escapeHtml(KHSAA_WBGT_REFERENCE.source.name)}</a></p>`,
    )
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
    push(correctionNoteHtml(t, 'kentucky', lang))
  } else if (page.key === 'california') {
    push(`<h1>${escapeHtml(t('california.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('california.intro'))}</p>`)
    push(`<h2>${escapeHtml(t('california.categoryHeading'))}</h2>`)
    push(
      `<p><a href="${CIF_CATEGORY_ROSTER_URL}">${escapeHtml(t('california.rosterLink'))}</a></p>`,
    )
    push(`<p>${escapeHtml(t('california.categoryBody', { basis: CIF_LEGAL_BASIS }))}</p>`)
    push(`<p>${escapeHtml(t('california.cancelBody', { quote: CIF_CANCEL_QUOTE }))}</p>`)
    push(`<h2>${escapeHtml(t('california.pickerExclusionHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('california.pickerExclusionBody'))}</p>`)
    // Threshold grid + one action table, mirroring California.tsx.
    push(`<h2>${escapeHtml(t('california.thresholdsHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('california.thresholdsIntro'))}</p>`)
    {
      const head = `<tr><th>${escapeHtml(t('california.colFlag'))}</th>${CIF_CATEGORIES.map(
        (_, i) => `<th>${escapeHtml(t('california.colCategory', { n: i + 1 }))}</th>`,
      ).join('')}</tr>`
      const rows = [...CIF_CATEGORIES[0].bands]
        .reverse()
        .map((band, rowIndex) => {
          const cells = CIF_CATEGORIES.map(
            (policy) => `<td>${escapeHtml([...policy.bands].reverse()[rowIndex].sourceLabel)}</td>`,
          ).join('')
          return `<tr><th scope="row">${escapeHtml(t(`flags.${band.flag}.label`))}</th>${cells}</tr>`
        })
        .join('')
      push(`<table><thead>${head}</thead><tbody>${rows}</tbody></table>`)
    }
    push(`<h2>${escapeHtml(t('california.actionsHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('california.actionsIntro'))}</p>`)
    push(policyTableHtml(CIF_CATEGORIES[0], t))
    push(`<h2>${escapeHtml(t('california.boundaryHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(
        t('california.boundaryBody', {
          lower: CIF_GAP_EXAMPLE_LOWER,
          upper: CIF_GAP_EXAMPLE_UPPER,
          skipped: CIF_GAP_EXAMPLE_SKIPPED,
        }),
      )}</p>`,
    )
    push(`<h2>${escapeHtml(t('california.measurementHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(t('california.measurementBody', { quote: CIF_WBGT_REQUIRED_QUOTE }))}</p>`,
    )
    push(`<p>${escapeHtml(t('california.noDeviceBody', { quote: CIF_NO_DEVICE_QUOTE }))}</p>`)
    push(`<p><a href="${CIF_NOAA_TOOL_URL}">${escapeHtml(t('california.noaaLink'))}</a></p>`)
    push(`<p>${escapeHtml(t('california.stillNotCompliance'))}</p>`)
    push(`<h2>${escapeHtml(t('california.acclimatizationHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(
        t('california.acclimatizationBody', {
          min: CIF_ACCLIMATIZATION_DAYS_MIN,
          max: CIF_ACCLIMATIZATION_DAYS_MAX,
        }),
      )}</p>`,
    )
    push(
      `<p>${escapeHtml(t('california.coolingMethodBody', { cooling: CIF_COOLING_METHOD_QUOTE }))}</p>`,
    )
    push(`<h2>${escapeHtml(t('california.acclimatizationMandateHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(t('california.acclimatizationMandateBody', { fiveDay: CIF_FIVE_DAY_QUOTE }))}</p>`,
    )
    push(
      `<p>${escapeHtml(t('california.acclimatizationLimitsBody', { onePractice: CIF_ONE_PRACTICE_QUOTE }))}</p>`,
    )
    push(
      `<p>${escapeHtml(t('california.acclimatizationFootballBody', { football: CIF_FOOTBALL_EQUIPMENT_QUOTE }))}</p>`,
    )
    push(
      `<h2>${escapeHtml(t('california.sourceHeading'))}</h2><p>${escapeHtml(t('california.sourceBody', { verifiedOn: CIF_HEAT_SOURCE.verifiedOn }))} <a href="${CIF_HEAT_SOURCE.url}">${escapeHtml(CIF_HEAT_SOURCE.name)}</a></p>`,
    )
    push(
      `<p>${escapeHtml(
        t('california.bylawNumberNote', {
          actual: CIF_AIR_BYLAW_CITATION,
          other: CIF_BYLAW_L_SUBJECT,
        }),
      )}</p>`,
    )
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
    push(correctionNoteHtml(t, 'california', lang))
  } else if (page.key === 'florida') {
    push(`<h1>${escapeHtml(t('florida.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('florida.intro'))}</p>`)
    push(`<h2>${escapeHtml(t('florida.statuteHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(
        t('florida.statuteBody', {
          section: FL_STATUTE_SECTION,
          citation: FL_STATUTE_CITATION,
        }),
      )}</p>`,
    )
    push(`<p>${escapeHtml(t('florida.modifyBody', { quote: FL_MODIFY_QUOTE }))}</p>`)
    push(`<p>${escapeHtml(t('florida.yearRoundBody', { quote: FL_YEAR_ROUND_QUOTE }))}</p>`)
    push(`<h2>${escapeHtml(t('florida.measurementHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(t('florida.measurementBody', { quote: FL_ONSITE_MEASUREMENT_QUOTE }))}</p>`,
    )
    push(`<p>${escapeHtml(t('florida.wbgtNamingBody'))}</p>`)
    push(`<p>${escapeHtml(t('florida.deviceWarning'))}</p>`)
    push(`<h2>${escapeHtml(t('florida.coolingHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('florida.coolingBody', { quote: FL_COOLING_ZONE_QUOTE }))}</p>`)
    push(`<p>${escapeHtml(t('florida.eapBody', { quote: FL_EAP_QUOTE }))}</p>`)
    push(`<p>${escapeHtml(t('florida.trainingBody', { quote: FL_TRAINING_QUOTE }))}</p>`)
    push(`<h2>${escapeHtml(t('florida.noTableHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('florida.noTableBody'))}</p>`)
    push(`<h2>${escapeHtml(t('florida.pickerExclusionHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('florida.pickerExclusionBody'))}</p>`)
    push(
      `<h2>${escapeHtml(t('florida.sourceHeading'))}</h2><p>${escapeHtml(t('florida.sourceBody', { verifiedOn: FL_STATUTE_SOURCE.verifiedOn }))} <a href="${FL_STATUTE_SOURCE.url}">${escapeHtml(FL_STATUTE_SOURCE.name)}</a></p>`,
    )
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
    push(correctionNoteHtml(t, 'florida', lang))
  } else if (page.key === 'massachusetts') {
    push(`<h1>${escapeHtml(t('massachusetts.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('massachusetts.intro'))}</p>`)
    push(`<h2>${escapeHtml(t('massachusetts.tableHeading'))}</h2>`)
    push(policyTableHtml(MIAA, t))
    push(
      `<p>${escapeHtml(
        t('massachusetts.boundaryNote', { edge: MIAA.bands[2].minF.toFixed(1) }),
      )}</p>`,
    )
    push(`<h2>${escapeHtml(t('massachusetts.deviceHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('massachusetts.deviceBody', { quote: MIAA_DEVICE_QUOTE }))}</p>`)
    push(`<p>${escapeHtml(t('massachusetts.indoorBody', { quote: MIAA_INDOOR_QUOTE }))}</p>`)
    push(`<p>${escapeHtml(t('massachusetts.deviceWarning'))}</p>`)
    push(`<h2>${escapeHtml(t('massachusetts.competitionHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(
        t('massachusetts.competitionBody', {
          scope: MIAA_TABLE_SCOPE_QUOTE,
          quote: MIAA_COMPETITION_QUOTE,
        }),
      )}</p>`,
    )
    push(
      `<p>${escapeHtml(
        t('massachusetts.noGamesBody', {
          footnote: MIAA_NO_GAMES_FOOTNOTE_QUOTE,
          band: MIAA.bands[2].sourceLabel,
        }),
      )}</p>`,
    )
    push(`<h2>${escapeHtml(t('massachusetts.coolingHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(t('massachusetts.coolingBody', { wbgt: MIAA_COOLING_ZONE_WBGT_F }))}</p>`,
    )
    push(
      `<h2>${escapeHtml(t('massachusetts.sourceHeading'))}</h2><p>${escapeHtml(t('massachusetts.sourceBody', { verifiedOn: MIAA.source.verifiedOn }))} <a href="${MIAA.source.url}">${escapeHtml(MIAA.source.name)}</a></p>`,
    )
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
    push(correctionNoteHtml(t, 'massachusetts', lang))
  } else if (page.key === 'virginia') {
    push(`<h1>${escapeHtml(t('virginia.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('virginia.intro'))}</p>`)
    push(`<h2>${escapeHtml(t('virginia.statuteHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(
        t('virginia.statuteBody', { section: VA_CODE_SECTION, citation: VA_CODE_CITATION }),
      )}</p>`,
    )
    push(`<h2>${escapeHtml(t('virginia.districtHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('virginia.districtBody', { cancel: VA_CANCEL_QUOTE }))}</p>`)
    push(
      `<p>${escapeHtml(t('virginia.consistencyBody', { consistency: VA_CONSISTENCY_QUOTE }))}</p>`,
    )
    push(`<p>${escapeHtml(t('virginia.tiersBody', { tiers: VA_MIN_TIERS }))}</p>`)
    push(`<h2>${escapeHtml(t('virginia.iceHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('virginia.iceBody', { ice: VA_ICE_WBGT_F }))}</p>`)
    push(`<h2>${escapeHtml(t('virginia.measurementHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('virginia.measurementBody'))}</p>`)
    push(`<p>${escapeHtml(t('virginia.reportingBody'))}</p>`)
    push(`<p>${escapeHtml(t('virginia.noTableNotice'))}</p>`)
    push(
      `<p>${escapeHtml(
        t('virginia.sourceBody', {
          section: VA_CODE_SECTION,
          verifiedOn: VA_STATUTE_SOURCE.verifiedOn,
        }),
      )} <a href="${VA_STATUTE_SOURCE.url}">${escapeHtml(VA_STATUTE_SOURCE.name)}</a></p>`,
    )
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
    push(correctionNoteHtml(t, 'virginia', lang))
  } else if (page.key === 'wbgtVsHeatIndex') {
    const cmp = GHSA_FAQ_WBGT_HI_COMPARISON
    push(`<h1>${escapeHtml(t('wbgtVsHi.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('wbgtVsHi.intro'))}</p>`)
    push(`<h2>${escapeHtml(t('wbgtVsHi.wbgtHeading'))}</h2><p>${escapeHtml(t('wbgtVsHi.wbgtBody'))}</p>`)
    push(`<h2>${escapeHtml(t('wbgtVsHi.wetbulbHeading'))}</h2><p>${escapeHtml(t('wbgtVsHi.wetbulbBody'))}</p>`)
    push(`<h2>${escapeHtml(t('wbgtVsHi.hiHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(
        t('wbgtVsHi.hiBody', {
          wbgtExample: cmp.wbgtF,
          hiExampleRange: `${cmp.heatIndexMinF}-${cmp.heatIndexMaxF}`,
        }),
      )}</p>`,
    )
    push(`<p>${escapeHtml(t('wbgtVsHi.hiNote'))}</p>`)
  } else if (page.key === 'states') {
    push(`<h1>${escapeHtml(t('states.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('states.intro'))}</p>`)
    // Mirrors States.tsx: the legend has a heading and now covers the mandate
    // column too. Without the h2 a JS-off reader met an unlabelled bullet list.
    push(`<h2>${escapeHtml(t('states.legendHeading'))}</h2>`)
    push(`<h3>${escapeHtml(t('states.legendMeasurementHeading'))}</h3>`)
    push(
      `<ul><li>${escapeHtml(t('states.legendApps'))}</li><li>${escapeHtml(t('states.legendDevice'))}</li><li>${escapeHtml(t('states.legendUnverified'))}</li></ul>`,
    )
    push(`<h3>${escapeHtml(t('states.legendMandateHeading'))}</h3>`)
    push(
      `<ul><li>${escapeHtml(t('states.legendMandateRequired'))}</li><li>${escapeHtml(t('states.legendMandateConditional'))}</li><li>${escapeHtml(t('states.legendMandateHeatIndex'))}</li></ul>`,
    )
    // Hub lists first — mirrors States.tsx, where they moved above the table.
    const guideLinks = (guides) =>
      `<ul>${guides
        .map(
          ({ slug, labelKey }) =>
            `<li><a href="/${lang}/${slug}">${escapeHtml(t(labelKey))}</a></li>`,
        )
        .join('')}</ul>`
    push(`<h2>${escapeHtml(t('states.guidesHeading'))}</h2>`)
    push(
      guideLinks(STATE_GUIDES),
    )
    push(`<h2>${escapeHtml(t('states.airGuidesHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('states.airGuidesIntro'))}</p>`)
    push(
      guideLinks(AIR_GUIDES),
    )
    const rows = STATE_DIRECTORY.map((row) => {
      const note = t(`states.notes.${row.noteKey}`, { effectiveDate: UIL_EFFECTIVE_DATE })
      const badge =
        row.verified === 'primary' ? t('states.verifiedBadge') : t('states.researchBadge')
      // th scope=row, mirroring States.tsx — the state name is the row's
      // header, not one of its values.
      // Column order mirrors States.tsx: Measurement second.
      return `<tr><th scope="row">${row.abbr}</th><td>${escapeHtml(
        t(`states.measurement.${row.measurement}`),
      )}</td><td>${escapeHtml(
        t(`states.mandate.${row.mandate}`),
      )}</td><td>${escapeHtml(row.body)}</td><td>${escapeHtml(note)} ${GUIDE_SLUG_BY_ABBR[row.abbr] ? `<a href="/${lang}/${GUIDE_SLUG_BY_ABBR[row.abbr]}">${escapeHtml(t('states.rowGuideLink'))}</a> ` : ''}${escapeHtml(badge)}</td></tr>`
    }).join('')
    push(
      `<h2 id="states-table-heading">${escapeHtml(t('states.tableLabel'))}</h2><table aria-labelledby="states-table-heading"><thead><tr><th>${escapeHtml(t('states.colState'))}</th><th>${escapeHtml(t('states.colMeasurement'))}</th><th>${escapeHtml(t('states.colMandate'))}</th><th>${escapeHtml(t('states.colBody'))}</th><th>${escapeHtml(t('states.colNote'))}</th></tr></thead><tbody>${rows}</tbody></table>`,
    )
    push(`<p>${escapeHtml(t('states.caveat'))}</p>`)
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
  } else if (page.key === 'washingtonAir') {
    push(`<h1>${escapeHtml(t('washingtonAir.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('washingtonAir.intro'))}</p>`)
    push(
      `<h2>${escapeHtml(t('washingtonAir.basisHeading'))}</h2><p>${escapeHtml(t('washingtonAir.basisBody'))}</p>`,
    )
    push(`<h2>${escapeHtml(t('washingtonAir.tableHeading'))}</h2>`)
    push(airActivityTableHtml(WA_AIR_POLICY, t))
    push(`<p>${escapeHtml(t('washingtonAir.athleticsNote'))}</p>`)
    push(
      `<h2>${escapeHtml(t('washingtonAir.sensitiveGroupHeading'))}</h2><p>${escapeHtml(
        t('washingtonAir.sensitiveGroupBody', { quote: WA_SENSITIVE_GROUP_QUOTE }),
      )}</p>`,
    )
    push(
      `<p>${escapeHtml(t('washingtonAir.dataSourceBody', { quote: WA_DATA_SOURCE_QUOTE }))}</p>`,
    )
    push(
      `<p><a href="${WA_SMOKE_BLOG.url}">${escapeHtml(t('washingtonAir.smokeSourceLink'))}</a></p>`,
    )
    push(
      `<h2>${escapeHtml(t('air.sourceQuoteLabel'))}</h2><blockquote>${escapeHtml(WA_AIR_POLICY.actionQuotes.limitLightOrHourModerate)}</blockquote>`,
    )
    push(
      `<h2>${escapeHtml(t('washingtonAir.sourceHeading'))}</h2><p>${escapeHtml(t('washingtonAir.sourceBody'))} <a href="${WA_AIR_POLICY.source.url}">${escapeHtml(WA_AIR_POLICY.source.name)}</a></p>`,
    )
    push(`<p>${escapeHtml(t('air.verifiedOn', { date: WA_AIR_POLICY.source.verifiedOn }))}</p>`)
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
    push(correctionNoteHtml(t, 'washington-air-quality', lang))
    push(airDataSourcesHtml(t, false))
  } else if (page.key === 'oregonAir') {
    push(`<h1>${escapeHtml(t('oregonAir.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('oregonAir.intro'))}</p>`)
    push(`<h2>${escapeHtml(t('oregonAir.tableHeading'))}</h2>`)
    push(airBandTableHtml(OR_AIR_POLICY, t))
    push(
      `<h2>${escapeHtml(t('oregonAir.belowRangeHeading'))}</h2><p>${escapeHtml(t('oregonAir.belowRangeBody'))}</p>`,
    )
    push(`<h2>${escapeHtml(t('air.visibilityHeading'))}</h2><p>${escapeHtml(visibilityBody(t))}</p>`)
    push(`<p>${escapeHtml(t('air.visibilityRecheck'))}</p>`)
    push(
      `<h2>${escapeHtml(t('oregonAir.conservativeHeading'))}</h2><p>${escapeHtml(
        t('oregonAir.conservativeBody', { quote: OR_CONSERVATIVE_METRIC_QUOTE }),
      )}</p>`,
    )
    push(
      `<h2>${escapeHtml(t('oregonAir.sourceHeading'))}</h2><p>${escapeHtml(t('oregonAir.sourceBody'))} <a href="${OR_AIR_POLICY.source.url}">${escapeHtml(OR_AIR_POLICY.source.name)}</a></p>`,
    )
    push(`<p>${escapeHtml(t('air.verifiedOn', { date: OR_AIR_POLICY.source.verifiedOn }))}</p>`)
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
    push(correctionNoteHtml(t, 'oregon-air-quality', lang))
    push(airDataSourcesHtml(t, true))
  } else if (page.key === 'californiaAir') {
    push(`<h1>${escapeHtml(t('californiaAir.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('californiaAir.intro'))}</p>`)
    push(`<h2>${escapeHtml(t('californiaAir.ruleHeading'))}</h2>`)
    push(`<p>${escapeHtml(`${t('air.tableAqi')} ${CA_REFRAIN_AT_OR_ABOVE_AQI}+`)}</p>`)
    push(
      `<blockquote>${escapeHtml(t('californiaAir.ruleBody', { quote: CA_RULE_QUOTE }))}</blockquote>`,
    )
    push(`<h2>${escapeHtml(t('californiaAir.readingsHeading'))}</h2>`)
    push(
      `<blockquote>${escapeHtml(t('californiaAir.readingsBody', { quote: CA_READING_SOURCE_QUOTE }))}</blockquote>`,
    )
    push(`<p>${escapeHtml(t('californiaAir.readingsNote'))}</p>`)
    push(
      `<h2>${escapeHtml(t('californiaAir.belowHeading'))}</h2><p>${escapeHtml(t('californiaAir.belowBody'))}</p>`,
    )
    push(`<h2>${escapeHtml(t('air.visibilityHeading'))}</h2><p>${escapeHtml(visibilityBody(t))}</p>`)
    push(`<p>${escapeHtml(t('air.visibilityRecheck'))}</p>`)
    push(
      `<h2>${escapeHtml(t('californiaAir.sourceHeading'))}</h2><p>${escapeHtml(t('californiaAir.sourceBody'))} <a href="${CA_AIR_POLICY.source.url}">${escapeHtml(CA_AIR_POLICY.source.name)}</a></p>`,
    )
    push(`<p>${escapeHtml(t('air.verifiedOn', { date: CA_AIR_POLICY.source.verifiedOn }))}</p>`)
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
    push(correctionNoteHtml(t, 'california-air-quality', lang))
    push(airDataSourcesHtml(t, true))
  } else if (page.key === 'privacy') {
    push(`<h1>${escapeHtml(t('privacy.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('privacy.intro'))}</p>`)
    for (const key of ['location', 'log', 'storage', 'analytics', 'data', 'contact']) {
      push(
        `<h2>${escapeHtml(t(`privacy.${key}Title`))}</h2><p>${escapeHtml(
          t(`privacy.${key}Content`, { max: MAX_LOG_ENTRIES }),
        )}</p>`,
      )
    }
  } else if (page.key === 'disclaimer') {
    push(`<h1>${escapeHtml(t('disclaimerPage.pageTitle'))}</h1>`)
    for (const key of ['notMeasurement', 'notCompliance', 'notMedical', 'conditions', 'airQuality', 'availability', 'accuracy', 'liability', 'governingLaw', 'legalContact']) {
      push(`<p>${escapeHtml(t(`disclaimerPage.${key}`, BIAS_PARAMS))}</p>`)
    }
  }

  return parts.length > 0 ? `<div data-prerender="true">${parts.join('\n')}</div>` : ''
}


const SITEMAP_EXCLUDE_KEYS = new Set(['privacy', 'disclaimer'])

function generateSitemap() {
  const urls = []
  for (const lang of SUPPORTED_LANGS) {
    for (const page of pages) {
      if (SITEMAP_EXCLUDE_KEYS.has(page.key)) continue
      urls.push(`  <url>
    <loc>${getPageUrl(lang, page.path)}</loc>
    <lastmod>${page.dateModified}</lastmod>
    <changefreq>${page.path === '' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${page.path === '' ? '1.0' : '0.8'}</priority>
  </url>`)
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`
}

// Main execution
const templateHtml = readFileSync(join(distDir, 'index.html'), 'utf-8')
const titleRegex = /<title>[^<]*<\/title>/
const descRegex = /<meta name="description"[^>]*\/?>/

for (const lang of SUPPORTED_LANGS) {
  for (const page of pages) {
    let html = templateHtml
    html = html.replace('<html lang="en">', `<html lang="${lang}">`)
    html = html.replace(titleRegex, '')
    html = html.replace(descRegex, '')

    html = html.replace('</head>', `${generateMetaTags(lang, page)}\n  </head>`)

    const breadcrumb = generateBreadcrumbJsonLd(lang, page)
    if (breadcrumb) {
      html = html.replace(
        '</head>',
        `  <script data-prerender="true" type="application/ld+json">${JSON.stringify(breadcrumb)}</script>\n  </head>`,
      )
    }

    const bodyContent = generateBodyContent(lang, page)
    if (bodyContent) {
      html = html.replace('<div id="root"></div>', `<div id="root">${bodyContent}</div>`)
    }

    // Flat file output: dist/{lang}.html or dist/{lang}/{page}.html —
    // Cloudflare ASSETS resolves /en/texas → en/texas.html directly.
    const filePath =
      page.path === '' ? join(distDir, `${lang}.html`) : join(distDir, lang, `${page.path}.html`)
    const fileDir = dirname(filePath)
    if (!existsSync(fileDir)) mkdirSync(fileDir, { recursive: true })
    writeFileSync(filePath, html, 'utf-8')
    console.log(`✓ /${lang}/${page.path || ''} → ${filePath.replace(distDir + '/', 'dist/')}`)
  }
}

writeFileSync(join(distDir, 'sitemap.xml'), generateSitemap(), 'utf-8')
console.log('✓ sitemap.xml → dist/sitemap.xml')

// Remove root index.html: / must always hit the Worker for Accept-Language
// detection. If index.html exists, ASSETS would serve it and bypass the Worker.
const rootIndex = join(distDir, 'index.html')
if (existsSync(rootIndex)) {
  unlinkSync(rootIndex)
  console.log('✓ dist/index.html removed (/ handled by Worker)')
}

console.log(`\nPrerender complete! (${SUPPORTED_LANGS.length * pages.length} HTML files)`)
