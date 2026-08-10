import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TriangleAlert, Archive } from 'lucide-react'
import SEO from '../components/SEO'
import CorrectionNote from '../components/CorrectionNote'
import {
  KHSAA_WBGT_REFERENCE,
  KY_ONSITE_ONLY_QUOTE,
  KY_OFFSITE_INVALID_QUOTE,
  KY_FOOTBALL_ONSITE_QUOTE,
  KY_RECHECK_INTERVAL_MINUTES,
  KY_REVISION,
} from '../data/policyOracle'

export default function Kentucky() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const rows = KHSAA_WBGT_REFERENCE.rows

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="kentucky" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">{t('kentucky.pageTitle')}</h1>
        <p className="mt-3 text-lg">{t('kentucky.intro')}</p>
      </header>

      {/* The caveat goes above the numbers, not under them: a reader who stops
          after the table should still have seen it. */}
      <section className="border-2 border-flag-orange bg-surface p-5">
        <h2 className="display-num mb-2 flex items-center gap-2 text-2xl uppercase">
          <Archive className="h-6 w-6 text-flag-orange" aria-hidden="true" />
          {t('kentucky.currencyHeading')}
        </h2>
        <p>{t('kentucky.currencyBody', { revision: KY_REVISION })}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('kentucky.tableHeading')}</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="py-2 pr-3 font-bold uppercase tracking-wide">
                {t('kentucky.colRange')}
              </th>
              <th className="py-2 font-bold uppercase tracking-wide">{t('kentucky.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.sourceLabel} className="border-b border-line align-top">
                <th scope="row" className="py-2 pr-3 text-left font-semibold">
                  <span className="whitespace-nowrap">{row.sourceLabel}</span>
                </th>
                <td className="py-2">
                  <ul className="list-inside list-disc space-y-0.5">
                    {row.textKeys.map((key) => (
                      <li key={key}>{t(key)}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-sm text-ink-muted">
          {t('kentucky.recheckNote', { interval: KY_RECHECK_INTERVAL_MINUTES })}
        </p>
        <p className="mt-2 text-sm text-ink-muted">{t('kentucky.scopeNote')}</p>
      </section>

      <section className="border-2 border-flag-red bg-surface p-5">
        <h2 className="display-num mb-2 flex items-center gap-2 text-2xl uppercase">
          <TriangleAlert className="h-6 w-6 text-flag-red" aria-hidden="true" />
          {t('kentucky.measurementHeading')}
        </h2>
        <p>{t('kentucky.measurementBody', { quote: KY_ONSITE_ONLY_QUOTE })}</p>
        <p className="mt-3">{t('kentucky.invalidBody', { quote: KY_OFFSITE_INVALID_QUOTE })}</p>
        {/* The unconditional one. It is football-specific, which is what the
            page previously blurred. */}
        <p className="mt-3">{t('kentucky.footballBody', { quote: KY_FOOTBALL_ONSITE_QUOTE })}</p>
        <p className="mt-3 font-bold">{t('kentucky.deviceWarning')}</p>
      </section>

      <section className="text-sm text-ink-muted">
        <h2 className="font-bold uppercase tracking-wide">{t('kentucky.sourceHeading')}</h2>
        <p className="mt-1">
          {t('kentucky.sourceBody', { verifiedOn: KHSAA_WBGT_REFERENCE.source.verifiedOn })}{' '}
          <a
            href={KHSAA_WBGT_REFERENCE.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {KHSAA_WBGT_REFERENCE.source.name}
          </a>
        </p>
        <p className="mt-2 text-xs">{t('common.footer.affiliation')}</p>
        <CorrectionNote topic="kentucky" />
      </section>

      <Link
        to={`/${lang}`}
        className="inline-block bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('kentucky.ctaButton')}
      </Link>
    </article>
  )
}
