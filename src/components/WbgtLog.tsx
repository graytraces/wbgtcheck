import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardList, Printer } from 'lucide-react'
import { useWbgtLog, type WbgtLogEntry } from '../hooks/useWbgtLog'
import { classifyWbgt, type HeatPolicy, type PolicyId } from '../data/policyOracle'
import { trackWbgtLogSave } from '../utils/analytics'
import {
  UIL_READING_BEFORE_PRACTICE_MAX_MINUTES,
  UIL_READING_INTERVAL_MINUTES,
} from '../data/policyOracle'
import { formatWbgtF } from '../utils/units'

interface WbgtLogProps {
  /** Currently displayed forecast estimate, or null when none. */
  currentWbgtF: number | null
  policy: HeatPolicy
  policyId: PolicyId
  locationLabel: string
}

/** Sanity bounds for the manual field — input validation, not policy data. */
const ONSITE_MIN_F = 10
const ONSITE_MAX_F = 130

/**
 * Translates a stored i18n key only if it still exists, so rows written by
 * an older build never render a raw key (pooldose resolver pattern).
 */
function useKeyResolver() {
  const { t, i18n } = useTranslation()
  return (key: string | undefined): string | null => {
    if (!key) return null
    return i18n.getResource('en', 'translation', key) ? t(key) : null
  }
}

function LogRow({ entry, onRemove }: { entry: WbgtLogEntry; onRemove: (id: string) => void }) {
  const { t, i18n } = useTranslation()
  const resolve = useKeyResolver()
  const when = new Date(entry.timestamp).toLocaleString(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const flagLabel = resolve(entry.flagKey)
  const policyLabel = resolve(entry.policyKey)

  return (
    <li className="flex items-start justify-between gap-3 border-t border-line py-2 first:border-t-0">
      <div className="min-w-0">
        <p className="text-sm">
          <span className="display-num text-lg">{formatWbgtF(entry.wbgtF)}</span> °F
          {flagLabel && <span className="ml-2 font-bold uppercase">{flagLabel}</span>}
          <span className="ml-2 text-xs font-bold uppercase tracking-wide text-ink-muted">
            {t(entry.source === 'onsite' ? 'wbgtLog.sourceOnsite' : 'wbgtLog.sourceForecast')}
          </span>
        </p>
        <p className="text-xs text-ink-muted">
          {when}
          {policyLabel && ` · ${policyLabel}`}
          {entry.locationLabel && ` · ${entry.locationLabel}`}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(entry.id)}
        aria-label={t('wbgtLog.delete')}
        className="print:hidden shrink-0 px-2 py-1 text-sm text-ink-muted hover:text-ink"
      >
        ×
      </button>
    </li>
  )
}

/**
 * The 30-minute reading log. Every entry names its source — a forecast
 * estimate is never presentable as an on-site reading — and the on-site
 * field exists exactly because device-only states need real meter values
 * in the record. Print goes through a body class so @media print in
 * index.css can isolate this section for a paper submission.
 */
