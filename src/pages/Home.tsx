import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'
import SEO from '../components/SEO'
import LocationSetup from '../components/LocationSetup'
import PolicyPicker from '../components/PolicyPicker'
import UilClassPrompt from '../components/UilClassPrompt'
import VerdictCard from '../components/VerdictCard'
import TodayTimeline from '../components/TodayTimeline'
import WeekStrip from '../components/WeekStrip'
import PolicyBandsTable from '../components/PolicyBandsTable'
import ShareCardButton from '../components/ShareCardButton'
import AirQualityGate from '../components/AirQualityGate'
import WbgtLog from '../components/WbgtLog'
import InstallHint from '../components/InstallHint'
import { useWbgt, isStale } from '../hooks/useWbgt'
import { useAirQuality } from '../hooks/useAirQuality'
import { airPolicyForState } from '../data/airPolicyOracle'
import { airPageKeyByPolicy, pageSEO } from '../seo'
import { buildHourlySeries } from '../utils/nws'
import { annotateHours, groupByDay, currentVerdict, timelineHours } from '../utils/verdict'
import {
  UIL_READING_BEFORE_PRACTICE_MAX_MINUTES,
  UIL_READING_INTERVAL_MINUTES,
  UIL_APP_MEASUREMENT_QUOTE,
  GHSA_READING_INTERVAL_MINUTES,
  GHSA_READING_LEAD_MINUTES,
  GHSA_CALIBRATION_INTERVAL_YEARS,
  REMOTE_UNDERESTIMATE_MIN_C,
  REMOTE_UNDERESTIMATE_MAX_C,
} from '../data/policyOracle'

interface HomeSection {
  heading: string
  body: string
}

