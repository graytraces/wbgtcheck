import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SEO from '../components/SEO'
import {
  NCHSAA_REFERENCE,
  NCHSAA_REMOTE_QUOTE,
  NCHSAA_STAFFING_QUOTE,
  NCHSAA_WEATHER_STATION_RADIUS_MAX_MILES,
  NCHSAA_WEATHER_STATION_RADIUS_MIN_MILES,
} from '../data/policyOracle'

export default function NorthCarolina() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  // Coolest row first, matching the band-table convention on the other guides.
  const rows = [...NCHSAA_REFERENCE.rows].reverse()

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="northCarolina" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">
          {t('northCarolina.pageTitle')}
        </h1>
        <p className="mt-3 text-lg">{t('northCarolina.intro')}</p>
      </header>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('northCarolina.remoteHeading')}</h2>
        <p>
          {t('northCarolina.remoteBody', {
            remote: NCHSAA_REMOTE_QUOTE,
            min: NCHSAA_WEATHER_STATION_RADIUS_MIN_MILES,
            max: NCHSAA_WEATHER_STATION_RADIUS_MAX_MILES,
          })}
        </p>
        <p className="mt-2 font-semibold">{t('northCarolina.remoteCaveat')}</p>
      </section>

      <section className="border-2 border-line bg-surface p-5">
        <h2 className="display-num mb-2 text-2xl uppercase">{t('northCarolina.colorHeading')}</h2>
        <p>{t('northCarolina.colorBody')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('northCarolina.tableHeading')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="py-2 pr-3 font-bold uppercase tracking-wide">
                  {t('northCarolina.colWbgt')}
                </th>
                <th className="py-2 pr-3 font-bold uppercase tracking-wide">
                  {t('northCarolina.colColor')}
                </th>
                <th className="py-2 font-bold uppercase tracking-wide">
                  {t('northCarolina.colGuideline')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.sourceLabel} className="border-b border-line align-top">
                  <td className="display-num py-2 pr-3 text-lg">{row.sourceLabel}</td>
                  <td className="py-2 pr-3 font-semibold">
                    {t(`northCarolina.colors.${row.colorKey}`)}
                  </td>
                  <td className="py-2">
                    <ul className="list-inside list-disc space-y-0.5">
                      {row.textKeys.map((key) => (
                        <li key={key}>{t(key)}</li>
                      ))}
                      {row.breakMinutes !== null && row.breakEveryMinutes !== null && (
                        <li>
                          {t('northCarolina.breakCell', {
                            minutes: row.breakMinutes,
                            every: row.breakEveryMinutes,
                          })}
                        </li>
                      )}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('northCarolina.mandateHeading')}</h2>
        <p>{t('northCarolina.mandateBody', { staffing: NCHSAA_STAFFING_QUOTE })}</p>
      </section>

      <section className="text-sm text-ink-muted">
        <h2 className="font-bold uppercase tracking-wide">{t('northCarolina.sourceHeading')}</h2>
        <p className="mt-1">
          {t('northCarolina.sourceBody', { verifiedOn: NCHSAA_REFERENCE.source.verifiedOn })}{' '}
          <a
            href={NCHSAA_REFERENCE.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {NCHSAA_REFERENCE.source.name}
          </a>
        </p>
        <p className="mt-2 text-xs">{t('common.footer.affiliation')}</p>
      </section>

      <Link
        to={`/${lang}`}
        className="inline-block bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('northCarolina.ctaButton')}
      </Link>
    </article>
  )
}
