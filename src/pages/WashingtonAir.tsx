import { useTranslation } from 'react-i18next'
import SEO from '../components/SEO'
import CorrectionNote from '../components/CorrectionNote'
import AirDataSources from '../components/AirDataSources'
import {
  WA_AIR_POLICY,
  WA_SENSITIVE_GROUP_QUOTE,
  WA_DATA_SOURCE_QUOTE,
  WA_SMOKE_BLOG,
  ACTIVITY_IDS,
  airActionFor,
  airActionQuote,
  classifyAqi,
} from '../data/airPolicyOracle'
import type { ActivityId } from '../data/airPolicyOracle'
import { aqiSwatchFor } from '../utils/aqiStyles'

export default function WashingtonAir() {
  const { t } = useTranslation()
  const policy = WA_AIR_POLICY

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="washingtonAir" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">
          {t('washingtonAir.pageTitle')}
        </h1>
        <p className="mt-3 text-lg">{t('washingtonAir.intro')}</p>
      </header>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('washingtonAir.basisHeading')}
        </h2>
        <p>{t('washingtonAir.basisBody')}</p>
        <p className="mt-2">{t('washingtonAir.dataSourceBody', { quote: WA_DATA_SOURCE_QUOTE })}</p>
        <p className="mt-2 text-sm">
          <a
            href={WA_SMOKE_BLOG.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            {t('washingtonAir.smokeSourceLink')}
          </a>
        </p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('washingtonAir.tableHeading')}
        </h2>
        {/* Four prose columns cannot fit a 320px phone, so below sm the same
            band x duration grid renders as stacked cards. Same keys, same
            oracle data — only the layout differs. */}
        <div className="space-y-5 sm:hidden">
          {policy.bands.map((band) => (
            <div key={band.id} className="border-b border-line pb-4">
              <span
                className="inline-block px-2 py-1 text-xs font-bold"
                style={aqiSwatchFor(classifyAqi(band.minAqi))}
              >
                {band.sourceLabel}
              </span>
              <dl className="mt-2 space-y-2">
                {ACTIVITY_IDS.map((id) => (
                  <div key={id}>
                    <dt className="text-xs font-bold uppercase tracking-wide">
                      {t(`air.activity.${id}`)}{' '}
                      <span className="font-normal normal-case opacity-80">
                        {t(`air.activityExample.${id}`)}
                      </span>
                    </dt>
                    <dd>{t(`air.actions.${airActionFor(band, id as ActivityId)}`)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="py-2 pr-3 font-bold uppercase tracking-wide">
                  {t('air.tableAqi')}
                </th>
                {ACTIVITY_IDS.map((id) => (
                  <th key={id} className="py-2 pr-3 font-bold uppercase tracking-wide">
                    {t(`air.activity.${id}`)}
                    <span className="block text-xs font-normal normal-case opacity-80">
                      {t(`air.activityExample.${id}`)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {policy.bands.map((band) => (
                <tr key={band.id} className="border-b border-line align-top">
                  <td className="py-2 pr-3">
                    <span
                      className="inline-block px-2 py-1 text-xs font-bold"
                      style={aqiSwatchFor(classifyAqi(band.minAqi))}
                    >
                      {band.sourceLabel}
                    </span>
                  </td>
                  {ACTIVITY_IDS.map((id) => (
                    <td key={id} className="py-2 pr-3">
                      {t(`air.actions.${airActionFor(band, id as ActivityId)}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-ink-muted">{t('washingtonAir.athleticsNote')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('washingtonAir.sensitiveGroupHeading')}
        </h2>
        <p>{t('washingtonAir.sensitiveGroupBody', { quote: WA_SENSITIVE_GROUP_QUOTE })}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('air.sourceQuoteLabel')}
        </h2>
        <blockquote className="border-l-4 border-ink pl-4 text-sm text-ink-muted">
          {airActionQuote(policy, 'limitLightOrHourModerate')}
        </blockquote>
      </section>

      <section className="text-sm">
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('washingtonAir.sourceHeading')}
        </h2>
        <p>{t('washingtonAir.sourceBody')}</p>
        <p className="mt-1">
          <a
            href={policy.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline"
          >
            {policy.source.name}
          </a>
        </p>
        <p className="mt-1 text-ink-muted">
          {t('air.verifiedOn', { date: policy.source.verifiedOn })}
        </p>
        <p className="mt-2 text-ink-muted">{t('common.footer.affiliation')}</p>
        <CorrectionNote topic="washington-air-quality" />
      </section>
      <AirDataSources />
    </article>
  )
}
