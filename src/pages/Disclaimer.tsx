import { useTranslation } from 'react-i18next'
import SEO from '../components/SEO'

const SECTIONS = [
  'notMeasurement',
  'notCompliance',
  'notMedical',
  'conditions',
  'accuracy',
  'liability',
] as const

export default function Disclaimer() {
  const { t } = useTranslation()
  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <SEO pageKey="disclaimer" />
      <h1 className="display-num text-3xl uppercase sm:text-4xl">{t('disclaimerPage.pageTitle')}</h1>
      {SECTIONS.map((key) => (
        <p key={key}>{t(`disclaimerPage.${key}`)}</p>
      ))}
    </article>
  )
}
