import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Music, TriangleAlert } from 'lucide-react'
import SEO from '../components/SEO'
import CorrectionNote from '../components/CorrectionNote'
import PolicyBandsTable from '../components/PolicyBandsTable'
import {
  IOWA_ACCLIMATIZE_DEVICE_MAX_MINUTES,
  IOWA_ACCLIMATIZE_DEVICE_MIN_MINUTES,
  IOWA_AMBIENT_TRIGGER_F,
  IOWA_APP_QUOTE,
  IOWA_CATEGORY_2,
  IOWA_CATEGORY_NUMBER,
  IOWA_DEVICE_HEIGHT_FEET,
  IOWA_READING_INTERVAL_MINUTES,
  IOWA_RECOMMENDED_QUOTE,
} from '../data/policyOracle'

export default function Iowa() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="iowa" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">{t('iowa.pageTitle')}</h1>
        <p className="mt-3 text-lg">{t('iowa.intro')}</p>
      </header>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('iowa.recommendedHeading')}</h2>
        <p>{t('iowa.recommendedBody', { recommended: IOWA_RECOMMENDED_QUOTE })}</p>
        <p className="mt-2">{t('iowa.categoryBody', { category: IOWA_CATEGORY_NUMBER })}</p>
        <p className="mt-2 font-semibold">
          {t('iowa.triggerNote', { trigger: IOWA_AMBIENT_TRIGGER_F })}
        </p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('iowa.tableHeading')}</h2>
        <PolicyBandsTable policy={IOWA_CATEGORY_2} showSource={false} />
        <p className="mt-3 text-sm text-ink-muted">
          {t('iowa.boundaryNote', {
            tableLow: IOWA_CATEGORY_2.bands[4].sourceLabel,
            tableNext: IOWA_CATEGORY_2.bands[3].sourceLabel,
          })}
        </p>
      </section>

      <section className="border-2 border-flag-orange bg-surface p-5">
        <h2 className="display-num mb-2 flex items-center gap-2 text-2xl uppercase">
          <TriangleAlert className="h-6 w-6 text-flag-orange" aria-hidden="true" />
          {t('iowa.appsHeading')}
        </h2>
        <p>{t('iowa.appsBody', { apps: IOWA_APP_QUOTE })}</p>
        {/* Iowa recommends rather than mandates, so this says so plainly
            instead of borrowing GHSA's compliance language. */}
        <p className="mt-3 font-bold">{t('iowa.deviceWarning')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('iowa.measurementHeading')}</h2>
        <p>
          {t('iowa.measurementBody', {
            accMin: IOWA_ACCLIMATIZE_DEVICE_MIN_MINUTES,
            accMax: IOWA_ACCLIMATIZE_DEVICE_MAX_MINUTES,
            height: IOWA_DEVICE_HEIGHT_FEET,
            interval: IOWA_READING_INTERVAL_MINUTES,
          })}
        </p>
      </section>

      <section className="border-2 border-line bg-surface p-5">
        <h2 className="display-num mb-2 flex items-center gap-2 text-2xl uppercase">
          <Music className="h-6 w-6" aria-hidden="true" />
          {t('iowa.bandHeading')}
        </h2>
        <p>{t('iowa.bandBody')}</p>
      </section>

      <section className="text-sm text-ink-muted">
        <h2 className="font-bold uppercase tracking-wide">{t('iowa.sourceHeading')}</h2>
        <p className="mt-1">
          {t('iowa.sourceBody', { verifiedOn: IOWA_CATEGORY_2.source.verifiedOn })}{' '}
          <a
            href={IOWA_CATEGORY_2.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {IOWA_CATEGORY_2.source.name}
          </a>
        </p>
        <p className="mt-2 text-xs">{t('common.footer.affiliation')}</p>
        <CorrectionNote topic="iowa" />
      </section>

      <Link
        to={`/${lang}`}
        className="inline-block bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('iowa.ctaButton')}
      </Link>
    </article>
  )
}
