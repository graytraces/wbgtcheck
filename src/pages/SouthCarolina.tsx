import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'
import SEO from '../components/SEO'
import PolicyBandsTable from '../components/PolicyBandsTable'
import {
  SCHSL,
  SCHSL_APP_QUOTE,
  SCHSL_CALIBRATION_INTERVAL_YEARS,
  SCHSL_COLD_IMMERSION_WBGT_F,
  SCHSL_DEVICE_QUOTE,
  SCHSL_RANGE_HOLD_MINUTES,
  SCHSL_READING_INTERVAL_MINUTES,
  SCHSL_READING_LEAD_MINUTES,
  SCHSL_REQUIRED_QUOTE,
  SCHSL_TOP_BOUNDARY_TEXT_QUOTE,
} from '../data/policyOracle'

/** The black band's printed label — the table half of the boundary mismatch. */
const SCHSL_TOP_BAND_LABEL = SCHSL.bands[0].sourceLabel

export default function SouthCarolina() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="southCarolina" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">{t('southCarolina.pageTitle')}</h1>
        <p className="mt-3 text-lg">{t('southCarolina.intro')}</p>
      </header>

      <section className="border-2 border-flag-red bg-surface p-5">
        <h2 className="display-num mb-2 flex items-center gap-2 text-2xl uppercase">
          <TriangleAlert className="h-6 w-6 text-flag-red" aria-hidden="true" />
          {t('southCarolina.deviceHeading')}
        </h2>
        <p>
          {t('southCarolina.deviceBody', {
            required: SCHSL_REQUIRED_QUOTE,
            device: SCHSL_DEVICE_QUOTE,
            apps: SCHSL_APP_QUOTE,
          })}
        </p>
        <p className="mt-3 font-bold">{t('southCarolina.deviceWarning')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('southCarolina.tableHeading')}</h2>
        <PolicyBandsTable policy={SCHSL} showSource={false} />
        <p className="mt-3 text-sm text-ink-muted">
          {t('southCarolina.boundaryNote', {
            tableLabel: SCHSL_TOP_BAND_LABEL,
            textLabel: SCHSL_TOP_BOUNDARY_TEXT_QUOTE,
          })}
        </p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('southCarolina.measurementHeading')}
        </h2>
        <p>
          {t('southCarolina.measurementTiming', {
            lead: SCHSL_READING_LEAD_MINUTES,
            interval: SCHSL_READING_INTERVAL_MINUTES,
          })}
        </p>
        <p className="mt-2">
          {t('southCarolina.measurementHold', { hold: SCHSL_RANGE_HOLD_MINUTES })}
        </p>
        <p className="mt-2">
          {t('southCarolina.measurementCalibration', { years: SCHSL_CALIBRATION_INTERVAL_YEARS })}
        </p>
        <p className="mt-2">
          {t('southCarolina.immersionNote', { immersion: SCHSL_COLD_IMMERSION_WBGT_F })}
        </p>
      </section>

      <section className="text-sm text-ink-muted">
        <h2 className="font-bold uppercase tracking-wide">{t('southCarolina.sourceHeading')}</h2>
        <p className="mt-1">
          {t('southCarolina.sourceBody', { verifiedOn: SCHSL.source.verifiedOn })}{' '}
          <a href={SCHSL.source.url} target="_blank" rel="noopener noreferrer" className="underline">
            {SCHSL.source.name}
          </a>
        </p>
        <p className="mt-2 text-xs">{t('common.footer.affiliation')}</p>
      </section>

      <Link
        to={`/${lang}`}
        className="inline-block bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('southCarolina.ctaButton')}
      </Link>
    </article>
  )
}
