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
  NCHSAA_REFERENCE,
  NYSPHSAA_HEAT_INDEX_REFERENCE,
  UIL_EFFECTIVE_DATE,
  UIL_READING_BEFORE_PRACTICE_MAX_MINUTES,
  UIL_READING_INTERVAL_MINUTES,
  GHSA_INSTRUMENT_QUOTE,
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
  TSSAA_APP_QUOTE,
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
  NCHSAA_REMOTE_QUOTE,
  NCHSAA_STAFFING_QUOTE,
  NCHSAA_WEATHER_STATION_RADIUS_MAX_MILES,
  NCHSAA_WEATHER_STATION_RADIUS_MIN_MILES,
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
  { key: 'wbgtVsHeatIndex', path: 'wbgt-vs-heat-index', dateModified: today },
  { key: 'states', path: 'states', dateModified: today },
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
      return `<tr><td>${escapeHtml(t(`flags.${band.flag}.label`))} ${escapeHtml(band.sourceLabel)}</td><td><ul>${sentences}</ul></td></tr>`
    })
    .join('')
  return `<table><thead><tr><th>${escapeHtml(t('verdict.wbgtLabel'))} (°F)</th><th>${escapeHtml(t('texas.tableGuidelines'))}</th></tr></thead><tbody>${rows}</tbody></table>`
}

/** NCHSAA's chart — its own colour code, coolest row first (mirrors the page). */
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
      return `<tr><td>${escapeHtml(row.sourceLabel)}</td><td>${escapeHtml(
        t(`northCarolina.colors.${row.colorKey}`),
      )}</td><td><ul>${items.join('')}</ul></td></tr>`
    })
    .join('')
  return `<table><thead><tr><th>${escapeHtml(t('northCarolina.colWbgt'))}</th><th>${escapeHtml(
    t('northCarolina.colColor'),
  )}</th><th>${escapeHtml(t('northCarolina.colGuideline'))}</th></tr></thead><tbody>${rows}</tbody></table>`
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

