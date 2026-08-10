import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'
import type { HeatPolicy } from '../data/policyOracle'
import {
  classifyWbgt,
  nextBandBoundary,
  requiresOnSiteReading,
  BORDERLINE_MARGIN_F,
  REMOTE_UNDERESTIMATE_MIN_C,
  REMOTE_UNDERESTIMATE_MAX_C,
} from '../data/policyOracle'
import type { HourVerdict } from '../utils/verdict'
import { guidelineSentences } from '../utils/guidelineText'
import { FLAG_ICON, FLAG_SOLID } from '../utils/flagStyles'
import { trackVerdictView } from '../utils/analytics'
import { cn } from '../lib/utils'
import { displayedWbgtF, formatWbgtF } from '../utils/units'

interface VerdictCardProps {
  hour: HourVerdict
  policy: HeatPolicy
  locationLabel: string
  stateAbbr: string | null
  timeZone: string
  /** Epoch ms when the forecast payload was fetched — shown as "as of". */
  fetchedAt?: number | null
  /** Opens the inline location editor. The label says WHERE this reading is;
      the way to change it belongs next to it, not 3.4 screens down. */
  onChangeLocation?: () => void
  /**
   * The hottest hour still ahead today (see restOfDayPeak). Rendered as one
   * line under the big number, and only when it is a DIFFERENT hour — when the
   * current hour is already the peak, the headline is the peak.
   */
  peakAhead?: HourVerdict | null
}

export default function VerdictCard({
  hour,
  policy,
  locationLabel,
  stateAbbr,
  timeZone,
  fetchedAt = null,
  onChangeLocation,
  peakAhead = null,
}: VerdictCardProps) {
  const { t, i18n } = useTranslation()
  // The flag comes from the number this card prints, not from the float behind
  // it — see displayedWbgtF. annotateHours already snaps the series, and this
  // repeats it so the card cannot contradict itself for a caller that does not.
  const shownF = displayedWbgtF(hour.wbgtF)
  const band = classifyWbgt(policy, shownF)
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

  /**
   * The peak line. Shown only when the hottest hour left today is a different
   * hour from the one on the card — otherwise the big number already IS the
   * peak and the line would repeat it.
   *
   * Triple-coded like every other flag surface: the peak band's colour, its
   * icon, and its label spelled out in the sentence.
   */
  const showPeak = peakAhead !== null && peakAhead.time !== hour.time
  const PeakIcon = peakAhead ? FLAG_ICON[peakAhead.flag] : null
  const peakTimeLabel = peakAhead
    ? new Intl.DateTimeFormat(i18n.language, { timeZone, hour: 'numeric' }).format(
        new Date(peakAhead.time),
      )
    : ''

  // ring-line keeps the card's edge visible when the flag surface nearly
  // matches the page background (black flag on dark mode: CR ~1.1).
  return (
    // No aria-live on the section. It wraps a dozen sentences including the
    // permanent safety strip, so changing the policy re-announced all of it.
    // The live region is narrowed below to what actually changes: the reading
    // and its flag.
    <section className={cn('overflow-hidden ring-1 ring-line', FLAG_SOLID[band.flag])}>
      <div className="px-5 pb-6 pt-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold uppercase tracking-wider opacity-90">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {locationLabel}
            {onChangeLocation && (
              <button
                type="button"
                onClick={onChangeLocation}
                className="ml-1 underline decoration-dotted underline-offset-2 hover:no-underline"
              >
                {t('location.change')}
              </button>
            )}
          </span>
          <span>
            {t('verdict.nowHeading')} · {t('verdict.atTime', { time: timeLabel })}
            {fetchedAt !== null && (
              <>
                {' · '}
                {t('verdict.asOf', {
                  // Same zone as the reading beside it. Without this the card
                  // showed two clock times two hours apart when the forecast
                  // was for another state — the away-game case.
                  time: new Intl.DateTimeFormat(i18n.language, {
                    timeZone,
                    hour: 'numeric',
                    minute: '2-digit',
                  }).format(new Date(fetchedAt)),
                })}
              </>
            )}
          </span>
        </div>

        {/* The live region: reading + flag, the two things a policy or hour
            change actually alters. */}
        <div className="mt-3 flex items-end justify-between gap-4" aria-live="polite">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="display-num text-[6.5rem] leading-none sm:text-[8.5rem]">
                {formatWbgtF(shownF)}
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
              {' · '}
              {/* Which rule produced this flag. The card said where, when and
                  how the reading was obtained and never whose ladder it was
                  read against — while the PNG it exports has always printed
                  "Georgia GHSA" in its footer. A coach justifying a decision
                  to an administrator had nothing on screen naming the rule
                  applied, and in a state with no verified policy that screen
                  is a NATA fallback that looks exactly like a mandate.
                  Same t() key the share card uses, so the two cannot drift. */}
              {t(`policies.${policy.id}`)}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <Icon className="h-16 w-16 sm:h-20 sm:w-20" strokeWidth={2} aria-hidden="true" />
            <span className="display-num text-2xl uppercase sm:text-3xl">
              {t(`flags.${band.flag}.label`)}
            </span>
          </div>
        </div>

        {/* Directly under the number, because it answers the question the
            number does not: the reader is standing on the field at 8am
            deciding about 4pm. The peak hour is 1.7-2.5 screens down inside a
            scroller that shows 5 of 14 hours on a phone. */}
        {showPeak && peakAhead && PeakIcon && (
          <p className="mt-3">
            <a
              href="#hourly-view"
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 text-base font-bold ring-1 ring-current sm:text-lg',
                FLAG_SOLID[peakAhead.flag],
              )}
            >
              <PeakIcon className="h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
              <span>
                {t('verdict.peakAhead', {
                  value: formatWbgtF(peakAhead.wbgtF),
                  flag: t(`flags.${peakAhead.flag}.label`),
                  time: peakTimeLabel,
                })}
              </span>
            </a>
          </p>
        )}

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
        <p className="font-semibold">
          {t('verdict.conservativeNotice', {
            min: REMOTE_UNDERESTIMATE_MIN_C,
            max: REMOTE_UNDERESTIMATE_MAX_C,
          })}
        </p>
        <p>{t('verdict.verifyOnsite')}</p>
        <p>{t('verdict.surfaceNotice')}</p>
        {policy.id === 'generic' && <p>{t('verdict.genericRegionNotice')}</p>}
        {requiresOnSiteReading(policy) && (
          <p className="font-bold">
            {t(
              policy.remoteEstimatesAllowed === 'device-required'
                ? 'verdict.deviceOnlyNotice'
                : 'verdict.deviceRecommendedNotice',
              { body: policy.source.name.split(' ')[0] },
            )}
          </p>
        )}
      </div>
    </section>
  )
}
