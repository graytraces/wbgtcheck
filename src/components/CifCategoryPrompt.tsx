import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'
import type { PolicyId } from '../data/policyOracle'
import {
  CIF_CATEGORIES,
  CIF_CATEGORY_ROSTER_FILE_URL,
  CIF_SPREAD_EXAMPLE_F,
  classifyWbgt,
} from '../data/policyOracle'
import { formatWbgtF } from '../utils/units'

interface CifCategoryPromptProps {
  onChoose: (id: PolicyId) => void
}

/**
 * California's version of the Texas class question, and the second time this
 * site has had to ask one.
 *
 * CIF publishes three WBGT ladders and assigns each school a region category
 * from a separate roster. Until 2026-08-11 the tool answered that by staying
 * out of California entirely and flagging a Californian against the general
 * NATA table — which is more permissive than all three CIF ladders, so the
 * "we cannot know" position was quietly the least safe one available.
 *
 * The Texas fix applies unchanged, and the reason it applies is that the
 * question is ANSWERABLE: CIF's roster is a real 28-page district list this
 * repo fetched and read, and the link below is the file itself rather than the
 * cifstate.org wrapper that answers 403 to anything but a browser. Where the
 * equivalent lookup is dead — New York — no prompt is offered at all, because
 * a question the reader cannot answer only relocates the guess.
 *
 * Three things this component must keep doing:
 *
 *  1. Render ABOVE the verdict. An unanswered category question must not sit
 *     under the flag it qualifies; that was the finding that produced the
 *     Texas prompt after a week of BLACK flags went to Austin.
 *  2. Say what is on screen in the meantime. The strict default (Category 1)
 *     stays in force until the reader answers, and the pending line says so,
 *     so a black flag reads as a placeholder rather than a finding.
 *  3. Say what the choice costs, from the oracle. The example reading and both
 *     flag names are computed here rather than written into copy, so the
 *     sentence cannot outlive the table it describes.
 */
export default function CifCategoryPrompt({ onChoose }: CifCategoryPromptProps) {
  const { t } = useTranslation()
  /**
   * The same reading in the strictest and the most permissive ladder. Read
   * through classifyWbgt — not off the printed labels — so the sentence names
   * the flag this site would actually put on the screen.
   */
  const strictest = CIF_CATEGORIES[0]
  const mostPermissive = CIF_CATEGORIES[CIF_CATEGORIES.length - 1]
  return (
    <section
      aria-labelledby="cif-category-heading"
      className="border-2 border-flag-orange bg-surface p-5"
    >
      <h2
        id="cif-category-heading"
        className="display-num flex items-center gap-2 text-xl uppercase"
      >
        <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />
        {t('policies.categoryPrompt.heading')}
      </h2>
      <p className="mt-2 text-sm">{t('policies.categoryPrompt.body')}</p>
      <p className="mt-2 text-sm font-semibold">
        {t('policies.categoryPrompt.spread', {
          value: formatWbgtF(CIF_SPREAD_EXAMPLE_F),
          strictCategory: strictest.categoryNumber,
          strictFlag: t(`flags.${classifyWbgt(strictest, CIF_SPREAD_EXAMPLE_F).flag}.label`),
          looseCategory: mostPermissive.categoryNumber,
          looseFlag: t(`flags.${classifyWbgt(mostPermissive, CIF_SPREAD_EXAMPLE_F).flag}.label`),
        })}
      </p>
      {/* The category named here IS the one defaultPolicyFor('CA') selects —
          both are "the first of CIF_CATEGORIES", which is the strict end.
          policyDefaults.test.ts pins the two together so this line cannot go
          on describing a default that moved. */}
      <p className="mt-2 text-sm font-semibold">
        {t('policies.categoryPrompt.pending', { category: strictest.categoryNumber })}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {CIF_CATEGORIES.map((policy, i) => (
          <button
            key={policy.id}
            type="button"
            onClick={() => onChoose(policy.id)}
            className={
              i === 0
                ? 'min-h-11 border-2 border-ink bg-ink px-4 font-bold uppercase tracking-wide text-bg hover:opacity-90'
                : 'min-h-11 border-2 border-ink bg-surface px-4 font-bold uppercase tracking-wide hover:bg-ink hover:text-bg'
            }
          >
            {t(`policies.${policy.id}`)}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm">
        <a
          href={CIF_CATEGORY_ROSTER_FILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline"
        >
          {t('policies.categoryPrompt.rosterLink')}
        </a>
      </p>
      {/* The half `remoteEstimatesAllowed` cannot carry. CIF's stance is 'yes'
          — it names an online WBGT reading for schools without a meter, which
          is why no device notice appears on a California card — but what it
          names is one NOAA page, not forecasts as a class, and this is not
          that page. Shown here and again in policies.caCategoryHint once the
          prompt is gone, so the caveat outlives the question. */}
      <p className="mt-3 text-sm font-semibold">{t('policies.categoryPrompt.sourceCaveat')}</p>
    </section>
  )
}
