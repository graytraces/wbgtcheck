import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CircleCheck, MonitorX, MapPin, CircleHelp } from 'lucide-react'
import SEO from '../components/SEO'
import CorrectionNote from '../components/CorrectionNote'
import {
  MEASUREMENT_STANCES,
  KY_ONSITE_STRENGTHS,
  KY_REVISION,
  KY_REVISION_ISO,
  stanceOf,
  type RemoteEstimateStance,
  CIF_NO_DEVICE_QUOTE,
  UIL_FAQ_FORECAST_QUOTE,
  NYSPHSAA_ZIP_QUOTE,
  NYSPHSAA_ONFIELD_WBGT_QUOTE,
  VHSL_FORECAST_PLANNING_QUOTE,
  VHSL_FORECAST_NOT_REPLACE_QUOTE,
  VHSL_FORECAST_GENERALIZED_QUOTE,
} from '../data/policyOracle'
import { GUIDE_SLUG_BY_ABBR } from '../data/guideRegistry'
import { cn } from '../lib/utils'

/**
 * "Can I use a forecast, or does my state want a device on the field?"
 *
 * The most consequential question about this site's own standing, and the
 * oracle has carried the answer per policy since the first state landed —
 * `remoteEstimatesAllowed`. It had never been shown per state, so a reader in
 * Georgia and a reader in Texas got the same page and the same flag with
 * nothing telling them their obligations are opposite.
 *
 * Every stance here is read off the oracle object itself (see `stanceOf`), not
 * restated, so this page cannot disagree with the verdict card. The deciding
 * SENTENCE is shown under each one because the classification is a judgement
 * and the reader is entitled to check it — for a while this comment said so
 * while the table rendered the badge alone.
 *
 * ⚠️ No table on this page may need horizontal scroll — /states is the only
 * declared exception in scripts/checks/no-hscroll-sweep.mjs. That is why the
 * summary is two columns and the quotes are a list beneath it rather than a
 * third column.
 */

const STANCE_STYLE: Record<
  RemoteEstimateStance,
  { icon: typeof CircleCheck; cls: string; labelKey: string }
> = {
  yes: { icon: CircleCheck, cls: 'bg-tint-green text-ink', labelKey: 'forecastOrDevice.stanceYes' },
  'device-required': {
    icon: MonitorX,
    cls: 'bg-tint-red text-ink',
    labelKey: 'forecastOrDevice.stanceDeviceRequired',
  },
  'device-recommended': {
    icon: MapPin,
    cls: 'bg-tint-orange text-ink',
    labelKey: 'forecastOrDevice.stanceDeviceRecommended',
  },
  unspecified: {
    icon: CircleHelp,
    cls: 'bg-tint-black text-ink',
    labelKey: 'forecastOrDevice.stanceUnspecified',
  },
}

