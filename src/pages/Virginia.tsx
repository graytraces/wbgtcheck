import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import SEO from '../components/SEO'
import CorrectionNote from '../components/CorrectionNote'
import {
  VA_CANCEL_QUOTE,
  VA_CODE_CITATION,
  VA_CODE_SECTION,
  VA_CONSISTENCY_QUOTE,
  VA_ICE_WBGT_F,
  VA_MIN_TIERS,
  VA_STATUTE_SOURCE,
} from '../data/policyOracle'

export default function Virginia() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="virginia" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">{t('virginia.pageTitle')}</h1>
        <p className="mt-3 text-lg">{t('virginia.intro')}</p>
      </header>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('virginia.statuteHeading')}</h2>
        <p>
          {t('virginia.statuteBody', {
            section: VA_CODE_SECTION,
            citation: VA_CODE_CITATION,
          })}
        </p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('virginia.districtHeading')}</h2>
        <p>{t('virginia.districtBody', { cancel: VA_CANCEL_QUOTE })}</p>
        <p className="mt-2">{t('virginia.consistencyBody', { consistency: VA_CONSISTENCY_QUOTE })}</p>
        <p className="mt-2">{t('virginia.tiersBody', { tiers: VA_MIN_TIERS })}</p>
      </section>

      <section className="border-2 border-line bg-surface p-5">
        <h2 className="display-num mb-2 text-2xl uppercase">{t('virginia.iceHeading')}</h2>
        <p>{t('virginia.iceBody', { ice: VA_ICE_WBGT_F })}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('virginia.measurementHeading')}</h2>
        <p>{t('virginia.measurementBody')}</p>
        <p className="mt-2">{t('virginia.reportingBody')}</p>
      </section>

      <section className="flex items-start gap-3 border-2 border-flag-orange bg-surface p-5">
        <Info className="mt-0.5 h-6 w-6 shrink-0 text-flag-orange" aria-hidden="true" />
        <p className="font-semibold">{t('virginia.noTableNotice')}</p>
      </section>

      <section className="text-sm text-ink-muted">
        <h2 className="font-bold uppercase tracking-wide">{t('virginia.sourceHeading')}</h2>
        <p className="mt-1">
          {t('virginia.sourceBody', {
            section: VA_CODE_SECTION,
            verifiedOn: VA_STATUTE_SOURCE.verifiedOn,
          })}{' '}
          <a
            href={VA_STATUTE_SOURCE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {VA_STATUTE_SOURCE.name}
          </a>
        </p>
        <p className="mt-2 text-xs">{t('common.footer.affiliation')}</p>
        <CorrectionNote topic="virginia" />
      </section>

      <Link
        to={`/${lang}`}
        className="inline-block bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('virginia.ctaButton')}
      </Link>
    </article>
  )
}
