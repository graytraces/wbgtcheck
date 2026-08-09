import { useTranslation } from 'react-i18next'
import SEO from '../components/SEO'
import { MAX_LOG_ENTRIES } from '../data/logRetention.js'

const SECTIONS = ['location', 'log', 'storage', 'analytics', 'data', 'contact'] as const

export default function PrivacyPolicy() {
  const { t } = useTranslation()
  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <SEO pageKey="privacy" />
      <h1 className="display-num text-3xl uppercase sm:text-4xl">{t('privacy.pageTitle')}</h1>
      <p>{t('privacy.intro')}</p>
      {SECTIONS.map((key) => (
        <section key={key}>
          <h2 className="display-num mb-1 text-2xl uppercase">{t(`privacy.${key}Title`)}</h2>
          {/* The log cap comes from the hook, so the policy cannot drift from
              what the code actually keeps. */}
          <p>{t(`privacy.${key}Content`, { max: MAX_LOG_ENTRIES })}</p>
        </section>
      ))}
    </article>
  )
}
