import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SEO from '../components/SEO'
import FlagBadge from '../components/FlagBadge'
import { guidelineSentences } from '../utils/guidelineText'
import { FLAG_TINT } from '../utils/flagStyles'
import {
  UIL_CLASS_2,
  UIL_CLASS_3,
  UIL_EFFECTIVE_DATE,
  UIL_READING_BEFORE_PRACTICE_MAX_MINUTES,
  UIL_READING_INTERVAL_MINUTES,
} from '../data/policyOracle'

const UIL_MAP_URL = 'https://www.uiltexas.org/files/health/WBGTMap.jpg'

export default function Texas() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  // Class 2 and Class 3 share guidelines per band; only thresholds differ
  // (enforced by test). Render one combined table straight from the oracle.
  const bands3 = [...UIL_CLASS_3.bands].reverse()
  const bands2 = [...UIL_CLASS_2.bands].reverse()

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="texas" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">{t('texas.pageTitle')}</h1>
        <p className="mt-3 text-lg">{t('texas.intro', { effectiveDate: UIL_EFFECTIVE_DATE })}</p>
      </header>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('texas.classesHeading')}</h2>
        <p>{t('texas.classesBody')}</p>
        <p className="mt-2">
          <a href={UIL_MAP_URL} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
            {t('policies.uilMapLink')}
          </a>
        </p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('texas.tableHeading')}</h2>
        {/* Three columns cannot fit a 320px phone, so below sm each band
            renders as a card: badge, both class ranges, guidelines. Same
            keys, same oracle data — only the layout differs. */}
        <div className="space-y-4 sm:hidden">
          {bands3.map((band3, i) => {
            const band2 = bands2[i]
            return (
              <div key={band3.flag} className={`border-b border-line p-2 pb-3 ${FLAG_TINT[band3.flag]}`}>
                <FlagBadge flag={band3.flag} />
                <div className="mt-1.5 flex gap-6">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide">{t('texas.tableClass2')}</div>
                    <div className="display-num whitespace-nowrap text-lg">{band2.sourceLabel}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide">{t('texas.tableClass3')}</div>
                    <div className="display-num whitespace-nowrap text-lg">{band3.sourceLabel}</div>
                  </div>
                </div>
                <ul className="mt-2 list-inside list-disc space-y-0.5">
                  {guidelineSentences(band3.flag, band3.guideline, t).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="py-2 pr-3 font-bold uppercase tracking-wide">{t('texas.tableClass2')}</th>
                <th className="py-2 pr-3 font-bold uppercase tracking-wide">{t('texas.tableClass3')}</th>
                <th className="py-2 font-bold uppercase tracking-wide">{t('texas.tableGuidelines')}</th>
              </tr>
            </thead>
            <tbody>
              {bands3.map((band3, i) => {
                const band2 = bands2[i]
                return (
                  <tr key={band3.flag} className={`border-b border-line align-top ${FLAG_TINT[band3.flag]}`}>
                    <td className="py-2 pl-2 pr-3">
                      <FlagBadge flag={band3.flag} />
                      <div className="display-num mt-1 whitespace-nowrap text-lg">{band2.sourceLabel}</div>
                    </td>
                    <td className="display-num whitespace-nowrap py-2 pr-3 pt-8 text-lg">{band3.sourceLabel}</td>
                    <td className="py-2 pr-2">
                      <ul className="list-inside list-disc space-y-0.5">
                        {guidelineSentences(band3.flag, band3.guideline, t).map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('texas.measurementHeading')}</h2>
        <p>
          {t('measurement.uilTiming', {
            before: UIL_READING_BEFORE_PRACTICE_MAX_MINUTES,
            interval: UIL_READING_INTERVAL_MINUTES,
          })}
        </p>
        <p className="mt-2">{t('texas.measurementApps')}</p>
        <p className="mt-2">{t('texas.competitionNote')}</p>
        <p className="mt-2 font-semibold">{t('texas.bandNote')}</p>
      </section>

      <section className="text-sm text-ink-muted">
        <h2 className="font-bold uppercase tracking-wide">{t('texas.sourceHeading')}</h2>
        <p className="mt-1">
          {t('texas.sourceBody', { verifiedOn: UIL_CLASS_3.source.verifiedOn })}{' '}
          <a href={UIL_CLASS_3.source.url} target="_blank" rel="noopener noreferrer" className="underline">
            {UIL_CLASS_3.source.name}
          </a>
        </p>
        <p className="mt-2 text-xs">{t('common.footer.affiliation')}</p>
      </section>

      <Link
        to={`/${lang}`}
        className="inline-block bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('texas.ctaButton')}
      </Link>
    </article>
  )
}
