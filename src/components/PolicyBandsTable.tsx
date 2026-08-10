import { useTranslation } from 'react-i18next'
import type { HeatPolicy } from '../data/policyOracle'
import { guidelineSentences } from '../utils/guidelineText'
import FlagBadge from './FlagBadge'
import { FLAG_TINT } from '../utils/flagStyles'

interface PolicyBandsTableProps {
  policy: HeatPolicy
  showSource?: boolean
  /** id of the heading that names this table, for screen-reader navigation. */
  labelledBy?: string
}

/**
 * The policy's band table, coolest band first, every number straight from the
 * policy oracle (sourceLabel is the range exactly as the association prints it).
 */
export default function PolicyBandsTable({
  policy,
  showSource = true,
  labelledBy,
}: PolicyBandsTableProps) {
  const { t } = useTranslation()
  const bands = [...policy.bands].reverse()
  return (
    <div>
      <div className="overflow-x-auto">
        {/* aria-labelledby so a page with more than one of these (California's
            three category ladders) does not announce "table, 2 columns" three
            identical times. */}
        <table className="w-full border-collapse text-sm" aria-labelledby={labelledBy}>
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="py-2 pr-3 font-bold uppercase tracking-wide">
                {t('verdict.wbgtLabel')} (°F)
              </th>
              <th className="py-2 font-bold uppercase tracking-wide">
                {t('texas.tableGuidelines')}
              </th>
            </tr>
          </thead>
          <tbody>
            {bands.map((band) => (
              <tr key={band.flag} className={`border-b border-line align-top ${FLAG_TINT[band.flag]}`}>
                {/* Row header, matching Kentucky's table: the range names the
                    row, it is not one of its values. */}
                <th scope="row" className="py-2 pl-2 pr-3 text-left font-normal">
                  <div className="flex flex-col items-start gap-1">
                    <FlagBadge flag={band.flag} />
                    <span className="display-num whitespace-nowrap text-lg">{band.sourceLabel}</span>
                  </div>
                </th>
                <td className="py-2 pr-2">
                  <ul className="list-inside list-disc space-y-0.5">
                    {guidelineSentences(band.flag, band.guideline, t).map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showSource && (
        <p className="mt-2 text-xs text-ink-muted">
          {t('policies.sourceLabel')}:{' '}
          <a href={policy.source.url} rel="noopener noreferrer" target="_blank" className="underline">
            {policy.source.name}
          </a>{' '}
          ({t('policies.verifiedOn', { date: policy.source.verifiedOn })})
        </p>
      )}
    </div>
  )
}