export default function Home() {
  const { t, i18n } = useTranslation()
  const {
    location,
    policy,
    policyId,
    uilClassChosen,
    status,
    data,
    fetchedAt,
    errorKey,
    setZip,
    useMyLocation,
    setPolicyId,
    clearLocation,
    refetch,
  } = useWbgt()

  const timeZone =
    data?.location.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'America/Chicago'

  const days = useMemo(() => {
    if (!data) return []
    const points = buildHourlySeries(data)
    return groupByDay(annotateHours(points, policy, timeZone))
  }, [data, policy, timeZone])

  // Minute tick: without it a tab left open keeps showing the verdict for the
  // hour it was rendered in — the current-hour selection and the staleness
  // check below must track real time.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const stale = isStale(fetchedAt, now)
  const today = days[0] ?? null
  const allHours = useMemo(() => days.flatMap((d) => d.hours), [days])
  const current = useMemo(() => currentVerdict(allHours, now), [allHours, now])

  const busy = status === 'locating' || status === 'loading'
  const lang = i18n.language
  const sections = t('home.sections', { returnObjects: true }) as HomeSection[]

  // Air axis. Deliberately a separate hook and a separate card: the AQI never
  // feeds into `policy`, `days`, or `current` above, so it cannot move a heat
  // flag in either direction.
  const {
    status: airStatus,
    data: airData,
    activity,
    setActivity,
    refetch: refetchAir,
  } = useAirQuality(location?.lat ?? null, location?.lon ?? null)
  const airPolicy = airPolicyForState(location?.stateAbbr ?? null)
  const airPageKey = airPolicy ? airPageKeyByPolicy[airPolicy.id] : undefined
  const airPageSlug = airPageKey ? pageSEO[airPageKey].path : null

  return (
    <div className="space-y-8">
      <SEO pageKey="home" />

      {/* sr-only: the keyword H1 stays first in the DOM for SEO/H1-sync while
          the verdict (or the location CTA) owns the visual top of the page. */}
      <header>
        <h1 className="sr-only">{t('home.pageTitle')}</h1>
        <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">
          {t('home.heroBadge')}
        </p>
      </header>

      {!location && (
        <>
          <LocationSetup onZip={setZip} onGeolocate={useMyLocation} busy={busy} errorKey={errorKey} />
          <div className="max-w-sm">
            <PolicyPicker value={policyId} onChange={setPolicyId} />
          </div>
        </>
      )}

      {/* Above the verdict, not below the picker: until this is answered every
          Texas verdict on the page is the stricter Class 2 guess. */}
      {location?.stateAbbr === 'TX' && !uilClassChosen && (
        <UilClassPrompt onChoose={setPolicyId} />
      )}

      {location && status === 'error' && (
        <div className="border-2 border-flag-red bg-surface p-5">
          <p className="font-semibold">{t(errorKey ?? 'common.error')}</p>
          <button type="button" onClick={clearLocation} className="mt-2 underline">
            {t('location.change')}
          </button>
        </div>
      )}

      {location && busy && (
        <div className="border-2 border-line bg-surface p-8 text-center">
          <span className="display-num text-3xl uppercase text-ink-muted">{t('common.loading')}</span>
        </div>
      )}

      {location && status === 'ready' && stale && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-flag-red bg-surface p-4">
          <p className="font-semibold">
            {t('verdict.staleNotice', {
              time: new Intl.DateTimeFormat(i18n.language, {
                hour: 'numeric',
                minute: '2-digit',
              }).format(new Date(fetchedAt ?? now)),
            })}
          </p>
          <button
            type="button"
            onClick={() => {
              refetch()
              refetchAir()
            }}
            className="inline-flex min-h-11 items-center gap-2 bg-ink px-4 font-bold uppercase tracking-wide text-bg hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('verdict.refresh')}
          </button>
        </div>
      )}

      {location && status === 'ready' && current && (
        <VerdictCard
          hour={current}
          policy={policy}
          locationLabel={location.label}
          stateAbbr={location.stateAbbr}
          timeZone={timeZone}
          fetchedAt={fetchedAt}
        />
      )}

      {location && status === 'ready' && !current && (
        <div className="border-2 border-line bg-surface p-5">
          <p>{t('verdict.noData')}</p>
        </div>
      )}

      {/* "One screen for the morning call": the question is whether practice
          can run at 4pm, so the hourly and weekly views follow the verdict
          immediately. They used to sit below the air card, the picker, two
          paragraphs of prose and the share button — about two and a half
          screens down on a phone. */}
      {location && status === 'ready' && today && (
        <section>
          <h2 className="display-num mb-2 text-xl uppercase">{t('verdict.todayHeading')}</h2>
          <TodayTimeline hours={timelineHours(today)} currentTime={now} />
        </section>
      )}

      {location && status === 'ready' && days.length > 1 && (
        <section>
          <h2 className="display-num mb-2 text-xl uppercase">{t('verdict.weekHeading')}</h2>
          <WeekStrip days={days} />
        </section>
      )}

      {/* A second gate of equal standing — see air.bothGatesNotice. It
          collapses itself to one line in states with no verified air policy
          (AirQualityGate), where it has no verdict to give. */}
      {location && airStatus !== 'idle' && (
        <AirQualityGate
          status={airStatus}
          data={airData}
          policy={airPolicy}
          activity={activity}
          onActivityChange={setActivity}
          statePageSlug={airPageSlug}
          now={now}
        />
      )}

      {location && status === 'ready' && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="max-w-xs">
                <PolicyPicker value={policyId} onChange={setPolicyId} />
              </div>
              <button
                type="button"
                onClick={clearLocation}
                className="inline-flex min-h-11 items-center border-2 border-line px-4 text-sm font-semibold text-ink-muted hover:text-ink"
              >
                {t('location.change')}
              </button>
            </div>
            {today && (
              <ShareCardButton day={today} policy={policy} locationLabel={location.label} />
            )}
          </div>
          {/* Once the class is chosen the prompt above is gone, so this is the
              reminder that the choice is a region call and is changeable. */}
          {location.stateAbbr === 'TX' && policyId.startsWith('uil') && uilClassChosen && (
            <p className="max-w-2xl border-l-4 border-flag-orange pl-3 text-sm font-semibold">
              {t('policies.txClassHint')}
            </p>
          )}
          <p className="max-w-2xl text-sm text-ink-muted">{t('policies.districtNote')}</p>
        </div>
      )}

      {location && status === 'ready' && (
        <WbgtLog
          currentWbgtF={current ? current.wbgtF : null}
          policy={policy}
          policyId={policyId}
          locationLabel={location.label}
        />
      )}

      <section>
        <details open>
          <summary className="display-num cursor-pointer text-xl uppercase">
            {t('verdict.boundariesHeading', { policy: t(`policies.${policyId}`) })}
          </summary>
          <p className="mb-2 mt-1 text-sm text-ink-muted">{t('verdict.boundariesNote')}</p>
          <PolicyBandsTable policy={policy} />
        </details>
      </section>

      <section className="space-y-1 border-l-4 border-ink pl-4 text-sm">
        <h2 className="font-bold uppercase tracking-wide">{t('verdict.measurementRules')}</h2>
        <p className="text-ink-muted">{t('verdict.dataResolutionNote')}</p>
        {policyId.startsWith('uil') && (
          <>
            <p>
              {t('measurement.uilTiming', {
                before: UIL_READING_BEFORE_PRACTICE_MAX_MINUTES,
                interval: UIL_READING_INTERVAL_MINUTES,
              })}
            </p>
            <p>{t('measurement.uilApps', { quote: UIL_APP_MEASUREMENT_QUOTE })}</p>
          </>
        )}
        {policyId === 'ghsa' && (
          <>
            <p>
              {t('measurement.ghsaTiming', {
                interval: GHSA_READING_INTERVAL_MINUTES,
                lead: GHSA_READING_LEAD_MINUTES,
              })}
            </p>
            <p>{t('measurement.ghsaCalibration', { years: GHSA_CALIBRATION_INTERVAL_YEARS })}</p>
          </>
        )}
        {policyId === 'generic' && <p>{t('states.caveat')}</p>}
      </section>

      <section className="max-w-3xl space-y-5">
        <p className="text-base">{t('home.intro')}</p>
        {sections.map((_, i) => (
          // Indexed t() calls: i18next does not interpolate inside
          // returnObjects trees, and the bias numbers must come from the
          // oracle constants.
          <div key={t(`home.sections.${i}.heading`)}>
            <h2 className="display-num mb-1 text-xl uppercase">{t(`home.sections.${i}.heading`)}</h2>
            <p className="text-ink-muted">
              {t(`home.sections.${i}.body`, {
                min: REMOTE_UNDERESTIMATE_MIN_C,
                max: REMOTE_UNDERESTIMATE_MAX_C,
              })}
            </p>
          </div>
        ))}
        <p className="text-sm">
          <Link to={`/${lang}/states`} className="mr-4 font-semibold underline">
            {t('common.nav.states')}
          </Link>
          <Link to={`/${lang}/texas`} className="mr-4 font-semibold underline">
            {t('common.nav.texas')}
          </Link>
          <Link to={`/${lang}/georgia`} className="mr-4 font-semibold underline">
            {t('common.nav.georgia')}
          </Link>
          <Link to={`/${lang}/wbgt-vs-heat-index`} className="mr-4 font-semibold underline">
            {t('common.nav.wbgtVsHeatIndex')}
          </Link>
          <Link to={`/${lang}/washington-air-quality`} className="mr-4 font-semibold underline">
            {t('common.nav.washingtonAir')}
          </Link>
          <Link to={`/${lang}/oregon-air-quality`} className="mr-4 font-semibold underline">
            {t('common.nav.oregonAir')}
          </Link>
          <Link to={`/${lang}/california-air-quality`} className="font-semibold underline">
            {t('common.nav.californiaAir')}
          </Link>
        </p>
      </section>

      <InstallHint />
    </div>
  )
}
