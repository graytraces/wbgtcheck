import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SEO from '../components/SEO'
import LocationSetup from '../components/LocationSetup'
import PolicyPicker from '../components/PolicyPicker'
import VerdictCard from '../components/VerdictCard'
import TodayTimeline from '../components/TodayTimeline'
import WeekStrip from '../components/WeekStrip'
import PolicyBandsTable from '../components/PolicyBandsTable'
import ShareCardButton from '../components/ShareCardButton'
import { useWbgt } from '../hooks/useWbgt'
import { buildHourlySeries } from '../utils/nws'
import { annotateHours, groupByDay, currentVerdict, timelineHours } from '../utils/verdict'
import {
  UIL_READING_BEFORE_PRACTICE_MAX_MINUTES,
  UIL_READING_INTERVAL_MINUTES,
  UIL_APP_MEASUREMENT_QUOTE,
  GHSA_READING_INTERVAL_MINUTES,
  GHSA_READING_LEAD_MINUTES,
  GHSA_CALIBRATION_INTERVAL_YEARS,
} from '../data/policyOracle'

interface HomeSection {
  heading: string
  body: string
}

export default function Home() {
  const { t, i18n } = useTranslation()
  const { location, policy, policyId, status, data, errorKey, setZip, useMyLocation, setPolicyId, clearLocation } =
    useWbgt()

  const timeZone =
    data?.location.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'America/Chicago'

  const days = useMemo(() => {
    if (!data) return []
    const points = buildHourlySeries(data)
    return groupByDay(annotateHours(points, policy, timeZone))
  }, [data, policy, timeZone])

  const now = Date.now()
  const today = days[0] ?? null
  const allHours = useMemo(() => days.flatMap((d) => d.hours), [days])
  const current = useMemo(() => currentVerdict(allHours, now), [allHours, now])

  const busy = status === 'locating' || status === 'loading'
  const lang = i18n.language
  const sections = t('home.sections', { returnObjects: true }) as HomeSection[]

  return (
    <div className="space-y-8">
      <SEO pageKey="home" />

      {/* sr-only: the keyword H1 stays first in the DOM for SEO/H1-sync while
          the verdict (or the location CTA) owns the visual top of the page. */}
      <header>
        <h1 className="sr-only">{t('home.pageTitle')}</h1>
      </header>

      {!location && (
        <>
          <LocationSetup onZip={setZip} onGeolocate={useMyLocation} busy={busy} errorKey={errorKey} />
          <div className="max-w-sm">
            <PolicyPicker value={policyId} onChange={setPolicyId} />
          </div>
        </>
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

      {location && status === 'ready' && current && (
        <VerdictCard
          hour={current}
          policy={policy}
          locationLabel={location.label}
          stateAbbr={location.stateAbbr}
          timeZone={timeZone}
        />
      )}

      {location && status === 'ready' && !current && (
        <div className="border-2 border-line bg-surface p-5">
          <p>{t('verdict.noData')}</p>
        </div>
      )}

      {location && status === 'ready' && (
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
      )}

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
        {sections.map((s) => (
          <div key={s.heading}>
            <h2 className="display-num mb-1 text-xl uppercase">{s.heading}</h2>
            <p className="text-ink-muted">{s.body}</p>
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
          <Link to={`/${lang}/wbgt-vs-heat-index`} className="font-semibold underline">
            {t('common.nav.wbgtVsHeatIndex')}
          </Link>
        </p>
      </section>
    </div>
  )
}
