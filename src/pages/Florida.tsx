import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TriangleAlert, Scale } from 'lucide-react'
import SEO from '../components/SEO'
import CorrectionNote from '../components/CorrectionNote'
import {
  FL_STATUTE_SECTION,
  FL_STATUTE_CITATION,
  FL_ONSITE_MEASUREMENT_QUOTE,
  FL_MODIFY_QUOTE,
  FL_COOLING_ZONE_QUOTE,
  FL_EAP_QUOTE,
  FL_YEAR_ROUND_QUOTE,
  FL_TRAINING_QUOTE,
  FL_STATUTE_SOURCE,
  FHSAA_PRACTICE_REFERENCE,
  FHSAA_SECTION,
  FHSAA_PURPOSE_QUOTE,
  FHSAA_DEVICE_MANDATE_QUOTE,
  FHSAA_TRIGGER_WBGT_F,
  FHSAA_TRIGGER_QUOTE,
  FHSAA_MONITOR_INTERVAL_MINUTES,
  FHSAA_CONTEST_SECTION,
  FHSAA_CONTEST_TOP_BAND_MIN_F,
  FHSAA_CONTEST_SPORT_COUNT,
  FHSAA_CONTEST_REFERENCE_QUOTE,
  FHSAA_CONTEST_POSTPONE_QUOTE,
} from '../data/policyOracle'

