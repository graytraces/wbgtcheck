import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CircleCheck, MapPin } from 'lucide-react'
import SEO from '../components/SEO'
import CorrectionNote from '../components/CorrectionNote'
import FlagBadge from '../components/FlagBadge'
import { FLAG_TINT } from '../utils/flagStyles'
import { guidelineSentences } from '../utils/guidelineText'
import {
  CIF_CATEGORIES,
  CIF_LEGAL_BASIS,
  CIF_WBGT_REQUIRED_QUOTE,
  CIF_NO_DEVICE_QUOTE,
  CIF_NOAA_TOOL_URL,
  CIF_CANCEL_QUOTE,
  CIF_CATEGORY_ROSTER_URL,
  CIF_ACCLIMATIZATION_DAYS_MIN,
  CIF_ACCLIMATIZATION_DAYS_MAX,
  CIF_FIVE_DAY_QUOTE,
  CIF_ONE_PRACTICE_QUOTE,
  CIF_FOOTBALL_EQUIPMENT_QUOTE,
  CIF_COOLING_METHOD_QUOTE,
  CIF_HEAT_SOURCE,
} from '../data/policyOracle'

export default function California() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="california" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">{t('california.pageTitle')}</h1>
        <p className="mt-3 text-lg">{t('california.intro')}</p>
      </header>

      <section>
        <h2 className="display-num mb-2 flex items-center gap-2 text-2xl uppercase">
          <MapPin className="h-6 w-6" aria-hidden="true" />
          {t('california.categoryHeading')}
        </h2>
        <p>{t('california.categoryBody', { basis: CIF_LEGAL_BASIS })}</p>
        <p className="mt-2">{t('california.cancelBody', { quote: CIF_CANCEL_QUOTE })}</p>
        <p className="mt-3">
          <a
            href={CIF_CATEGORY_ROSTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            {t('california.rosterLink')}
          </a>
        </p>
      </section>

      {/* One threshold grid, then one action table.
          The three ladders shared byte-identical guideline objects, so this
          page rendered the same five rows three times over ~4,000px. Worse,
          the tables were visually indistinguishable, so once a heading
          scrolled off there was nothing to tell you which category you were
          reading — on a page where the same number is BLACK in Category 1 and
          YELLOW in Category 3. */}
      <section>
        <h2 id="ca-thresholds" className="display-num mb-2 text-2xl uppercase">
          {t('california.thresholdsHeading')}
        </h2>
        <p className="mb-2 text-sm text-ink-muted">{t('california.thresholdsIntro')}</p>
        {/* Four columns of temperatures do not fit a 320px phone. scroll-x-fade
            is this site's declared exception: it paints the edge shadows that
            make the clipping visible, and marks the table for the no-hscroll
            sweep. The action table below it needs no such exception. */}
        <div className="scroll-x-fade">
          <table className="w-full min-w-[26rem] border-collapse text-sm" aria-labelledby="ca-thresholds">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="py-2 pr-3 font-bold uppercase tracking-wide">
                  {t('california.colFlag')}
                </th>
                {CIF_CATEGORIES.map((_, i) => (
                  <th key={i} className="py-2 pr-3 font-bold uppercase tracking-wide">
                    {t('california.colCategory', { n: i + 1 })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...CIF_CATEGORIES[0].bands].reverse().map((band, rowIndex) => (
                <tr
                  key={band.flag}
                  className={`border-b border-line align-top ${FLAG_TINT[band.flag]}`}
                >
                  <th scope="row" className="py-2 pl-2 pr-3 text-left font-normal">
                    <FlagBadge flag={band.flag} />
                  </th>
                  {CIF_CATEGORIES.map((policy) => (
                    <td key={policy.id} className="display-num whitespace-nowrap py-2 pr-3 text-base">
                      {[...policy.bands].reverse()[rowIndex].sourceLabel}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 id="ca-actions" className="display-num mb-2 text-2xl uppercase">
          {t('california.actionsHeading')}
        </h2>
        <p className="mb-2 text-sm text-ink-muted">{t('california.actionsIntro')}</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm" aria-labelledby="ca-actions">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="py-2 pr-3 font-bold uppercase tracking-wide">
                  {t('california.colFlag')}
                </th>
                <th className="py-2 font-bold uppercase tracking-wide">
                  {t('california.colActions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {[...CIF_CATEGORIES[0].bands].reverse().map((band) => (
                <tr
                  key={band.flag}
                  className={`border-b border-line align-top ${FLAG_TINT[band.flag]}`}
                >
                  <th scope="row" className="py-2 pl-2 pr-3 text-left font-normal">
                    <FlagBadge flag={band.flag} />
                  </th>
                  <td className="py-2 pr-2">
                    <ul className="list-inside list-disc space-y-0.5">
                      {guidelineSentences(band.flag, band.guideline, t).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-l-4 border-flag-orange pl-4">
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('california.boundaryHeading')}
        </h2>
        <p>{t('california.boundaryBody')}</p>
      </section>

      {/* The strongest statement in this whole oracle that a forecast belongs
          in a heat policy — CIF sends schools without a meter to NOAA. */}
      <section className="border-2 border-flag-green bg-surface p-5">
        <h2 className="display-num mb-2 flex items-center gap-2 text-2xl uppercase">
          <CircleCheck className="h-6 w-6" aria-hidden="true" />
          {t('california.measurementHeading')}
        </h2>
        <p>{t('california.measurementBody', { quote: CIF_WBGT_REQUIRED_QUOTE })}</p>
        <p className="mt-3">{t('california.noDeviceBody', { quote: CIF_NO_DEVICE_QUOTE })}</p>
        <p className="mt-3">
          <a
            href={CIF_NOAA_TOOL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            {t('california.noaaLink')}
          </a>
        </p>
        <p className="mt-3 font-bold">{t('california.stillNotCompliance')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('california.acclimatizationHeading')}
        </h2>
        <p>
          {t('california.acclimatizationBody', {
            min: CIF_ACCLIMATIZATION_DAYS_MIN,
            max: CIF_ACCLIMATIZATION_DAYS_MAX,
          })}
        </p>
        <p className="mt-3">{t('california.coolingMethodBody', { cooling: CIF_COOLING_METHOD_QUOTE })}</p>
      </section>

      {/* The binding half. Quoted in CIF's own "shall" because describing it
          as a gradual build turned a mandate into a suggestion. */}
      <section className="border-2 border-flag-red bg-surface p-5">
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('california.acclimatizationMandateHeading')}
        </h2>
        <p>{t('california.acclimatizationMandateBody', { fiveDay: CIF_FIVE_DAY_QUOTE })}</p>
        <p className="mt-3">
          {t('california.acclimatizationLimitsBody', { onePractice: CIF_ONE_PRACTICE_QUOTE })}
        </p>
        <p className="mt-3">
          {t('california.acclimatizationFootballBody', { football: CIF_FOOTBALL_EQUIPMENT_QUOTE })}
        </p>
      </section>

      {/* Mirrors the North Carolina pattern: the page says why the picker
          cannot carry this state, so "MA is in it and California is not" is
          explained on screen rather than looking arbitrary. */}
      <section className="border-2 border-line bg-surface p-5">
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('california.pickerExclusionHeading')}
        </h2>
        <p>{t('california.pickerExclusionBody')}</p>
      </section>

      <section>
        <p className="text-sm">
          <Link to={`/${lang}/california-air-quality`} className="font-semibold underline">
            {t('california.airLink')}
          </Link>
        </p>
      </section>

      <section className="text-sm text-ink-muted">
        <h2 className="font-bold uppercase tracking-wide">{t('california.sourceHeading')}</h2>
        <p className="mt-1">
          {t('california.sourceBody', { verifiedOn: CIF_HEAT_SOURCE.verifiedOn })}{' '}
          <a
            href={CIF_HEAT_SOURCE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {CIF_HEAT_SOURCE.name}
          </a>
        </p>
        <p className="mt-2 text-xs">{t('common.footer.affiliation')}</p>
        <CorrectionNote topic="california" />
      </section>

      <Link
        to={`/${lang}`}
        className="inline-block bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('california.ctaButton')}
      </Link>
    </article>
  )
}
