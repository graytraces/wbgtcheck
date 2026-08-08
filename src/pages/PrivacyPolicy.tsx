import { useTranslation } from 'react-i18next'
import SEO from '../components/SEO'

const SECTIONS = ['location', 'analytics', 'data', 'contact'] as const

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
          <p>{t(`privacy.${key}Content`)}</p>
        </section>
      ))}
    </article>
  )
}
