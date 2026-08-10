import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import SEO from '../components/SEO'
import CorrectionNote from '../components/CorrectionNote'
import {
  VA_CANCEL_QUOTE,
  VA_CODE_CITATION,
  VA_CODE_SECTION,
  VA_CONSISTENCY_QUOTE,
  VA_ICE_WBGT_F,
  VA_MIN_TIERS,
  VA_STATUTE_SOURCE,
  VHSL_CANCEL_QUOTE,
  VHSL_ICE_LEVEL,
  VHSL_LEVEL_COUNT,
  VHSL_REFERENCE,
  VHSL_TABLE_TITLE_QUOTE,
} from '../data/policyOracle'

export default function Virginia() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  // Coolest row first, matching the band-table convention on the other guides.
  const rows = [...VHSL_REFERENCE.rows].reverse()

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="virginia" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">{t('virginia.pageTitle')}</h1>
        <p className="mt-3 text-lg">{t('virginia.intro')}</p>
      </header>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('virginia.statuteHeading')}</h2>
        <p>
          {t('virginia.statuteBody', {
            section: VA_CODE_SECTION,
            citation: VA_CODE_CITATION,
          })}
        </p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('virginia.districtHeading')}</h2>
        <p>{t('virginia.districtBody', { cancel: VA_CANCEL_QUOTE })}</p>
        <p className="mt-2">{t('virginia.consistencyBody', { consistency: VA_CONSISTENCY_QUOTE })}</p>
        <p className="mt-2">{t('virginia.tiersBody', { tiers: VA_MIN_TIERS })}</p>
      </section>

      <section className="border-2 border-line bg-surface p-5">
        <h2 className="display-num mb-2 text-2xl uppercase">{t('virginia.iceHeading')}</h2>
        <p>{t('virginia.iceBody', { ice: VA_ICE_WBGT_F })}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('virginia.measurementHeading')}</h2>
        <p>{t('virginia.measurementBody')}</p>
        <p className="mt-2">{t('virginia.reportingBody')}</p>
      </section>

      {/* The table this page spent a day saying could not exist. VHSL's own
          guidance is advisory; § 22.1-271.10 is what makes a division policy
          consistent with it mandatory, so the statute section above and this
          table are two halves of one answer. */}
      <section>
        <h2 id="va-levels" className="display-num mb-2 text-2xl uppercase">
          {t('virginia.tableHeading')}
        </h2>
        <p className="mb-3 text-sm text-ink-muted">
          {t('virginia.tableIntro', {
            levels: VHSL_LEVEL_COUNT,
            title: VHSL_TABLE_TITLE_QUOTE,
          })}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm" aria-labelledby="va-levels">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="py-2 pr-3 font-bold uppercase tracking-wide">
                  {t('virginia.colLevel')}
                </th>
                <th className="py-2 font-bold uppercase tracking-wide">
                  {t('virginia.colGuideline')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.level} className="border-b border-line align-top">
                  <th scope="row" className="py-2 pr-3 text-left font-semibold">
                    <div className="whitespace-nowrap">
                      {t('virginia.levelLabel', { level: row.level })}
                    </div>
                    <div className="display-num mt-0.5 whitespace-nowrap text-base">
                      {row.sourceLabel}
                    </div>
                  </th>
                  <td className="py-2">
                    <ul className="list-inside list-disc space-y-0.5">
                      {row.textKeys.map((key) => (
                        // The Level 6 duration cell is a verbatim quotation, so
                        // it interpolates rather than being re-typed in copy.
                        <li key={key}>{t(key, { ...row.vars, cancel: VHSL_CANCEL_QUOTE })}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          {t('virginia.iceCrossCheckBody', { ice: VA_ICE_WBGT_F, level: VHSL_ICE_LEVEL })}
        </p>
      </section>

      <section className="flex items-start gap-3 border-2 border-flag-orange bg-surface p-5">
        <Info className="mt-0.5 h-6 w-6 shrink-0 text-flag-orange" aria-hidden="true" />
        <p className="font-semibold">
          {t('virginia.localPolicyNotice', { section: VA_CODE_SECTION })}
        </p>
      </section>

      <section className="text-sm text-ink-muted">
        <h2 className="font-bold uppercase tracking-wide">{t('virginia.sourceHeading')}</h2>
        <p className="mt-1">
          {t('virginia.sourceBody', {
            section: VA_CODE_SECTION,
            verifiedOn: VA_STATUTE_SOURCE.verifiedOn,
          })}{' '}
          <a
            href={VA_STATUTE_SOURCE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {VA_STATUTE_SOURCE.name}
          </a>
        </p>
        {/* The table has its own document and its own verification date; one
            source line for two documents would attribute the statute's date to
            VHSL's table. */}
        <p className="mt-1">
          {t('virginia.tableSourceBody', { verifiedOn: VHSL_REFERENCE.source.verifiedOn })}{' '}
          <a
            href={VHSL_REFERENCE.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {VHSL_REFERENCE.source.name}
          </a>
        </p>
        <p className="mt-2 text-xs">{t('common.footer.affiliation')}</p>
        <CorrectionNote topic="virginia" />
      </section>

      <Link
        to={`/${lang}`}
        className="inline-block bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('virginia.ctaButton')}
      </Link>
    </article>
  )
}
