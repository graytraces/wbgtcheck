import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CircleCheck, CircleSlash } from 'lucide-react'
import SEO from '../components/SEO'
import CorrectionNote from '../components/CorrectionNote'
import FlagBadge from '../components/FlagBadge'
import {
  BAND_COVERAGE,
  IOWA_BAND_ROWS,
  type BandCoverageKind,
  UIL_MANDATE_2026_QUOTE,
  UIL_BAND_HEADING_QUOTE,
  UIL_BAND_COOLING_ZONE_QUOTE,
  UIL_BAND_PRACTICE_DEFINITION_QUOTE,
  IOWA_APPENDIX_C_SCOPE_QUOTE,
  IOWA_BAND_ROW_HEADING_QUOTE,
  IOWA_BAND_FOOTNOTE_SOURCE,
  NCHSAA_ALL_SPORTS_HEADING_QUOTE,
  NCHSAA_CHEER_JURISDICTION_QUOTE,
  FL_TRAINING_QUOTE,
} from '../data/policyOracle'
import { GUIDE_SLUG_BY_ABBR } from '../data/guideRegistry'
import { cn } from '../lib/utils'

/**
 * "Does your state's heat rule cover marching band?"
 *
 * A band director has none of the support an athletic trainer has, and until
 * this page the only way to answer the question on this site was to read all
 * twelve state guides. Two states wrote marching band into the rule; in the
 * other ten the heat policy is an athletics document.
 *
 * ⚠️ Every 'athletics-only' row is a claim about a document that was READ, not
 * about a word search that came back empty. Three of these twelve documents
 * hide table content inside images or vector paths where an extractor returns
 * a confident zero — NYSPHSAA's chart is an embedded image, Iowa's page 2 is
 * drawn as paths, and TSSAA's text is behind a custom font encoding that
 * extracts as mojibake. All three were rendered and read. The register is
 * oregonAir.belowRangeBody's: a silent document is not a clearance.
 */

const COVERAGE_STYLE: Record<
  BandCoverageKind,
  { icon: typeof CircleCheck; cls: string; labelKey: string }
> = {
  named: {
    icon: CircleCheck,
    cls: 'bg-tint-green text-ink',
    labelKey: 'marchingBand.coverageNamed',
  },
  'athletics-only': {
    icon: CircleSlash,
    cls: 'bg-tint-black text-ink',
    labelKey: 'marchingBand.coverageAthleticsOnly',
  },
}

