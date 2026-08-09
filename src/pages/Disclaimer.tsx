import { useTranslation } from 'react-i18next'
import SEO from '../components/SEO'
import { REMOTE_UNDERESTIMATE_MIN_C, REMOTE_UNDERESTIMATE_MAX_C } from '../data/policyOracle'

const SECTIONS = [
  'notMeasurement',
  'notCompliance',
  'notMedical',
  'conditions',
  // Air quality gets its own clause, one step stronger than the WBGT ones:
  // the reading is preliminary, hourly, and area-wide rather than field-level.
  'airQuality',
  'availability',
  'accuracy',
  'liability',
  'governingLaw',
  'legalContact',
] as const

export default function Disclaimer() {
  const { t } = useTranslation()
  return (
    <article className="mx-auto max-w-3xl space-y-4">
      <SEO pageKey="disclaimer" />
      <h1 className="display-num text-3xl uppercase sm:text-4xl">{t('disclaimerPage.pageTitle')}</h1>
      {SECTIONS.map((key) => (
        <p key={key}>
          {t(`disclaimerPage.${key}`, {
            min: REMOTE_UNDERESTIMATE_MIN_C,
            max: REMOTE_UNDERESTIMATE_MAX_C,
          })}
        </p>
      ))}
    </article>
  )
}
