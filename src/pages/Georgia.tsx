import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'
import SEO from '../components/SEO'
import CorrectionNote from '../components/CorrectionNote'
import PolicyBandsTable from '../components/PolicyBandsTable'
import {
  GHSA,
  GHSA_INSTRUMENT_QUOTE,
  GHSA_POLICY_YEAR_ROUND_QUOTE,
  GHSA_READING_INTERVAL_MINUTES,
  GHSA_READING_LEAD_MINUTES,
  GHSA_CALIBRATION_INTERVAL_YEARS,
  GHSA_NO_APPS_QUOTE,
  GHSA_MONITOR_EVERY_PRACTICE_QUOTE,
  GHSA_REMINDER_SOURCE,
  GHSA_RANGE_HOLD_MINUTES,
  GHSA_RANGE_HOLD_QUOTE,
  GHSA_NO_REVERT_QUOTE,
  GHSA_ESCALATE_QUOTE,
} from '../data/policyOracle'

export default function Georgia() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="georgia" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">{t('georgia.pageTitle')}</h1>
        <p className="mt-3 text-lg">
          {t('georgia.intro', { yearRound: GHSA_POLICY_YEAR_ROUND_QUOTE })}
        </p>
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
        <p className="mt-3">{t('georgia.seasonNote')}</p>
        <p className="mt-3">
          {t('georgia.noAppsBody', {
            noApps: GHSA_NO_APPS_QUOTE,
            monitor: GHSA_MONITOR_EVERY_PRACTICE_QUOTE,
          })}
        </p>
        <p className="mt-3 font-bold">{t('georgia.deviceWarning')}</p>
        <p className="mt-2 text-sm text-ink-muted">
          <a
            href={GHSA_REMINDER_SOURCE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {GHSA_REMINDER_SOURCE.name}
          </a>{' '}
          ({t('policies.verifiedOn', { date: GHSA_REMINDER_SOURCE.verifiedOn })})
        </p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('georgia.tableHeading')}</h2>
        <PolicyBandsTable policy={GHSA} showSource={false} />
      </section>

      {/* The ratchet. Omitting it reads permissive: a coach watching the WBGT
          fall back below a boundary would assume the restriction lifts. */}
      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('georgia.holdHeading')}</h2>
        <p>
          {t('georgia.holdBody', {
            hold: GHSA_RANGE_HOLD_MINUTES,
            hold1: GHSA_RANGE_HOLD_QUOTE,
            hold2: GHSA_NO_REVERT_QUOTE,
            escalate: GHSA_ESCALATE_QUOTE,
          })}
        </p>
        <p className="mt-3">{t('georgia.holdPlanning')}</p>
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
        <p className="mt-2 text-xs">{t('common.footer.affiliation')}</p>
        <CorrectionNote topic="georgia" />
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
