import { useTranslation } from 'react-i18next'
import {
  AIRNOW_SOURCE,
  EPA_AQI_SOURCE,
  NFHS_AIR_SOURCE,
  NFHS_531_QUOTE,
} from '../data/airPolicyOracle'

interface AirDataSourcesProps {
  /** Include the NFHS 5-3-1 quotation (pages that show the method). */
  withVisibilityQuote?: boolean
}

/**
 * Shared attribution block for the air-quality guides.
 *
 * The AirNow Data Exchange Guidelines require credit to the reporting agencies
 * and the EPA AirNow program; the per-reading agency credit lives on the
 * verdict card, and this block carries the program-level and specification
 * sources that are the same on every page.
 */
export default function AirDataSources({ withVisibilityQuote = false }: AirDataSourcesProps) {
  const { t } = useTranslation()
  const sources = [AIRNOW_SOURCE, EPA_AQI_SOURCE, NFHS_AIR_SOURCE]

  return (
    <section className="text-sm">
      <h2 className="display-num mb-2 text-2xl uppercase">{t('air.dataSourcesHeading')}</h2>
      <p>{t('air.dataSourcesBody')}</p>
      {withVisibilityQuote && (
        <blockquote className="mt-2 border-l-4 border-ink pl-4 text-ink-muted">
          {NFHS_531_QUOTE}
        </blockquote>
      )}
      <ul className="mt-2 space-y-1">
        {sources.map((s) => (
          <li key={s.url}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              {s.name}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
