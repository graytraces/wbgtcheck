import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Wind, Eye } from 'lucide-react'
import type { AqiPayload } from '../utils/airnow'
import type { ActivityId, AirPolicy } from '../data/airPolicyOracle'
import {
  ACTIVITY_IDS,
  AIR_AREA_FAR_KM,
  AIRNOW_PROGRAM_CREDIT,
  NFHS_LANDMARK_MILES,
  airActionFor,
  classifyAirBand,
  classifyAqi,
} from '../data/airPolicyOracle'
import { aqiSwatchFor } from '../utils/aqiStyles'
import { readingForPolicy, observationAge, type AirStatus } from '../hooks/useAirQuality'

const KM_PER_MILE = 1.609344

interface AirQualityGateProps {
  status: AirStatus
  data: AqiPayload | null
  /** Verified jurisdiction policy, or null → EPA category only. */
  policy: AirPolicy | null
  activity: ActivityId
  onActivityChange: (next: ActivityId) => void
  /** Slug of the matching state page, when one exists. */
  statePageSlug: string | null
  now: number
}

/**
 * The air gate, displayed ALONGSIDE the heat verdict — never merged with it.
 *
 * Two rules govern this component:
 *  1. It never reads a WBGT value. There is no code path where air quality
 *     changes the heat flag, in either direction.
 *  2. Outside WA/OR/CA it shows the EPA category and stops. A number with no
 *     verified policy behind it must not be dressed up as a verdict.
 */