/** Colour is never the only carrier: every badge is icon + colour + words. */
function StanceBadge({ stance }: { stance: RemoteEstimateStance }) {
  const { t } = useTranslation()
  const style = STANCE_STYLE[stance]
  const Icon = style.icon
  return (
    <span
      className={cn(
        'inline-flex items-start gap-1.5 px-2 py-0.5 text-xs font-bold uppercase',
        style.cls,
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="[overflow-wrap:anywhere]">{t(style.labelKey)}</span>
    </span>
  )
}

export default function ForecastOrDevice() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="forecastOrDevice" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">
          {t('forecastOrDevice.pageTitle')}
        </h1>
        <p className="mt-3 text-lg">{t('forecastOrDevice.intro')}</p>
        {/* The only route back into the tool was the button 8.8 screens down.
            The reader who arrives here from a search for their state's rule
            has no reason to scroll a policy page to the end to find the
            forecast it is about, so the first screen carries one too. The
            bottom button stays: they are different readers. */}
        <Link
          to={`/${lang}`}
          className="mt-3 inline-block font-bold uppercase tracking-wide underline underline-offset-4 hover:no-underline"
        >
          {t('forecastOrDevice.ctaButton')}
        </Link>
      </header>

      {/* Virginia states the split better than this site can, so it leads —
          in the association's words rather than ours. */}
      <section className="border-2 border-line bg-surface p-4">
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('forecastOrDevice.planningHeading')}
        </h2>
        <p>
          {t('forecastOrDevice.planningBody', {
            planning: VHSL_FORECAST_PLANNING_QUOTE,
            notReplace: VHSL_FORECAST_NOT_REPLACE_QUOTE,
            generalized: VHSL_FORECAST_GENERALIZED_QUOTE,
          })}
        </p>
        <p className="mt-2 font-semibold">{t('forecastOrDevice.planningNote')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('forecastOrDevice.stanceHeading')}
        </h2>
        <ul className="space-y-2 text-sm">
          {(
            ['yes', 'device-required', 'device-recommended', 'unspecified'] as const
          ).map((stance) => (
            <li key={stance}>
              <StanceBadge stance={stance} />{' '}
              <span>
                {t(
                  `forecastOrDevice.${
                    {
                      yes: 'stanceYesBody',
                      'device-required': 'stanceDeviceRequiredBody',
                      'device-recommended': 'stanceDeviceRecommendedBody',
                      unspecified: 'stanceUnspecifiedBody',
                    }[stance]
                  }`,
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase" id="stance-table-heading">
          {t('forecastOrDevice.tableHeading')}
        </h2>
        {/* Two columns, with the deciding sentence as a LINE under each badge
            rather than a third column: the quotes are long enough to force
            this table off a 320px screen as a column of their own, and the
            sweep allows no horizontal scroll outside /states. They were
            carried in the oracle and shown nowhere, which made the header
            comment above a promise the page did not keep. */}
        <table className="w-full border-collapse text-sm" aria-labelledby="stance-table-heading">
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="py-2 pr-3 text-xs font-bold uppercase sm:text-sm sm:tracking-wide">
                {t('forecastOrDevice.colState')}
              </th>
              <th className="py-2 text-xs font-bold uppercase sm:text-sm sm:tracking-wide">
                {t('forecastOrDevice.colStance')}
              </th>
            </tr>
          </thead>
          <tbody>
            {MEASUREMENT_STANCES.map((row) => (
              <tr key={row.abbr} className="border-b border-line align-top">
                <th
                  scope="row"
                  className="display-num py-2 pr-3 text-left text-xl font-normal"
                >
                  {GUIDE_SLUG_BY_ABBR[row.abbr] ? (
                    <Link to={`/${lang}/${GUIDE_SLUG_BY_ABBR[row.abbr]}`} className="underline">
                      {row.abbr}
                    </Link>
                  ) : (
                    row.abbr
                  )}
                </th>
                <td className="py-2">
                  <StanceBadge stance={stanceOf(row)} />
                  {/* The sr-only label is what the deleted third column
                      heading was for: in a two-column table a screen reader
                      otherwise reads a quotation with nothing saying what it
                      is doing there. */}
                  <p className="mt-1 text-xs [overflow-wrap:anywhere]">
                    <span className="sr-only">{t('forecastOrDevice.colSays')}: </span>
                    {row.quote}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('forecastOrDevice.yesHeading')}</h2>
        <p>{t('forecastOrDevice.yesBody', { texas: UIL_FAQ_FORECAST_QUOTE })}</p>
        <p className="mt-2">
          {t('forecastOrDevice.yesCaliforniaBody', { california: CIF_NO_DEVICE_QUOTE })}
        </p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('forecastOrDevice.requiredHeading')}
        </h2>
        <p>{t('forecastOrDevice.requiredBody')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('forecastOrDevice.recommendedHeading')}
        </h2>
        <p>{t('forecastOrDevice.recommendedBody')}</p>
      </section>

      {/* Kentucky is one field in the oracle and three rules in the document.
          The summary above shows the strictest; this is where it is unpacked,
          and policyData.js requires the two to travel together. */}
      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('forecastOrDevice.kentuckyHeading')}
        </h2>
        <p>{t('forecastOrDevice.kentuckyBody')}</p>
        <dl className="mt-3 space-y-3 text-sm">
          {KY_ONSITE_STRENGTHS.map((entry) => (
            <div key={entry.sportKey} className="border-l-2 border-line pl-3">
              <dt className="font-bold">
                {t(
                  `forecastOrDevice.kentuckySport${
                    entry.sportKey.charAt(0).toUpperCase() + entry.sportKey.slice(1)
                  }`,
                )}{' '}
                —{' '}
                {t(
                  `forecastOrDevice.kentuckyStrength${
                    entry.strength.charAt(0).toUpperCase() + entry.strength.slice(1)
                  }`,
                )}
              </dt>
              <dd className="[overflow-wrap:anywhere]">
                {entry.quote ?? t('forecastOrDevice.kentuckyUnstatedBody')}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 font-semibold">{t('forecastOrDevice.kentuckySummaryNote')}</p>
        {/* /states and /kentucky both carry this and this page did not, while
            printing "read 2026-08-10" beside the Kentucky row like every other
            source — a date that attests when the capture was read and nothing
            about whether KHSAA still publishes it. `8/22/24` is month-first,
            so Spanish gets the ISO form (the /kentucky treatment). */}
        <p className="mt-2 text-sm text-ink-muted">
          {t('forecastOrDevice.kentuckyCurrencyNote', {
            revision: lang === 'es' ? KY_REVISION_ISO : KY_REVISION,
          })}
        </p>
      </section>

      {/* The one state where a reader could take a real permission and apply
          it to the wrong scale. */}
      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('forecastOrDevice.newYorkHeading')}
        </h2>
        <p>
          {t('forecastOrDevice.newYorkBody', {
            zip: NYSPHSAA_ZIP_QUOTE,
            onField: NYSPHSAA_ONFIELD_WBGT_QUOTE,
          })}
        </p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('forecastOrDevice.elsewhereHeading')}
        </h2>
        <p>{t('forecastOrDevice.elsewhereBody')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('forecastOrDevice.bottomLineHeading')}
        </h2>
        <p>{t('forecastOrDevice.bottomLineBody')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('forecastOrDevice.sourcesHeading')}
        </h2>
        <p className="text-sm text-ink-muted">{t('forecastOrDevice.sourcesBody')}</p>
        <ul className="mt-2 space-y-1 text-sm">
          {MEASUREMENT_STANCES.map((row) => (
            <li key={row.abbr} className="[overflow-wrap:anywhere]">
              <span className="font-bold">{row.abbr}</span>{' '}
              <a href={row.source.url} className="underline hover:text-ink">
                {row.source.name}
              </a>{' '}
              <span className="text-ink-muted">
                ({t('forecastOrDevice.verifiedOnLabel')} {row.source.verifiedOn})
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink-muted">{t('common.footer.affiliation')}</p>
        <CorrectionNote topic="forecast-or-device" />
      </section>

      <Link
        to={`/${lang}`}
        className="inline-block bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('forecastOrDevice.ctaButton')}
      </Link>
    </article>
  )
}
