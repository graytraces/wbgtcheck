import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'
import type { HeatPolicy } from '../data/policyOracle'
import { classifyWbgt, nextBandBoundary, BORDERLINE_MARGIN_F } from '../data/policyOracle'
import type { HourVerdict } from '../utils/verdict'
import { guidelineSentences } from '../utils/guidelineText'
import { FLAG_ICON, FLAG_SOLID } from '../utils/flagStyles'
import { trackVerdictView } from '../utils/analytics'
import { cn } from '../lib/utils'

interface VerdictCardProps {
  hour: HourVerdict
  policy: HeatPolicy
  locationLabel: string
  stateAbbr: string | null
  timeZone: string
}

export default function VerdictCard({
  hour,
  policy,
  locationLabel,
  stateAbbr,
  timeZone,
}: VerdictCardProps) {
  const { t, i18n } = useTranslation()
  const band = classifyWbgt(policy, hour.wbgtF)
  const Icon = FLAG_ICON[band.flag]
  const sentences = guidelineSentences(band.flag, band.guideline, t)
  const boundary = nextBandBoundary(policy, band)
  const nextBandFlag =
    boundary !== null ? policy.bands[policy.bands.indexOf(band) - 1]?.flag : null

  useEffect(() => {
    trackVerdictView(stateAbbr ?? 'unknown', band.flag)
  }, [stateAbbr, band.flag])

  const timeLabel = new Intl.DateTimeFormat(i18n.language, {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(hour.time))

  // ring-line keeps the card's edge visible when the flag surface nearly
  // matches the page background (black flag on dark mode: CR ~1.1).
  return (
    <section className={cn('overflow-hidden ring-1 ring-line', FLAG_SOLID[band.flag])} aria-live="polite">
      <div className="px-5 pb-6 pt-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold uppercase tracking-wider opacity-90">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {locationLabel}
          </span>
          <span>
            {t('verdict.nowHeading')} · {t('verdict.atTime', { time: timeLabel })}
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="display-num text-[6.5rem] leading-none sm:text-[8.5rem]">
                {Math.round(hour.wbgtF)}
              </span>
              <span className="display-num text-3xl sm:text-4xl">°F</span>
            </div>
            <div className="mt-1 text-sm font-semibold uppercase tracking-widest opacity-90">
              {t('verdict.wbgtLabel')}
              {' · '}
              {hour.source === 'estimated' ? (
                <span className="rounded-sm bg-white px-1.5 py-0.5 text-[#101418]">
                  {t('verdict.estimatedBadge')}
                </span>
              ) : (
                t('verdict.nwsBadge')
              )}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <Icon className="h-16 w-16 sm:h-20 sm:w-20" strokeWidth={2} aria-hidden="true" />
            <span className="display-num text-2xl uppercase sm:text-3xl">
              {t(`flags.${band.flag}.label`)}
            </span>
          </div>
        </div>

        <ul className="mt-4 max-w-2xl space-y-1 text-base font-medium sm:text-lg">
          {sentences.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>

        {hour.source === 'estimated' && (
          <p className="mt-3 max-w-2xl text-sm opacity-90">{t('verdict.estimatedExplain')}</p>
        )}

        {hour.borderline && nextBandFlag && (
          <p className="mt-3 max-w-2xl border-l-4 border-current pl-3 text-sm font-bold">
            {t('verdict.borderlineNotice', {
              margin: BORDERLINE_MARGIN_F,
              nextFlag: t(`flags.${nextBandFlag}.label`),
            })}
          </p>
        )}
      </div>

      {/* Opaque neutral strip: the safety notices were the least readable
          text on the card as a translucent overlay (CR 2.9-4.1 measured). */}
      <div className="space-y-1 bg-ink px-5 py-3 text-sm text-bg sm:px-8">
        <p className="font-semibold">{t('verdict.conservativeNotice')}</p>
        <p>{t('verdict.verifyOnsite')}</p>
        {policy.remoteEstimatesAllowed === 'device-required' && (
          <p className="font-bold">
            {t('verdict.deviceOnlyNotice', { body: policy.source.name.split(' ')[0] })}
          </p>
        )}
      </div>
    </section>
  )
}
