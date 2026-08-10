import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Link2Off as LinkOff, MapPin } from 'lucide-react'
import SEO from '../components/SEO'
import CorrectionNote from '../components/CorrectionNote'
import FlagBadge from '../components/FlagBadge'
import { FLAG_TINT } from '../utils/flagStyles'
import {
  NYSPHSAA_AMBIENT_TRIGGER_F,
  NYSPHSAA_APPROVED_ON,
  NYSPHSAA_APP_QUOTE,
  NYSPHSAA_CHECK_LEAD_HOURS,
  NYSPHSAA_HEAT_INDEX_REFERENCE,
  NYSPHSAA_UPDATED_ON,
  NYSPHSAA_WARNING_BREAK_INTERVAL_MINUTES,
  NYSPHSAA_ZIP_QUOTE,
  NYSPHSAA_WBGT_SOURCE,
  NYSPHSAA_WBGT_CATEGORIES,
  NYSPHSAA_WBGT_ACTIONS,
  NYSPHSAA_WBGT_BLACK_MIN_F,
  NYSPHSAA_CATEGORY_LOOKUP_QUOTE,
  NYSPHSAA_CATEGORY_LOOKUP_URL,
  NYSPHSAA_CATEGORY_LOOKUP_CHECKED_ON,
  NYSPHSAA_STRICTEST_CATEGORY,
  NYSPHSAA_REGION_FIGURE_CAPTION,
  NYSPHSAA_EITHER_SCALE_QUOTE,
  NYSPHSAA_SUSPEND_BOTH_SCALES_QUOTE,
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
        {/* The two sentences that overturn "this is a heat index policy": the
            offer of WBGT sits in the same sentence as the heat index, and the
            suspension trigger is defined in both scales at once. */}
        <p className="mt-2">
          {t('newYork.eitherScaleBody', { quote: NYSPHSAA_EITHER_SCALE_QUOTE })}
        </p>
        <p className="mt-2">
          {t('newYork.suspendBody', { quote: NYSPHSAA_SUSPEND_BOTH_SCALES_QUOTE })}
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
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                {/* Range and tier share a column so the table fits a 320px
                    phone — both headings kept, layout only. */}
                <th className="py-2 pr-3 font-bold uppercase tracking-wide">
                  {t('newYork.colHeatIndex')} · {t('newYork.colTier')}
                </th>
                <th className="py-2 font-bold uppercase tracking-wide">{t('newYork.colAction')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.sourceLabel} className="border-b border-line align-top">
                  <td className="py-2 pr-3">
                    <div className="whitespace-nowrap font-semibold">{row.sourceLabel}</div>
                    <div className="mt-0.5 font-semibold">{t(`newYork.tiers.${row.tierKey}`)}</div>
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

      {/* The second ladder — the one a text extract missed because it is an
          image. Rendered the way California's three CIF categories are: one
          threshold grid, one action table, and no category chosen for you. */}
      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('newYork.wbgtHeading')}</h2>
        <p className="mb-3">{t('newYork.wbgtIntro')}</p>
      </section>

      <section className="border-2 border-line bg-surface p-5">
        <h2 className="display-num mb-2 flex items-center gap-2 text-2xl uppercase">
          <MapPin className="h-6 w-6" aria-hidden="true" />
          {t('newYork.categoryHeading')}
        </h2>
        <p>{t('newYork.categoryBody', { quote: NYSPHSAA_CATEGORY_LOOKUP_QUOTE })}</p>
        {/* The page-2 figure is real and must be acknowledged, but reading a
            school off a national grey map would invent the permission the dead
            lookup withholds. The two category black lines say how much. */}
        <p className="mt-3">
          {t('newYork.categoryFigureBody', {
            caption: NYSPHSAA_REGION_FIGURE_CAPTION,
            strict: NYSPHSAA_WBGT_BLACK_MIN_F.cat1,
            loose: NYSPHSAA_WBGT_BLACK_MIN_F.cat2,
          })}
        </p>
      </section>

      {/* The page used to stop at "the link no longer resolves", which is true
          and leaves the reader holding three columns and no way to choose.
          These three sections are the rest of that sentence: the dead lookup
          as a dated, checkable fact; what a reader can actually do; and why
          California gets asked its category here and New York does not. */}
      <section className="border-2 border-flag-orange bg-surface p-5">
        <h2 className="display-num mb-2 flex items-center gap-2 text-2xl uppercase">
          <LinkOff className="h-6 w-6 shrink-0" aria-hidden="true" />
          {t('newYork.lookupDeadHeading')}
        </h2>
        {/* The URL is shown, not linked: an anchor invites a click that cannot
            succeed, and the point is that the reader can check the claim. */}
        <p>
          {t('newYork.lookupDeadBody', {
            url: NYSPHSAA_CATEGORY_LOOKUP_URL,
            checkedOn: NYSPHSAA_CATEGORY_LOOKUP_CHECKED_ON,
          })}
        </p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('newYork.whatToDoHeading')}</h2>
        <p>
          {t('newYork.whatToDoBody', {
            strictest: NYSPHSAA_STRICTEST_CATEGORY,
            strictestBlack: NYSPHSAA_WBGT_BLACK_MIN_F.cat1,
            loosestBlack: NYSPHSAA_WBGT_BLACK_MIN_F.cat3,
          })}
        </p>
        <p className="mt-3">{t('newYork.noPromptBody')}</p>
        <p className="mt-3 text-sm">
          <Link to={`/${lang}/california`} className="font-semibold underline">
            {t('states.californiaLink')} →
          </Link>
        </p>
      </section>

      <section>
        <h2 id="ny-wbgt-thresholds" className="display-num mb-2 text-2xl uppercase">
          {t('newYork.tableHeadingWbgt')}
        </h2>
        <p className="mb-2 text-sm text-ink-muted">{t('newYork.wbgtThresholdsIntro')}</p>
        {/* Four columns of temperatures do not fit a 320px phone. scroll-x-fade
            is this site's declared exception — it paints the edge shadows that
            make the clipping visible. */}
        <div className="scroll-x-fade">
          <table
            className="w-full min-w-[26rem] border-collapse text-sm"
            aria-labelledby="ny-wbgt-thresholds"
          >
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="py-2 pr-3 font-bold uppercase tracking-wide">
                  {t('newYork.colFlag')}
                </th>
                {NYSPHSAA_WBGT_CATEGORIES.map((category) => (
                  <th
                    key={category.id}
                    className="py-2 pr-3 font-bold uppercase tracking-wide"
                  >
                    {t('newYork.colCategory', { n: category.categoryNumber })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NYSPHSAA_WBGT_CATEGORIES[0].bands.map((band, rowIndex) => (
                <tr
                  key={band.flag}
                  className={`border-b border-line align-top ${FLAG_TINT[band.flag]}`}
                >
                  <th scope="row" className="py-2 pl-2 pr-3 text-left font-normal">
                    <FlagBadge flag={band.flag} />
                  </th>
                  {NYSPHSAA_WBGT_CATEGORIES.map((category) => (
                    <td
                      key={category.id}
                      className="display-num whitespace-nowrap py-2 pr-3 text-base"
                    >
                      {category.bands[rowIndex].sourceLabel}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 id="ny-wbgt-actions" className="display-num mb-2 text-2xl uppercase">
          {t('newYork.colActions')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm" aria-labelledby="ny-wbgt-actions">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="py-2 pr-3 font-bold uppercase tracking-wide">
                  {t('newYork.colFlag')}
                </th>
                <th className="py-2 font-bold uppercase tracking-wide">
                  {t('newYork.colActions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {NYSPHSAA_WBGT_ACTIONS.map((action) => (
                <tr
                  key={action.flag}
                  className={`border-b border-line align-top ${FLAG_TINT[action.flag]}`}
                >
                  <th scope="row" className="py-2 pl-2 pr-3 text-left font-normal">
                    <FlagBadge flag={action.flag} />
                  </th>
                  <td className="py-2 pr-2">
                    <ul className="list-inside list-disc space-y-0.5">
                      {action.textKeys.map((key) => (
                        <li key={key}>{t(key, action.vars)}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          {t('newYork.wbgtSourceBody', { verifiedOn: NYSPHSAA_WBGT_SOURCE.verifiedOn })}{' '}
          <a
            href={NYSPHSAA_WBGT_SOURCE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {NYSPHSAA_WBGT_SOURCE.name}
          </a>
        </p>
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
        <CorrectionNote topic="new-york" />
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