export default function AirQualityGate({
  status,
  data,
  policy,
  activity,
  onActivityChange,
  statePageSlug,
  now,
}: AirQualityGateProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  if (status === 'idle') return null

  if (status === 'loading') {
    return (
      <section className="border-2 border-line bg-surface px-5 py-4 text-sm sm:px-8">
        <p className="text-ink-muted">{t('air.loading')}</p>
      </section>
    )
  }

  if (status === 'error' || data === null) {
    return (
      <section className="border-2 border-line bg-surface px-5 py-4 text-sm sm:px-8">
        <h2 className="display-num text-lg uppercase">{t('air.gateHeading')}</h2>
        <p className="mt-1 text-ink-muted">{t('air.loadFailed')}</p>
      </section>
    )
  }

  const reading = readingForPolicy(data, policy)
  const band = policy ? classifyAirBand(policy, reading.aqi) : null
  const action = band ? airActionFor(band, activity) : null
  const age = observationAge(data.observed.epochMs, now)
  const miles = Math.round(data.area.distanceKm / KM_PER_MILE)
  const far = data.area.distanceKm > AIR_AREA_FAR_KM
  // The WA table reads PM2.5 with no PM2.5 reported here: the overall AQI is
  // standing in, and the card must say so rather than pass it off.
  const pm25Fallback = policy?.indexBasis === 'pm25' && !data.pm25

  const agencies =
    data.agencies.length > 0 ? data.agencies.join(', ') : AIRNOW_PROGRAM_CREDIT

  // Both readings, each with the full three channels (swatch + number +
  // category name). The EPA headline category derives from the OVERALL AQI;
  // the policy band still reads the index the jurisdiction keys to (PM2.5 for
  // WA). The higher of the two is marked as governing.
  const chips =
    reading.basis === 'pm25' &&
    !(data.overall.parameter === 'PM2.5' && data.overall.aqi === reading.aqi)
      ? [
          {
            key: 'pm25',
            aqi: reading.aqi,
            category: classifyAqi(reading.aqi),
            name: reading.category,
            label: t('air.aqiBasisPm25'),
          },
          {
            key: 'overall',
            aqi: data.overall.aqi,
            category: classifyAqi(data.overall.aqi),
            name: data.overall.category,
            label: t('air.aqiBasisOverall', { pollutant: data.overall.parameter }),
          },
        ]
      : [
          {
            key: 'single',
            aqi: reading.aqi,
            category: classifyAqi(reading.aqi),
            name: reading.category,
            label:
              reading.basis === 'pm25'
                ? t('air.aqiBasisPm25')
                : t('air.aqiBasisOverall', { pollutant: reading.parameter }),
          },
        ]
  const governingAqi = Math.max(...chips.map((c) => c.aqi))

  // Outside WA/OR/CA this card has no verdict to give — it can only show an
  // EPA category. Spending most of a phone screen to say "no verified policy
  // for this state", directly between the heat verdict and the hourly view the
  // user came for, buys nothing. It collapses to a line that still carries the
  // number, and opens for the rest.
  const collapsed = policy === null

  const body = (
    <>
      {/* The co-display line: this is an additional gate, not a replacement
          for the heat flag above it. */}
      <p className="border-b-2 border-line bg-ink px-5 py-2 text-sm font-bold text-bg sm:px-8">
        {t('air.bothGatesNotice')}
      </p>

      <div className="px-5 py-4 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="display-num inline-flex items-center gap-2 text-lg uppercase">
            <Wind className="h-5 w-5" aria-hidden="true" />
            {t('air.gateHeading')}
          </h2>
          {/* Each reading: swatch + number + category name — three channels,
              never color alone. */}
          {chips.map((chip) => (
            <span key={chip.key} className="inline-flex flex-col">
              <span
                className="inline-flex items-baseline gap-2 px-3 py-1 font-bold"
                style={aqiSwatchFor(chip.category)}
              >
                <span className="display-num text-3xl leading-none">{chip.aqi}</span>
                <span className="text-sm uppercase tracking-wide">
                  {chip.category.sourceLabel}
                </span>
              </span>
              <span className="mt-0.5 text-xs font-semibold uppercase tracking-wide">
                {chip.name}
                {chips.length > 1 && chip.aqi === governingAqi && (
                  <span className="ml-1 bg-ink px-1 py-0.5 text-bg">
                    {t('air.governingLabel')}
                  </span>
                )}
              </span>
              <span className="text-xs text-ink-muted">{chip.label}</span>
            </span>
          ))}
        </div>

        {pm25Fallback && (
          <p className="mt-2 border-l-4 border-flag-orange pl-3 text-sm font-semibold">
            {t('air.pm25FallbackNotice')}
          </p>
        )}

        {policy?.variesByActivity && (
          <fieldset className="mt-3">
            <legend className="text-sm font-semibold">{t('air.activityLabel')}</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {ACTIVITY_IDS.map((id) => {
                const selected = activity === id
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onActivityChange(id as ActivityId)}
                    className={`min-h-11 border-2 px-3 py-1 text-left text-sm ${
                      selected
                        ? 'border-ink bg-ink font-bold text-bg'
                        : 'border-line text-ink-muted hover:border-ink hover:text-ink'
                    }`}
                  >
                    <span className="block font-semibold">{t(`air.activity.${id}`)}</span>
                    <span className="block text-xs opacity-80">
                      {t(`air.activityExample.${id}`)}
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        {policy ? (
          <div className="mt-3">
            <p className="text-base font-semibold">
              {action ? t(`air.actions.${action}`) : t('air.noActionStated')}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {t(`air.policyName.${policy.id}`)}
              {band?.sourceLabel ? ` · ${band.sourceLabel}` : ''}
              {band?.visibilityLabel ? ` · ${band.visibilityLabel}` : ''}
            </p>
            {statePageSlug && (
              <p className="mt-1 text-sm">
                <Link to={`/${lang}/${statePageSlug}`} className="font-semibold underline">
                  {t('air.sourceLabel')}: {policy.source.name}
                </Link>
              </p>
            )}
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-base font-semibold">{t('air.noPolicyHeading')}</p>
            <p className="mt-1 text-sm text-ink-muted">{t('air.noPolicyBody')}</p>
          </div>
        )}

        <p className="mt-3 text-sm">
          <span className="font-semibold">{t('air.areaLabel')}:</span>{' '}
          {t('air.areaBody', { area: `${data.area.name}, ${data.area.state}`, mi: miles })}
          {' · '}
          {t('air.observedAt', { time: `${data.observed.time} ${data.observed.timeZone}` })}
        </p>
        {far && (
          <p className="mt-1 border-l-4 border-current pl-3 text-sm font-semibold">
            {t('air.areaFarNotice', { mi: miles })}
          </p>
        )}
        {age === 'stale' && (
          <p className="mt-1 border-l-4 border-flag-red pl-3 text-sm font-semibold">
            {t('air.staleNotice', {
              time: `${data.observed.time} ${data.observed.timeZone}`,
            })}
          </p>
        )}
        {/* Distinct from stale: AirNow gave a stamp we could not place in
            time, so the reading's age is unknown rather than known-old. */}
        {age === 'unknown' && (
          <p className="mt-1 border-l-4 border-flag-red pl-3 text-sm font-semibold">
            {t('air.unknownAgeNotice')}
          </p>
        )}

        <details className="mt-3">
          <summary className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <Eye className="h-4 w-4" aria-hidden="true" />
            {t('air.visibilityHeading')}
          </summary>
          <p className="mt-1 text-sm">
            {t('air.visibilityBody', {
              near: NFHS_LANDMARK_MILES[0],
              mid: NFHS_LANDMARK_MILES[1],
              far: NFHS_LANDMARK_MILES[2],
            })}
          </p>
          <p className="mt-1 text-sm">{t('air.visibilityRecheck')}</p>
        </details>
      </div>

      {/* Opaque strip, mirroring the verdict card: the notices that must not
          be skimmed past get the high-contrast surface. */}
      <div className="space-y-1 bg-ink px-5 py-3 text-sm text-bg sm:px-8">
        <p className="font-semibold">{t('air.notClearance')}</p>
        <p>{t('air.indoorWarning')}</p>
        <p>{t('air.preliminaryNotice')}</p>
        <p className="opacity-90">{t('air.creditLabel', { agencies })}</p>
      </div>
    </>
  )

  if (!collapsed) {
    return (
      <section className="border-2 border-line bg-surface" aria-live="polite">
        {body}
      </section>
    )
  }

  const headline = chips.find((c) => c.aqi === governingAqi) ?? chips[0]
  return (
    <section className="border-2 border-line bg-surface" aria-live="polite">
      <details>
        <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 sm:px-8">
          <span className="display-num inline-flex items-center gap-2 text-lg uppercase">
            <Wind className="h-5 w-5" aria-hidden="true" />
            {t('air.gateHeading')}
          </span>
          {/* The number survives the collapse — swatch + value + category
              name, the same three channels the open card uses. */}
          <span
            className="inline-flex items-baseline gap-2 px-2 py-0.5 font-bold"
            style={aqiSwatchFor(headline.category)}
          >
            <span className="display-num text-xl leading-none">{headline.aqi}</span>
            <span className="text-xs uppercase tracking-wide">
              {headline.category.sourceLabel}
            </span>
          </span>
          <span className="text-sm text-ink-muted">{t('air.noPolicySummary')}</span>
        </summary>
        {body}
      </details>
    </section>
  )
}