export default function WbgtLog({ currentWbgtF, policy, policyId, locationLabel }: WbgtLogProps) {
  const { t, i18n } = useTranslation()
  const { entries, addEntry, removeEntry, clearAll } = useWbgtLog()
  const [onsiteRaw, setOnsiteRaw] = useState('')
  const [savedTick, setSavedTick] = useState(0)
  // Sticky, unlike the toast: a reading that did not reach storage is gone
  // when the tab closes, and the user needs to know that after the toast
  // would have faded.
  const [saveFailed, setSaveFailed] = useState(false)
  const [confirmingClear, setConfirmingClear] = useState(false)

  const onsiteValue = Number(onsiteRaw)
  const onsiteValid =
    onsiteRaw.trim() !== '' &&
    Number.isFinite(onsiteValue) &&
    onsiteValue >= ONSITE_MIN_F &&
    onsiteValue <= ONSITE_MAX_F

  const save = (wbgtF: number, source: 'forecast' | 'onsite') => {
    const { persisted } = addEntry({
      wbgtF: Math.round(wbgtF * 10) / 10,
      source,
      flagKey: `flags.${classifyWbgt(policy, wbgtF).flag}.label`,
      policyKey: `policies.${policyId}`,
      locationLabel,
    })
    trackWbgtLogSave(source)
    setSaveFailed(!persisted)
    if (persisted) {
      setSavedTick((n) => n + 1)
      setTimeout(() => setSavedTick(0), 2000)
    }
  }

  // Oldest→newest span of what is on the sheet. Entries are newest-first.
  const printRange = (() => {
    if (entries.length === 0) return ''
    const fmt = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' })
    const newest = fmt.format(new Date(entries[0].timestamp))
    const oldest = fmt.format(new Date(entries[entries.length - 1].timestamp))
    return oldest === newest ? newest : `${oldest} – ${newest}`
  })()

  const printLog = () => {
    document.body.classList.add('print-wbgt-log')
    const cleanup = () => {
      document.body.classList.remove('print-wbgt-log')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.print()
  }

  return (
    <section id="wbgt-log">
      <h2 className="display-num mb-2 flex items-center gap-2 text-xl uppercase">
        <ClipboardList className="print:hidden h-5 w-5" aria-hidden="true" />
        {t('wbgtLog.heading')}
      </h2>
      <p className="text-sm text-ink-muted">{t('wbgtLog.intro')}</p>
      <p className="mt-1 text-sm text-ink-muted">
        {t('wbgtLog.cadenceHint', {
          before: UIL_READING_BEFORE_PRACTICE_MAX_MINUTES,
          interval: UIL_READING_INTERVAL_MINUTES,
        })}
      </p>

      {/* Sticky, unlike the toast: the reading is on screen but not in
          storage, and that stops being true only when the tab closes. */}
      {saveFailed && (
        <p
          role="alert"
          className="print:hidden mt-2 border-l-4 border-flag-red pl-3 text-sm font-semibold"
        >
          {t('wbgtLog.saveFailedNote')}
        </p>
      )}

      <div className="print:hidden mt-3 flex flex-wrap items-end gap-3">
        {currentWbgtF !== null && (
          <button
            type="button"
            onClick={() => save(currentWbgtF, 'forecast')}
            className="inline-flex min-h-11 items-center bg-ink px-4 font-bold uppercase tracking-wide text-bg hover:opacity-90"
          >
            {savedTick > 0
              ? t('wbgtLog.savedToast')
              : t('wbgtLog.saveForecast', { value: formatWbgtF(currentWbgtF) })}
          </button>
        )}
        <div>
          <label htmlFor="wbgt-log-onsite" className="block text-xs font-bold uppercase tracking-wide">
            {t('wbgtLog.onsiteLabel')}
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="wbgt-log-onsite"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={ONSITE_MIN_F}
              max={ONSITE_MAX_F}
              value={onsiteRaw}
              onChange={(e) => setOnsiteRaw(e.target.value)}
              className="w-24 border-2 border-line bg-bg px-2 py-2 text-sm"
            />
            <button
              type="button"
              disabled={!onsiteValid}
              onClick={() => {
                save(onsiteValue, 'onsite')
                setOnsiteRaw('')
              }}
              className="inline-flex min-h-11 items-center border-2 border-ink px-3 text-sm font-bold uppercase tracking-wide disabled:opacity-40"
            >
              {t('wbgtLog.onsiteButton')}
            </button>
          </div>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="mt-4">
          {/* Print-only identification line. On screen the location and dates
              are obvious from context; on a sheet handed to an athletic
              director they are the first thing missing. */}
          <p className="hidden text-sm font-semibold print:block">
            {t('wbgtLog.printHeader', {
              location: locationLabel,
              range: printRange,
            })}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wide">
              {t('wbgtLog.historyTitle')} ({entries.length})
            </h3>
            <button
              type="button"
              onClick={printLog}
              className="print:hidden inline-flex items-center gap-1.5 text-sm font-semibold underline hover:text-ink"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              {t('wbgtLog.printButton')}
            </button>
          </div>
          <ul className="mt-2" aria-label={t('wbgtLog.historyTitle')}>
            {entries.map((entry) => (
              <LogRow key={entry.id} entry={entry} onRemove={removeEntry} />
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-muted">{t('wbgtLog.storageNote')}</p>
          <div className="print:hidden mt-2">
            {confirmingClear ? (
              <span className="text-xs">
                {t('wbgtLog.clearConfirm')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    clearAll()
                    setConfirmingClear(false)
                  }}
                  className="font-bold underline"
                >
                  {t('wbgtLog.clearAll')}
                </button>{' '}
                <button type="button" onClick={() => setConfirmingClear(false)} className="underline">
                  {t('wbgtLog.cancel')}
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingClear(true)}
                className="text-xs text-ink-muted underline hover:text-ink"
              >
                {t('wbgtLog.clearAll')}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
