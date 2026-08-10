import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TriangleAlert, Scale } from 'lucide-react'
import SEO from '../components/SEO'
import CorrectionNote from '../components/CorrectionNote'
import {
  FL_STATUTE_SECTION,
  FL_STATUTE_CITATION,
  FL_ONSITE_MEASUREMENT_QUOTE,
  FL_MODIFY_QUOTE,
  FL_COOLING_ZONE_QUOTE,
  FL_EAP_QUOTE,
  FL_YEAR_ROUND_QUOTE,
  FL_TRAINING_QUOTE,
  FL_STATUTE_SOURCE,
} from '../data/policyOracle'

export default function Florida() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="florida" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">{t('florida.pageTitle')}</h1>
        <p className="mt-3 text-lg">{t('florida.intro')}</p>
      </header>

      <section>
        <h2 className="display-num mb-2 flex items-center gap-2 text-2xl uppercase">
          <Scale className="h-6 w-6" aria-hidden="true" />
          {t('florida.statuteHeading')}
        </h2>
        <p>
          {t('florida.statuteBody', {
            section: FL_STATUTE_SECTION,
            citation: FL_STATUTE_CITATION,
          })}
        </p>
        <p className="mt-2">{t('florida.modifyBody', { quote: FL_MODIFY_QUOTE })}</p>
        <p className="mt-2">{t('florida.yearRoundBody', { quote: FL_YEAR_ROUND_QUOTE })}</p>
      </section>

      {/* The measurement sentence is why this page exists: it decides whether
          a forecast can be the reading, and in Florida it cannot. */}
      <section className="border-2 border-flag-red bg-surface p-5">
        <h2 className="display-num mb-2 flex items-center gap-2 text-2xl uppercase">
          <TriangleAlert className="h-6 w-6 text-flag-red" aria-hidden="true" />
          {t('florida.measurementHeading')}
        </h2>
        <p>{t('florida.measurementBody', { quote: FL_ONSITE_MEASUREMENT_QUOTE })}</p>
        <p className="mt-3">{t('florida.wbgtNamingBody')}</p>
        <p className="mt-3 font-bold">{t('florida.deviceWarning')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('florida.coolingHeading')}</h2>
        <p>{t('florida.coolingBody', { quote: FL_COOLING_ZONE_QUOTE })}</p>
        <p className="mt-2">{t('florida.eapBody', { quote: FL_EAP_QUOTE })}</p>
        <p className="mt-2">{t('florida.trainingBody', { quote: FL_TRAINING_QUOTE })}</p>
      </section>

      {/* Saying plainly what is NOT on this page is the point — the numbers
          live in an FHSAA document we could not open. */}
      <section className="border-l-4 border-flag-orange pl-4">
        <h2 className="display-num mb-2 text-2xl uppercase">{t('florida.noTableHeading')}</h2>
        <p>{t('florida.noTableBody')}</p>
      </section>

      {/* Mirrors the North Carolina pattern: the page says why the picker
          cannot carry this state, so "MA is in it and Florida is not" is
          explained on screen rather than looking arbitrary. */}
      <section className="border-2 border-line bg-surface p-5">
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('florida.pickerExclusionHeading')}
        </h2>
        <p>{t('florida.pickerExclusionBody')}</p>
      </section>

      <section className="text-sm text-ink-muted">
        <h2 className="font-bold uppercase tracking-wide">{t('florida.sourceHeading')}</h2>
        <p className="mt-1">
          {t('florida.sourceBody', { verifiedOn: FL_STATUTE_SOURCE.verifiedOn })}{' '}
          <a
            href={FL_STATUTE_SOURCE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {FL_STATUTE_SOURCE.name}
          </a>
        </p>
        <p className="mt-2 text-xs">{t('common.footer.affiliation')}</p>
        <CorrectionNote topic="florida" />
      </section>

      <Link
        to={`/${lang}`}
        className="inline-block bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('florida.ctaButton')}
      </Link>
    </article>
  )
}
