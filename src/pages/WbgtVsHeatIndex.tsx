import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SEO from '../components/SEO'
import { GHSA_FAQ_WBGT_HI_COMPARISON } from '../data/policyOracle'

export default function WbgtVsHeatIndex() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const cmp = GHSA_FAQ_WBGT_HI_COMPARISON

  const rows = [
    { key: 'WBGT', sun: t('wbgtVsHi.yes'), wind: t('wbgtVsHi.yes'), use: t('wbgtVsHi.tableWbgtUse') },
    { key: 'Wet bulb', sun: t('wbgtVsHi.no'), wind: t('wbgtVsHi.no'), use: t('wbgtVsHi.tableWetbulbUse') },
    { key: 'Heat index', sun: t('wbgtVsHi.no'), wind: t('wbgtVsHi.no'), use: t('wbgtVsHi.tableHiUse') },
  ]

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="wbgtVsHeatIndex" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">{t('wbgtVsHi.pageTitle')}</h1>
        <p className="mt-3 text-lg">{t('wbgtVsHi.intro')}</p>
      </header>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('wbgtVsHi.wbgtHeading')}</h2>
        <p>{t('wbgtVsHi.wbgtBody')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('wbgtVsHi.wetbulbHeading')}</h2>
        <p>{t('wbgtVsHi.wetbulbBody')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('wbgtVsHi.hiHeading')}</h2>
        <p>
          {t('wbgtVsHi.hiBody', {
            wbgtExample: cmp.wbgtF,
            hiExampleRange: `${cmp.heatIndexMinF}-${cmp.heatIndexMaxF}`,
          })}
        </p>
        <p className="mt-2 font-semibold">{t('wbgtVsHi.hiNote')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('wbgtVsHi.tableHeading')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              {/* Header words are this table's width floor on a 320px phone —
                  smaller type below sm, the regular scale above. */}
              <tr className="border-b-2 border-ink text-left">
                <th className="py-2 pr-2 text-xs font-bold uppercase sm:pr-3 sm:text-sm sm:tracking-wide">{t('wbgtVsHi.tableMeasure')}</th>
                <th className="py-2 pr-2 text-xs font-bold uppercase sm:pr-3 sm:text-sm sm:tracking-wide">{t('wbgtVsHi.tableSun')}</th>
                <th className="py-2 pr-2 text-xs font-bold uppercase sm:pr-3 sm:text-sm sm:tracking-wide">{t('wbgtVsHi.tableWind')}</th>
                <th className="py-2 text-xs font-bold uppercase sm:text-sm sm:tracking-wide">{t('wbgtVsHi.tableUse')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-line">
                  {/* [overflow-wrap:anywhere] lets long Spanish words break so
                      the four columns still fit a 320px phone. */}
                  <td className="py-2 pr-3 font-bold">{r.key}</td>
                  <td className="py-2 pr-3 [overflow-wrap:anywhere]">{r.sun}</td>
                  <td className="py-2 pr-3 [overflow-wrap:anywhere]">{r.wind}</td>
                  <td className="py-2 [overflow-wrap:anywhere]">{r.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Link
        to={`/${lang}`}
        className="inline-block bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('wbgtVsHi.ctaButton')}
      </Link>
    </article>
  )
}
