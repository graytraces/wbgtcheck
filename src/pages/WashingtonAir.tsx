import { useTranslation } from 'react-i18next'
import SEO from '../components/SEO'
import {
  WA_AIR_POLICY,
  WA_HEALTH_CONDITIONS_QUOTE,
  WA_INDOOR_PM25_THRESHOLD_UG_M3,
  ACTIVITY_IDS,
  ACTIVITY_DURATIONS,
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
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('washingtonAir.tableHeading')}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="py-2 pr-3 font-bold uppercase tracking-wide">
                  {t('air.tableAqi')}
                </th>
                {ACTIVITY_IDS.map((id) => {
                  const d = ACTIVITY_DURATIONS[id as ActivityId]
                  return (
                    <th key={id} className="py-2 pr-3 font-bold uppercase tracking-wide">
                      {t(`air.activity.${id}`)}
                      <span className="block text-xs font-normal normal-case opacity-80">
                        {d.minutes !== null
                          ? t('air.activityMinutes', { minutes: d.minutes })
                          : t('air.activityHours', {
                              hoursMin: d.hoursMin,
                              hoursMax: d.hoursMax,
                            })}
                      </span>
                    </th>
                  )
                })}
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
                      {t(`air.actions.${airActionFor(band, id as ActivityId)}`, {
                        pm25: WA_INDOOR_PM25_THRESHOLD_UG_M3,
                      })}
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
          {t('washingtonAir.healthConditionsHeading')}
        </h2>
        <p>{t('washingtonAir.healthConditionsBody', { quote: WA_HEALTH_CONDITIONS_QUOTE })}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('air.sourceQuoteLabel')}
        </h2>
        <blockquote className="border-l-4 border-ink pl-4 text-sm text-ink-muted">
          {airActionQuote(policy, 'cancelOrMove')}
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
      </section>
    </article>
  )
}
