import { useTranslation } from 'react-i18next'
import SEO from '../components/SEO'
import AirDataSources from '../components/AirDataSources'
import {
  OR_AIR_POLICY,
  OR_CONSERVATIVE_METRIC_QUOTE,
  NFHS_LANDMARK_MILES,
  airActionFor,
  classifyAqi,
} from '../data/airPolicyOracle'
import { aqiSwatchFor } from '../utils/aqiStyles'

export default function OregonAir() {
  const { t } = useTranslation()
  const policy = OR_AIR_POLICY
  const statedBands = policy.bands.filter((b) => b.action !== null)

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="oregonAir" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">
          {t('oregonAir.pageTitle')}
        </h1>
        <p className="mt-3 text-lg">{t('oregonAir.intro')}</p>
      </header>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('oregonAir.tableHeading')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="py-2 pr-3 font-bold uppercase tracking-wide">
                  {t('air.tableAqi')}
                </th>
                <th className="py-2 pr-3 font-bold uppercase tracking-wide">
                  {t('air.tableVisibility')}
                </th>
                <th className="py-2 font-bold uppercase tracking-wide">
                  {t('air.tableAction')}
                </th>
              </tr>
            </thead>
            <tbody>
              {statedBands.map((band) => (
                <tr key={band.id} className="border-b border-line align-top">
                  <td className="py-2 pr-3">
                    <span
                      className="inline-block px-2 py-1 text-xs font-bold"
                      style={aqiSwatchFor(classifyAqi(band.minAqi))}
                    >
                      {band.sourceLabel}
                    </span>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">{band.visibilityLabel}</td>
                  <td className="py-2">{t(`air.actions.${airActionFor(band, 'athletics')}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('oregonAir.belowRangeHeading')}
        </h2>
        <p>{t('oregonAir.belowRangeBody')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('air.visibilityHeading')}
        </h2>
        <p>
          {t('air.visibilityBody', {
            near: NFHS_LANDMARK_MILES[0],
            mid: NFHS_LANDMARK_MILES[1],
            far: NFHS_LANDMARK_MILES[2],
          })}
        </p>
        <p className="mt-1">{t('air.visibilityRecheck')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('oregonAir.conservativeHeading')}
        </h2>
        <p>{t('oregonAir.conservativeBody', { quote: OR_CONSERVATIVE_METRIC_QUOTE })}</p>
      </section>

      <section className="text-sm">
        <h2 className="display-num mb-2 text-2xl uppercase">{t('oregonAir.sourceHeading')}</h2>
        <p>{t('oregonAir.sourceBody')}</p>
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
      <AirDataSources withVisibilityQuote />
    </article>
  )
}