function generateBodyContent(lang, page) {
  const t = makeT(lang)
  const parts = []
  const push = (html) => parts.push(html)

  if (page.path === '') {
    push(`<h1>${escapeHtml(t('home.pageTitle'))}</h1>`)
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
    push(`<p>${escapeHtml(t('texas.competitionNote'))}</p>`)
    push(`<p>${escapeHtml(t('texas.bandNote'))}</p>`)
    push(
      `<p>${escapeHtml(t('texas.sourceBody', { verifiedOn: UIL_CLASS_3.source.verifiedOn }))} <a href="${UIL_CLASS_3.source.url}">${escapeHtml(UIL_CLASS_3.source.name)}</a></p>`,
    )
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
  } else if (page.key === 'georgia') {
    push(`<h1>${escapeHtml(t('georgia.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('georgia.intro'))}</p>`)
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
    push(`<p>${escapeHtml(t('georgia.deviceWarning'))}</p>`)
    push(`<h2>${escapeHtml(t('georgia.tableHeading'))}</h2>`)
    push(policyTableHtml(GHSA, t))
    push(`<h2>${escapeHtml(t('georgia.practiceDefHeading'))}</h2><p>${escapeHtml(t('georgia.practiceDefBody'))}</p>`)
    push(
      `<p>${escapeHtml(t('georgia.sourceBody', { verifiedOn: GHSA.source.verifiedOn }))} <a href="${GHSA.source.url}">${escapeHtml(GHSA.source.name)}</a></p>`,
    )
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
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
      `<p>${escapeHtml(t('southCarolina.sourceBody', { verifiedOn: SCHSL.source.verifiedOn }))} <a href="${SCHSL.source.url}">${escapeHtml(SCHSL.source.name)}</a></p>`,
    )
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
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
  } else if (page.key === 'iowa') {
    push(`<h1>${escapeHtml(t('iowa.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('iowa.intro'))}</p>`)
    push(`<h2>${escapeHtml(t('iowa.recommendedHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('iowa.recommendedBody', { recommended: IOWA_RECOMMENDED_QUOTE }))}</p>`)
    push(`<p>${escapeHtml(t('iowa.categoryBody', { category: IOWA_CATEGORY_NUMBER }))}</p>`)
    push(`<p>${escapeHtml(t('iowa.triggerNote', { trigger: IOWA_AMBIENT_TRIGGER_F }))}</p>`)
    push(`<h2>${escapeHtml(t('iowa.tableHeading'))}</h2>`)
    push(policyTableHtml(IOWA_CATEGORY_2, t))
    push(`<h2>${escapeHtml(t('iowa.appsHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('iowa.appsBody', { apps: IOWA_APP_QUOTE }))}</p>`)
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
  } else if (page.key === 'northCarolina') {
    push(`<h1>${escapeHtml(t('northCarolina.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('northCarolina.intro'))}</p>`)
    push(`<h2>${escapeHtml(t('northCarolina.remoteHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(
        t('northCarolina.remoteBody', {
          remote: NCHSAA_REMOTE_QUOTE,
          min: NCHSAA_WEATHER_STATION_RADIUS_MIN_MILES,
          max: NCHSAA_WEATHER_STATION_RADIUS_MAX_MILES,
        }),
      )}</p>`,
    )
    push(`<p>${escapeHtml(t('northCarolina.remoteCaveat'))}</p>`)
    push(`<h2>${escapeHtml(t('northCarolina.colorHeading'))}</h2>`)
    push(`<p>${escapeHtml(t('northCarolina.colorBody'))}</p>`)
    push(`<h2>${escapeHtml(t('northCarolina.tableHeading'))}</h2>`)
    push(referenceTableHtml(NCHSAA_REFERENCE, t))
    push(`<h2>${escapeHtml(t('northCarolina.mandateHeading'))}</h2>`)
    push(
      `<p>${escapeHtml(t('northCarolina.mandateBody', { staffing: NCHSAA_STAFFING_QUOTE }))}</p>`,
    )
    push(
      `<p>${escapeHtml(t('northCarolina.sourceBody', { verifiedOn: NCHSAA_REFERENCE.source.verifiedOn }))} <a href="${NCHSAA_REFERENCE.source.url}">${escapeHtml(NCHSAA_REFERENCE.source.name)}</a></p>`,
    )
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
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
    push(
      `<ul><li>${escapeHtml(t('states.legendApps'))}</li><li>${escapeHtml(t('states.legendDevice'))}</li><li>${escapeHtml(t('states.legendUnverified'))}</li></ul>`,
    )
    const rows = STATE_DIRECTORY.map((row) => {
      const note = t(`states.notes.${row.noteKey}`, { effectiveDate: UIL_EFFECTIVE_DATE })
      const badge =
        row.verified === 'primary' ? t('states.verifiedBadge') : t('states.researchBadge')
      return `<tr><td>${row.abbr}</td><td>${escapeHtml(row.body)}</td><td>${escapeHtml(
        t(`states.mandate.${row.mandate}`),
      )}</td><td>${escapeHtml(t(`states.measurement.${row.measurement}`))}</td><td>${escapeHtml(note)} ${escapeHtml(badge)}</td></tr>`
    }).join('')
    push(
      `<table><thead><tr><th>${escapeHtml(t('states.colState'))}</th><th>${escapeHtml(t('states.colBody'))}</th><th>${escapeHtml(t('states.colMandate'))}</th><th>${escapeHtml(t('states.colMeasurement'))}</th><th>${escapeHtml(t('states.colNote'))}</th></tr></thead><tbody>${rows}</tbody></table>`,
    )
    push(`<p>${escapeHtml(t('states.caveat'))}</p>`)
    push(`<p>${escapeHtml(t('common.footer.affiliation'))}</p>`)
  } else if (page.key === 'privacy') {
    push(`<h1>${escapeHtml(t('privacy.pageTitle'))}</h1>`)
    push(`<p>${escapeHtml(t('privacy.intro'))}</p>`)
    for (const key of ['location', 'analytics', 'data', 'contact']) {
      push(`<h2>${escapeHtml(t(`privacy.${key}Title`))}</h2><p>${escapeHtml(t(`privacy.${key}Content`))}</p>`)
    }
  } else if (page.key === 'disclaimer') {
    push(`<h1>${escapeHtml(t('disclaimerPage.pageTitle'))}</h1>`)
    for (const key of ['notMeasurement', 'notCompliance', 'notMedical', 'conditions', 'availability', 'accuracy', 'liability', 'governingLaw', 'legalContact']) {
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
