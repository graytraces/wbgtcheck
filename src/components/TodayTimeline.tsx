import { useTranslation } from 'react-i18next'
import type { HourVerdict } from '../utils/verdict'
import { FLAG_ICON, FLAG_SOLID } from '../utils/flagStyles'
import { cn } from '../lib/utils'
import { formatWbgtF } from '../utils/units'

interface TodayTimelineProps {
  hours: HourVerdict[]
  currentTime?: number
}

function hourLabel(h: number): string {
  if (h === 0) return '12a'
  if (h < 12) return `${h}a`
  if (h === 12) return '12p'
  return `${h - 12}p`
}

export default function TodayTimeline({ hours, currentTime }: TodayTimelineProps) {
  const { t } = useTranslation()
  if (hours.length === 0) {
    return <p className="text-sm text-ink-muted">{t('verdict.noData')}</p>
  }
  return (
    // Right-edge fade signals the horizontal scroller — a full morning view
    // is 16 chips (~1000 px) and the overflow is otherwise invisible.
    <div className="relative -mx-4">
      <ol className="flex gap-1 overflow-x-auto px-4 pb-2" aria-label={t('verdict.todayHeading')}>
      {hours.map((h) => {
        const Icon = FLAG_ICON[h.flag]
        const isNow = currentTime !== undefined && h.time === Math.floor(currentTime / 3600_000) * 3600_000
        return (
          <li key={h.time} className="flex min-w-16 flex-col items-center gap-1">
            <span className={cn('text-xs font-semibold', isNow ? 'text-ink' : 'text-ink-muted')}>
              {hourLabel(h.localHour)}
            </span>
            <span
              className={cn(
                // `relative` is load-bearing: the sr-only label below is
                // position:absolute, and without a containing block here it
                // resolves against the outer wrapper, escaping this list's
                // overflow-x clip and adding the scroller's full content
                // width to the document (the sweep catches it at 320px).
                'relative flex w-full flex-col items-center gap-0.5 py-2',
                FLAG_SOLID[h.flag],
                isNow && 'ring-2 ring-ink ring-offset-2 ring-offset-bg',
              )}
              title={`${formatWbgtF(h.wbgtF)} °F — ${t(`flags.${h.flag}.name`)}${h.source === 'estimated' ? ` (${t('verdict.estimatedBadge')})` : ''}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {/* The chip is too narrow for a visible flag word, but the icon
                  is aria-hidden and `title` is unreliable for screen readers
                  and unreachable on touch — without this an hour announces as
                  a bare number. Every other flag surface (FlagBadge,
                  WeekStrip, share canvas) carries the label outright. */}
              <span className="sr-only">{t(`flags.${h.flag}.name`)}</span>
              <span className="display-num text-lg">{formatWbgtF(h.wbgtF)}</span>
              {h.source === 'estimated' && (
                <span className="text-[9px] font-bold leading-none" aria-label={t('verdict.estimatedBadge')}>
                  EST
                </span>
              )}
            </span>
          </li>
        )
      })}
      </ol>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-bg to-transparent"
        aria-hidden="true"
      />
    </div>
  )
}
