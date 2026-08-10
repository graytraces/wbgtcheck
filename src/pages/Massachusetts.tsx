import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TriangleAlert, Trophy } from 'lucide-react'
import SEO from '../components/SEO'
import CorrectionNote from '../components/CorrectionNote'
import PolicyBandsTable from '../components/PolicyBandsTable'
import {
  MIAA,
  MIAA_DEVICE_QUOTE,
  MIAA_INDOOR_QUOTE,
  MIAA_COMPETITION_QUOTE,
  MIAA_COOLING_ZONE_WBGT_F,
} from '../data/policyOracle'

export default function Massachusetts() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="massachusetts" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">
          {t('massachusetts.pageTitle')}
        </h1>
        <p className="mt-3 text-lg">{t('massachusetts.intro')}</p>
      </header>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('massachusetts.tableHeading')}
        </h2>
        <PolicyBandsTable policy={MIAA} showSource={false} />
        <p className="mt-3 text-sm text-ink-muted">
          {t('massachusetts.boundaryNote', {
            low: MIAA.bands[4].sourceLabel,
            next: MIAA.bands[3].sourceLabel,
          })}
        </p>
      </section>

      <section className="border-2 border-flag-red bg-surface p-5">
        <h2 className="display-num mb-2 flex items-center gap-2 text-2xl uppercase">
          <TriangleAlert className="h-6 w-6 text-flag-red" aria-hidden="true" />
          {t('massachusetts.deviceHeading')}
        </h2>
        <p>{t('massachusetts.deviceBody', { quote: MIAA_DEVICE_QUOTE })}</p>
        <p className="mt-3">{t('massachusetts.indoorBody', { quote: MIAA_INDOOR_QUOTE })}</p>
        <p className="mt-3 font-bold">{t('massachusetts.deviceWarning')}</p>
      </section>

      {/* The one place the policy permits activity a practice reading would
          stop — quoted rather than paraphrased. */}
      <section className="border-2 border-line bg-surface p-5">
        <h2 className="display-num mb-2 flex items-center gap-2 text-2xl uppercase">
          <Trophy className="h-6 w-6" aria-hidden="true" />
          {t('massachusetts.competitionHeading')}
        </h2>
        <p>{t('massachusetts.competitionBody', { quote: MIAA_COMPETITION_QUOTE })}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('massachusetts.coolingHeading')}
        </h2>
        <p>{t('massachusetts.coolingBody', { wbgt: MIAA_COOLING_ZONE_WBGT_F })}</p>
      </section>

      <section className="text-sm text-ink-muted">
        <h2 className="font-bold uppercase tracking-wide">{t('massachusetts.sourceHeading')}</h2>
        <p className="mt-1">
          {t('massachusetts.sourceBody', { verifiedOn: MIAA.source.verifiedOn })}{' '}
          <a href={MIAA.source.url} target="_blank" rel="noopener noreferrer" className="underline">
            {MIAA.source.name}
          </a>
        </p>
        <p className="mt-2 text-xs">{t('common.footer.affiliation')}</p>
        <CorrectionNote topic="massachusetts" />
      </section>

      <Link
        to={`/${lang}`}
        className="inline-block bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('massachusetts.ctaButton')}
      </Link>
    </article>
  )
}
