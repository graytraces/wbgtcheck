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

      <meta name="twitter:card" content="summary" />
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