/** Icon + colour + words, never colour alone. */
function CoverageBadge({ coverage }: { coverage: BandCoverageKind }) {
  const { t } = useTranslation()
  const style = COVERAGE_STYLE[coverage]
  const Icon = style.icon
  return (
    <span
      className={cn(
        'inline-flex items-start gap-1.5 px-2 py-0.5 text-xs font-bold uppercase',
        style.cls,
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="[overflow-wrap:anywhere]">{t(style.labelKey)}</span>
    </span>
  )
}

export default function MarchingBand() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="marchingBand" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">
          {t('marchingBand.pageTitle')}
        </h1>
        <p className="mt-3 text-lg">{t('marchingBand.intro')}</p>
      </header>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase" id="band-table-heading">
          {t('marchingBand.tableHeading')}
        </h2>
        {/* Two columns: the scope sentences are far too long for a third
            column at 320px, and no table outside /states may scroll. */}
        <table className="w-full border-collapse text-sm" aria-labelledby="band-table-heading">
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="py-2 pr-3 text-xs font-bold uppercase sm:text-sm sm:tracking-wide">
                {t('marchingBand.colState')}
              </th>
              <th className="py-2 text-xs font-bold uppercase sm:text-sm sm:tracking-wide">
                {t('marchingBand.colCoverage')}
              </th>
            </tr>
          </thead>
          <tbody>
            {BAND_COVERAGE.map((row) => (
              <tr key={row.abbr} className="border-b border-line align-top">
                <th scope="row" className="display-num py-2 pr-3 text-left text-xl font-normal">
                  {GUIDE_SLUG_BY_ABBR[row.abbr] ? (
                    <Link to={`/${lang}/${GUIDE_SLUG_BY_ABBR[row.abbr]}`} className="underline">
                      {row.abbr}
                    </Link>
                  ) : (
                    row.abbr
                  )}
                </th>
                <td className="py-2">
                  <CoverageBadge coverage={row.coverage} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('marchingBand.namedHeading')}</h2>
        <p>{t('marchingBand.namedBody')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('marchingBand.texasHeading')}</h2>
        <p>
          {t('marchingBand.texasBody', {
            mandate: UIL_MANDATE_2026_QUOTE,
            heading: UIL_BAND_HEADING_QUOTE,
          })}
        </p>
        <p className="mt-2">
          {t('marchingBand.texasCoolingBody', { cooling: UIL_BAND_COOLING_ZONE_QUOTE })}
        </p>
        <p className="mt-2">
          {t('marchingBand.texasDefinitionBody', {
            definition: UIL_BAND_PRACTICE_DEFINITION_QUOTE,
          })}
        </p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('marchingBand.iowaHeading')}</h2>
        <p>{t('marchingBand.iowaBody')}</p>
        <p className="mt-2">
          {t('marchingBand.iowaSameBandsBody', { scope: IOWA_APPENDIX_C_SCOPE_QUOTE })}
        </p>

        <h3 className="mt-4 mb-2 font-bold uppercase tracking-wide" id="iowa-band-table-heading">
          {t('marchingBand.iowaRowsHeading', { heading: IOWA_BAND_ROW_HEADING_QUOTE })}
        </h3>
        {/* The WBGT ranges are Appendix C's own labels; the flag beside each
            one is the athletics band it shares, which is the point — Iowa
            wrote different ACTIONS at the bands it already had, not a second
            ladder. Flag is colour + icon + text via FlagBadge. */}
        <table
          className="w-full border-collapse text-sm"
          aria-labelledby="iowa-band-table-heading"
        >
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="py-2 pr-3 text-xs font-bold uppercase sm:text-sm sm:tracking-wide">
                {t('marchingBand.iowaColBand')}
              </th>
              <th className="py-2 text-xs font-bold uppercase sm:text-sm sm:tracking-wide">
                {t('marchingBand.iowaColAction')}
              </th>
            </tr>
          </thead>
          <tbody>
            {IOWA_BAND_ROWS.map((row) => (
              <tr key={row.flag} className="border-b border-line align-top">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  <FlagBadge flag={row.flag} />
                  <span className="mt-1 block text-xs [overflow-wrap:anywhere]">
                    {row.sourceLabel}
                  </span>
                </th>
                <td className="py-2 [overflow-wrap:anywhere]">{row.quote}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-sm text-ink-muted">{t('marchingBand.iowaBelowBody')}</p>
        <p className="mt-2 text-sm">
          <a href={IOWA_BAND_FOOTNOTE_SOURCE.url} className="underline hover:text-ink">
            {IOWA_BAND_FOOTNOTE_SOURCE.name}
          </a>
        </p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('marchingBand.elsewhereHeading')}
        </h2>
        <p>{t('marchingBand.elsewhereBody')}</p>
        <p className="mt-2 font-semibold">{t('marchingBand.silenceNote')}</p>
      </section>

      {/* The two places where "athletics only" alone would lose the half of
          the document that helps somebody. */}
      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">
          {t('marchingBand.northCarolinaHeading')}
        </h2>
        <p>
          {t('marchingBand.northCarolinaBody', {
            scope: NCHSAA_ALL_SPORTS_HEADING_QUOTE,
            cheer: NCHSAA_CHEER_JURISDICTION_QUOTE,
          })}
        </p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('marchingBand.floridaHeading')}</h2>
        <p>{t('marchingBand.floridaBody', { training: FL_TRAINING_QUOTE })}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('marchingBand.districtHeading')}</h2>
        <p>{t('marchingBand.districtBody')}</p>
        <p className="mt-2 font-semibold">{t('marchingBand.districtNote')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('marchingBand.sourcesHeading')}</h2>
        <p className="text-sm text-ink-muted">{t('marchingBand.sourcesBody')}</p>
        <ul className="mt-2 space-y-1 text-sm">
          {BAND_COVERAGE.map((row) => (
            <li key={row.abbr} className="[overflow-wrap:anywhere]">
              <span className="font-bold">{row.abbr}</span>{' '}
              <a href={row.source.url} className="underline hover:text-ink">
                {row.source.name}
              </a>{' '}
              <span className="text-ink-muted">
                ({t('marchingBand.verifiedOnLabel')} {row.source.verifiedOn})
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink-muted">{t('common.footer.affiliation')}</p>
        <CorrectionNote topic="marching-band" />
      </section>

      <Link
        to={`/${lang}`}
        className="inline-block bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('marchingBand.ctaButton')}
      </Link>
    </article>
  )
}
