import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SEO from '../components/SEO'
import {
  NYSPHSAA_AMBIENT_TRIGGER_F,
  NYSPHSAA_APPROVED_ON,
  NYSPHSAA_APP_QUOTE,
  NYSPHSAA_CHECK_LEAD_HOURS,
  NYSPHSAA_HEAT_INDEX_REFERENCE,
  NYSPHSAA_UPDATED_ON,
  NYSPHSAA_WARNING_BREAK_INTERVAL_MINUTES,
  NYSPHSAA_ZIP_QUOTE,
} from '../data/policyOracle'

export default function NewYork() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const rows = [...NYSPHSAA_HEAT_INDEX_REFERENCE.rows].reverse()

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="newYork" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">{t('newYork.pageTitle')}</h1>
        <p className="mt-3 text-lg">{t('newYork.intro')}</p>
      </header>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('newYork.notWbgtHeading')}</h2>
        <p>
          {t('newYork.notWbgtBody', {
            lead: NYSPHSAA_CHECK_LEAD_HOURS,
            trigger: NYSPHSAA_AMBIENT_TRIGGER_F,
          })}
        </p>
      </section>

      <section className="border-2 border-line bg-surface p-5">
        <h2 className="display-num mb-2 text-2xl uppercase">{t('newYork.appHeading')}</h2>
        <p>{t('newYork.appBody', { app: NYSPHSAA_APP_QUOTE, zip: NYSPHSAA_ZIP_QUOTE })}</p>
        <p className="mt-3 font-semibold">{t('newYork.appCaveat')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('newYork.tableHeading')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="py-2 pr-3 font-bold uppercase tracking-wide">
                  {t('newYork.colHeatIndex')}
                </th>
                <th className="py-2 pr-3 font-bold uppercase tracking-wide">
                  {t('newYork.colTier')}
                </th>
                <th className="py-2 font-bold uppercase tracking-wide">{t('newYork.colAction')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.sourceLabel} className="border-b border-line align-top">
                  <td className="py-2 pr-3 font-semibold">{row.sourceLabel}</td>
                  <td className="py-2 pr-3">
                    <div className="font-semibold">{t(`newYork.tiers.${row.tierKey}`)}</div>
                    <div className="mt-0.5 text-xs uppercase tracking-wide text-ink-muted">
                      {row.required ? t('newYork.requiredLabel') : t('newYork.recommendedLabel')}
                    </div>
                  </td>
                  <td className="py-2">
                    <ul className="list-inside list-disc space-y-0.5">
                      {row.textKeys.map((key) => (
                        <li key={key}>
                          {t(key, { minutes: NYSPHSAA_WARNING_BREAK_INTERVAL_MINUTES })}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-ink-muted">{t('newYork.wbgtChartNote')}</p>
      </section>

      <section className="text-sm text-ink-muted">
        <h2 className="font-bold uppercase tracking-wide">{t('newYork.sourceHeading')}</h2>
        <p className="mt-1">
          {t('newYork.sourceBody', {
            approved: NYSPHSAA_APPROVED_ON,
            updated: NYSPHSAA_UPDATED_ON,
            verifiedOn: NYSPHSAA_HEAT_INDEX_REFERENCE.source.verifiedOn,
          })}{' '}
          <a
            href={NYSPHSAA_HEAT_INDEX_REFERENCE.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {NYSPHSAA_HEAT_INDEX_REFERENCE.source.name}
          </a>
        </p>
        <p className="mt-2 text-xs">{t('common.footer.affiliation')}</p>
      </section>

      <Link
        to={`/${lang}/wbgt-vs-heat-index`}
        className="inline-block bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('newYork.ctaButton')}
      </Link>
    </article>
  )
}
