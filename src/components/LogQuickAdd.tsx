import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardList } from 'lucide-react'
import { useWbgtLog } from '../hooks/useWbgtLog'
import { classifyWbgt, type HeatPolicy, type PolicyId } from '../data/policyOracle'
import { trackWbgtLogSave } from '../utils/analytics'
import { formatWbgtF } from '../utils/units'

interface LogQuickAddProps {
  currentWbgtF: number
  policy: HeatPolicy
  policyId: PolicyId
  locationLabel: string
}

/**
 * "Record this reading", next to the reading.
 *
 * After the hourly and weekly strips moved up, the reading log sits about 2.5
 * screens down at 390px — fine as a place to review the record, useless as the
 * place to START one, since a coach logging every 30 minutes is looking at the
 * verdict card, not scrolling for a form. This is the entry point; the full
 * history stays where it is, one tap away through the link.
 *
 * The write goes through the same useWbgtLog hook, whose listener set keeps
 * this button and the log below it showing the same rows.
 */
export default function LogQuickAdd({
  currentWbgtF,
  policy,
  policyId,
  locationLabel,
}: LogQuickAddProps) {
  const { t } = useTranslation()
  const { entries, addEntry } = useWbgtLog()
  const [saved, setSaved] = useState(false)
  const [failed, setFailed] = useState(false)

  const save = () => {
    const { persisted } = addEntry({
      wbgtF: Math.round(currentWbgtF * 10) / 10,
      source: 'forecast',
      flagKey: `flags.${classifyWbgt(policy, currentWbgtF).flag}.label`,
      policyKey: `policies.${policyId}`,
      locationLabel,
    })
    trackWbgtLogSave('forecast')
    setFailed(!persisted)
    if (persisted) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <button
        type="button"
        onClick={save}
        className="inline-flex min-h-11 items-center gap-2 border-2 border-ink px-3 font-bold uppercase tracking-wide hover:bg-ink hover:text-bg"
      >
        <ClipboardList className="h-4 w-4" aria-hidden="true" />
        {saved
          ? t('wbgtLog.savedToast')
          : t('wbgtLog.quickAdd', { value: formatWbgtF(currentWbgtF) })}
      </button>
      {entries.length > 0 && (
        /* Bare fragment, not a router link: scrolls within the page instead
           of re-navigating the SPA to the route it is already on. */
        <a href="#wbgt-log" className="font-semibold underline">
          {t('wbgtLog.quickAddSeeAll', { count: entries.length })}
        </a>
      )}
      {failed && (
        <p role="alert" className="w-full border-l-4 border-flag-red pl-3 font-semibold">
          {t('wbgtLog.saveFailedNote')}
        </p>
      )}
    </div>
  )
}
