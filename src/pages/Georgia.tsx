import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'
import SEO from '../components/SEO'
import PolicyBandsTable from '../components/PolicyBandsTable'
import {
  GHSA,
  GHSA_INSTRUMENT_QUOTE,
  GHSA_READING_INTERVAL_MINUTES,
  GHSA_READING_LEAD_MINUTES,
  GHSA_CALIBRATION_INTERVAL_YEARS,
} from '../data/policyOracle'

export default function Georgia() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="georgia" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">{t('georgia.pageTitle')}</h1>
        <p className="mt-3 text-lg">{t('georgia.intro')}</p>
      </header>

      <section className="border-2 border-flag-red bg-surface p-5">
        <h2 className="display-num mb-2 flex items-center gap-2 text-2xl uppercase">
          <TriangleAlert className="h-6 w-6 text-flag-red" aria-hidden="true" />
          {t('georgia.deviceHeading')}
        </h2>
        <p>
          {t('georgia.deviceBody', {
            quote: GHSA_INSTRUMENT_QUOTE,
            interval: GHSA_READING_INTERVAL_MINUTES,
            lead: GHSA_READING_LEAD_MINUTES,
            years: GHSA_CALIBRATION_INTERVAL_YEARS,
          })}
        </p>
        <p className="mt-3 font-bold">{t('georgia.deviceWarning')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('georgia.tableHeading')}</h2>
        <PolicyBandsTable policy={GHSA} showSource={false} />
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('georgia.practiceDefHeading')}</h2>
        <p>{t('georgia.practiceDefBody')}</p>
      </section>

      <section className="text-sm text-ink-muted">
        <h2 className="font-bold uppercase tracking-wide">{t('georgia.sourceHeading')}</h2>
        <p className="mt-1">
          {t('georgia.sourceBody', { verifiedOn: GHSA.source.verifiedOn })}{' '}
          <a href={GHSA.source.url} target="_blank" rel="noopener noreferrer" className="underline">
            {GHSA.source.name}
          </a>
        </p>
      </section>

      <Link
        to={`/${lang}`}
        className="inline-block bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('georgia.ctaButton')}
      </Link>
    </article>
  )
}
