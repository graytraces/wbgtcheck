import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'
import type { PolicyId } from '../data/policyOracle'
import { UIL_REGION_MAP_URL } from '../data/policyOracle'

interface UilClassPromptProps {
  onChoose: (id: PolicyId) => void
}

/**
 * Texas is the one state where the default is a guess with teeth.
 *
 * UIL publishes two threshold ladders and assigns them by county, but no
 * authoritative county→class list is available to us (README backlog), so the
 * site will not pick for the user. It defaults to the STRICTER Class 2 — which
 * at an Austin August forecast flags every day of the week black, i.e. "no
 * practice at all", where Class 3 (the ladder most of central and east Texas
 * is actually on) would cap practice at an hour. A week of black flags reads
 * as a finding, not as a placeholder, and the site's own guide says most of
 * that region is Class 3.
 *
 * So ask, once, above the verdict — the strict default stays in force until
 * the user answers, and the answer is remembered.
 */
export default function UilClassPrompt({ onChoose }: UilClassPromptProps) {
  const { t } = useTranslation()
  return (
    <section
      aria-labelledby="uil-class-heading"
      className="border-2 border-flag-orange bg-surface p-5"
    >
      <h2
        id="uil-class-heading"
        className="display-num flex items-center gap-2 text-xl uppercase"
      >
        <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />
        {t('policies.classPrompt.heading')}
      </h2>
      <p className="mt-2 text-sm">{t('policies.classPrompt.body')}</p>
      <p className="mt-2 text-sm font-semibold">{t('policies.classPrompt.pending')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChoose('uil-class-2')}
          className="min-h-11 border-2 border-ink bg-ink px-4 font-bold uppercase tracking-wide text-bg hover:opacity-90"
        >
          {t('policies.uil-class-2')}
        </button>
        <button
          type="button"
          onClick={() => onChoose('uil-class-3')}
          className="min-h-11 border-2 border-ink bg-surface px-4 font-bold uppercase tracking-wide hover:bg-ink hover:text-bg"
        >
          {t('policies.uil-class-3')}
        </button>
      </div>
      <p className="mt-3 text-sm">
        <a
          href={UIL_REGION_MAP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline"
        >
          {t('policies.classPrompt.mapLink')}
        </a>
      </p>
    </section>
  )
}
