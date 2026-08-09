import { useTranslation } from 'react-i18next'
import type { HeatPolicy } from '../data/policyOracle'
import { guidelineSentences } from '../utils/guidelineText'
import FlagBadge from './FlagBadge'
import { FLAG_TINT } from '../utils/flagStyles'

interface PolicyBandsTableProps {
  policy: HeatPolicy
  showSource?: boolean
}

/**
 * The policy's band table, coolest band first, every number straight from the
 * policy oracle (sourceLabel is the range exactly as the association prints it).
 */
export default function PolicyBandsTable({ policy, showSource = true }: PolicyBandsTableProps) {
  const { t } = useTranslation()
  const bands = [...policy.bands].reverse()
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
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
                <td className="py-2 pl-2 pr-3">
                  <div className="flex flex-col items-start gap-1">
                    <FlagBadge flag={band.flag} />
                    <span className="display-num whitespace-nowrap text-lg">{band.sourceLabel}</span>
                  </div>
                </td>
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
