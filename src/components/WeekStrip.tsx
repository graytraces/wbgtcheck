import { useTranslation } from 'react-i18next'
import { timelineHours, type DaySummary } from '../utils/verdict'
import FlagBadge from './FlagBadge'
import { cn } from '../lib/utils'
import { formatWbgtF } from '../utils/units'

interface WeekStripProps {
  days: DaySummary[]
  /** Date currently shown by the hourly strip, so the week can mark it. */
  selectedDate?: string
  /** Omit to render the week as a static summary (no drill-down). */
  onSelect?: (date: string) => void
  /** id of the hourly view these buttons drive. */
  controls?: string
}

/**
 * A day cell shows one flag: the day's PEAK. That is the right summary and the
 * wrong stopping point — a band director scheduling a 5-to-8pm rehearsal sees
 * Monday's 3pm peak of BLACK and has no way to learn that the evening is
 * amber. Tapping a day retargets the hourly strip, which is the same forecast
 * data already loaded, so this is a view change and not a new request.
 */
export default function WeekStrip({ days, selectedDate, onSelect, controls }: WeekStripProps) {
  const { t, i18n } = useTranslation()
  if (days.length === 0) {
    return <p className="text-sm text-ink-muted">{t('verdict.noData')}</p>
  }
  return (
    <ol
      className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"
      aria-label={t('verdict.weekHeading')}
    >
      {days.map((d, index) => {
        /**
         * Today's cell stops being a control once the strip has nothing left
         * to draw. The default view already falls forward to tomorrow at that
         * hour, but tapping "today" walked straight back into the empty panel
         * — the cell advertised hours it could not show, and its own sr-only
         * label promised they were "shown hour by hour above".
         */
        const isToday = index === 0
        const drillable = timelineHours(d).length > 0
        // Noon anchor keeps the weekday label immune to UTC/local drift.
        const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(
          new Date(`${d.date}T12:00:00`),
        )
        const dayNum = Number(d.date.slice(8, 10))
        const selected = d.date === selectedDate
        const inner = (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold uppercase">{weekday}</span>
              <span className="text-xs text-ink-muted">{dayNum}</span>
            </div>
            {d.peak ? (
              <div className="mt-2 space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="display-num text-3xl">{formatWbgtF(d.peak.wbgtF)}</span>
                  <span className="text-xs font-semibold text-ink-muted">
                    °F {isToday ? t('verdict.peakRestLabel') : t('verdict.peakLabel').toLowerCase()}
                    {d.peak.source === 'estimated' ? ' · EST' : ''}
                  </span>
                </div>
                <FlagBadge flag={d.peak.flag} />
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink-muted">{t('verdict.noData')}</p>
            )}
          </>
        )
        return (
          <li
            key={d.date}
            className={cn(
              'border bg-surface',
              selected && onSelect ? 'border-ink ring-2 ring-ink' : 'border-line',
            )}
          >
            {onSelect && drillable ? (
              <button
                type="button"
                onClick={() => onSelect(d.date)}
                aria-pressed={selected}
                aria-controls={controls}
                className="block w-full p-2 text-left hover:opacity-80"
              >
                {inner}
                <span className="sr-only">
                  {selected ? t('verdict.dayShown') : t('verdict.dayShowHours')}
                </span>
              </button>
            ) : (
              <div className="p-2">
                {inner}
                {onSelect && !drillable && (
                  <p className="mt-1 text-xs text-ink-muted">{t('verdict.dayNoHoursLeft')}</p>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
