import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { SITE_URL } from '../seo'
import { localeMap, supportedLanguages } from '../i18n'

interface SEOProps {
  pageKey: string
}

export default function SEO({ pageKey }: SEOProps) {
  const { t, i18n } = useTranslation()
  const location = useLocation()

  const lang = i18n.language
  // Canonical/hreflang derive from the actual rendered route, NOT pageKey —
  // a pageKey typo must never silently point canonical at the homepage.
  const langPrefix = `/${lang}`
  const pathAfterLang = location.pathname.startsWith(langPrefix + '/')
    ? location.pathname.slice(langPrefix.length)
    : location.pathname === langPrefix
      ? ''
      : location.pathname
  const canonicalUrl =
    pathAfterLang === '' ? `${SITE_URL}/${lang}` : `${SITE_URL}/${lang}${pathAfterLang}`
  const locale = localeMap[i18n.language] ?? 'en_US'
  const siteName = t('common.siteName')

  const title = t(`seo.${pageKey}.title`)
  const description = t(`seo.${pageKey}.description`)
  const keywords = t(`seo.${pageKey}.keywords`)

  // One card per locale, drawn by scripts/gen-og-image.mjs. Absolute, because
  // a relative og:image is resolved by nobody — every unfurler wants a URL it
  // can fetch without a base. Falls back to the English card for a language
  // that has no card yet rather than emitting a 404 that renders as no image
  // at all.
  const ogLang = lang in supportedLanguages ? lang : 'en'
  const ogImage = `${SITE_URL}/og-${ogLang}.png`

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={t('seo.ogCard.headline')} />

      {/* summary_large_image, not summary: with a 1200×630 card a `summary`
          crops it to a small square and throws away the flag strip, which is
          the half of the card that says what the site does. */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />

      <link rel="canonical" href={canonicalUrl} />

      {Object.keys(supportedLanguages).map((l) => (
        <link
          key={l}
          rel="alternate"
          hrefLang={l}
          href={pathAfterLang === '' ? `${SITE_URL}/${l}` : `${SITE_URL}/${l}${pathAfterLang}`}
        />
      ))}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={pathAfterLang === '' ? `${SITE_URL}/en` : `${SITE_URL}/en${pathAfterLang}`}
      />
    </>
  )
}
