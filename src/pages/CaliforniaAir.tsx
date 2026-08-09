import { useTranslation } from 'react-i18next'
import SEO from '../components/SEO'
import AirDataSources from '../components/AirDataSources'
import {
  CA_AIR_POLICY,
  CA_RULE_QUOTE,
  CA_READING_SOURCE_QUOTE,
  CA_REFRAIN_AT_OR_ABOVE_AQI,
  NFHS_LANDMARK_MILES,
  classifyAqi,
} from '../data/airPolicyOracle'
import { aqiSwatchFor } from '../utils/aqiStyles'

export default function CaliforniaAir() {
  const { t } = useTranslation()
  const policy = CA_AIR_POLICY
  const category = classifyAqi(CA_REFRAIN_AT_OR_ABOVE_AQI)

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="californiaAir" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">
          {t('californiaAir.pageTitle')}
        </h1>
        <p className="mt-3 text-lg">{t('californiaAir.intro')}</p>
      </header>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('californiaAir.ruleHeading')}</h2>
        <p
          className="inline-block px-3 py-2 text-lg font-bold"
          style={aqiSwatchFor(category)}
        >
          {t('air.tableAqi')} {CA_REFRAIN_AT_OR_ABOVE_AQI}+ · {category.sourceLabel}
        </p>
        <blockquote className="mt-3 border-l-4 border-ink pl-4">
          {t('californiaAir.ruleBody', { quote: CA_RULE_QUOTE })}
        </blockquote>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('californiaAir.readingsHeading')}
        </h2>
        <blockquote className="border-l-4 border-ink pl-4">
          {t('californiaAir.readingsBody', { quote: CA_READING_SOURCE_QUOTE })}
        </blockquote>
        <p className="mt-2">{t('californiaAir.readingsNote')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('californiaAir.belowHeading')}</h2>
        <p>{t('californiaAir.belowBody')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('air.visibilityHeading')}</h2>
        <p>
          {t('air.visibilityBody', {
            near: NFHS_LANDMARK_MILES[0],
            mid: NFHS_LANDMARK_MILES[1],
            far: NFHS_LANDMARK_MILES[2],
          })}
        </p>
        <p className="mt-1">{t('air.visibilityRecheck')}</p>
      </section>

      <section className="text-sm">
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('californiaAir.sourceHeading')}
        </h2>
        <p>{t('californiaAir.sourceBody')}</p>
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
