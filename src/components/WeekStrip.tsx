import { useTranslation } from 'react-i18next'
import type { DaySummary } from '../utils/verdict'
import FlagBadge from './FlagBadge'

interface WeekStripProps {
  days: DaySummary[]
}

export default function WeekStrip({ days }: WeekStripProps) {
  const { t, i18n } = useTranslation()
  if (days.length === 0) {
    return <p className="text-sm text-ink-muted">{t('verdict.noData')}</p>
  }
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" aria-label={t('verdict.weekHeading')}>
      {days.map((d) => {
        // Noon anchor keeps the weekday label immune to UTC/local drift.
        const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(
          new Date(`${d.date}T12:00:00`),
        )
        const dayNum = Number(d.date.slice(8, 10))
        return (
          <li key={d.date} className="border border-line bg-surface p-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold uppercase">{weekday}</span>
              <span className="text-xs text-ink-muted">{dayNum}</span>
            </div>
            {d.peak ? (
              <div className="mt-2 space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="display-num text-3xl">{Math.round(d.peak.wbgtF)}</span>
                  <span className="text-xs font-semibold text-ink-muted">
                    °F {t('verdict.peakLabel').toLowerCase()}
                    {d.peak.source === 'estimated' ? ' · EST' : ''}
                  </span>
                </div>
                <FlagBadge flag={d.peak.flag} />
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink-muted">{t('verdict.noData')}</p>
            )}
          </li>
        )
      })}
    </ol>
  )
}