export default function Florida() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  // Coolest row first, matching the band-table convention on the other guides.
  const rows = [...FHSAA_PRACTICE_REFERENCE.rows].reverse()

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="florida" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">{t('florida.pageTitle')}</h1>
        <p className="mt-3 text-lg">{t('florida.intro')}</p>
      </header>

      <section>
        <h2 className="display-num mb-2 flex items-center gap-2 text-2xl uppercase">
          <Scale className="h-6 w-6" aria-hidden="true" />
          {t('florida.statuteHeading')}
        </h2>
        <p>
          {t('florida.statuteBody', {
            section: FL_STATUTE_SECTION,
            citation: FL_STATUTE_CITATION,
          })}
        </p>
        <p className="mt-2">{t('florida.modifyBody', { quote: FL_MODIFY_QUOTE })}</p>
        <p className="mt-2">{t('florida.yearRoundBody', { quote: FL_YEAR_ROUND_QUOTE })}</p>
      </section>

      {/* The measurement sentence is why this page exists: it decides whether
          a forecast can be the reading, and in Florida it cannot. */}
      <section className="border-2 border-flag-red bg-surface p-5">
        <h2 className="display-num mb-2 flex items-center gap-2 text-2xl uppercase">
          <TriangleAlert className="h-6 w-6 text-flag-red" aria-hidden="true" />
          {t('florida.measurementHeading')}
        </h2>
        <p>{t('florida.measurementBody', { quote: FL_ONSITE_MEASUREMENT_QUOTE })}</p>
        <p className="mt-3">{t('florida.wbgtNamingBody')}</p>
        <p className="mt-3 font-bold">{t('florida.deviceWarning')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('florida.coolingHeading')}</h2>
        <p>{t('florida.coolingBody', { quote: FL_COOLING_ZONE_QUOTE })}</p>
        <p className="mt-2">{t('florida.eapBody', { quote: FL_EAP_QUOTE })}</p>
        <p className="mt-2">{t('florida.trainingBody', { quote: FL_TRAINING_QUOTE })}</p>
      </section>

      {/* FHSAA requires the instrument, which is what makes the statute's
          on-site sentence above binding rather than aspirational. */}
      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('florida.mandateHeading')}</h2>
        <p>{t('florida.mandateBody', { mandate: FHSAA_DEVICE_MANDATE_QUOTE })}</p>
        <p className="mt-2">
          {t('florida.triggerBody', {
            trigger: FHSAA_TRIGGER_WBGT_F,
            quote: FHSAA_TRIGGER_QUOTE,
            interval: FHSAA_MONITOR_INTERVAL_MINUTES,
          })}
        </p>
      </section>

      {/* The table this page spent a day saying could not be opened. */}
      <section>
        <h2 id="fl-practice" className="display-num mb-2 text-2xl uppercase">
          {t('florida.tableHeading', { section: FHSAA_SECTION })}
        </h2>
        <p className="mb-3 text-sm text-ink-muted">
          {t('florida.tableIntro', { purpose: FHSAA_PURPOSE_QUOTE })}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm" aria-labelledby="fl-practice">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="py-2 pr-3 font-bold uppercase tracking-wide">
                  {t('florida.colWbgt')}
                </th>
                <th className="py-2 font-bold uppercase tracking-wide">
                  {t('florida.colActivity')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.sourceLabel} className="border-b border-line align-top">
                  <th scope="row" className="py-2 pr-3 text-left font-semibold">
                    <span className="display-num whitespace-nowrap text-base">
                      {row.sourceLabel}
                    </span>
                  </th>
                  <td className="py-2">
                    <ul className="list-inside list-disc space-y-0.5">
                      {row.textKeys.map((key) => (
                        <li key={key}>{t(key, row.vars)}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* The correction, kept on the page rather than only in the history: the
          document was always openable and the site said otherwise. */}
      <section className="border-l-4 border-flag-orange pl-4">
        <h2 className="display-num mb-2 text-2xl uppercase">{t('florida.openedHeading')}</h2>
        <p>
          {t('florida.openedBody', {
            verifiedOn: FHSAA_PRACTICE_REFERENCE.source.verifiedOn,
          })}
        </p>
      </section>

      {/* The asymmetry a coach can be hurt by: the practice ladder's top row is
          NOT Florida's stop line for a game. §41.9.5's hottest band prescribes
          hydration breaks, and nothing in it forbids an outdoor contest. */}
      <section className="border-2 border-flag-red bg-surface p-5">
        <h2 className="display-num mb-2 flex items-center gap-2 text-2xl uppercase">
          <TriangleAlert className="h-6 w-6 text-flag-red" aria-hidden="true" />
          {t('florida.contestHeading')}
        </h2>
        <p>
          {t('florida.contestBody', {
            section: FHSAA_CONTEST_SECTION,
            sports: FHSAA_CONTEST_SPORT_COUNT,
            quote: FHSAA_CONTEST_REFERENCE_QUOTE,
            top: FHSAA_CONTEST_TOP_BAND_MIN_F,
          })}
        </p>
        <p className="mt-3">
          {t('florida.contestPostponeBody', { quote: FHSAA_CONTEST_POSTPONE_QUOTE })}
        </p>
      </section>

      {/* Mirrors the North Carolina pattern: the page says why the picker
          cannot carry this state, so "MA is in it and Florida is not" is
          explained on screen rather than looking arbitrary. */}
      <section className="border-2 border-line bg-surface p-5">
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('florida.pickerExclusionHeading')}
        </h2>
        <p>{t('florida.pickerExclusionBody')}</p>
      </section>

      <section className="text-sm text-ink-muted">
        <h2 className="font-bold uppercase tracking-wide">{t('florida.sourceHeading')}</h2>
        <p className="mt-1">
          {t('florida.sourceBody', { verifiedOn: FL_STATUTE_SOURCE.verifiedOn })}{' '}
          <a
            href={FL_STATUTE_SOURCE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {FL_STATUTE_SOURCE.name}
          </a>
        </p>
        {/* Statute and handbook are two documents with two verification dates.
            One source line would attribute one date to both. */}
        <p className="mt-1">
          {t('florida.tableSourceBody', {
            verifiedOn: FHSAA_PRACTICE_REFERENCE.source.verifiedOn,
          })}{' '}
          <a
            href={FHSAA_PRACTICE_REFERENCE.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {FHSAA_PRACTICE_REFERENCE.source.name}
          </a>
        </p>
        <p className="mt-2 text-xs">{t('common.footer.affiliation')}</p>
        <CorrectionNote topic="florida" />
      </section>

      <Link
        to={`/${lang}`}
        className="inline-block bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('florida.ctaButton')}
      </Link>
    </article>
  )
}
