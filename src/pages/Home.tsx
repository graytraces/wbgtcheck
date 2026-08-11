import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'
import SEO from '../components/SEO'
import LocationSetup from '../components/LocationSetup'
import PolicyPicker from '../components/PolicyPicker'
import UilClassPrompt from '../components/UilClassPrompt'
import CifCategoryPrompt from '../components/CifCategoryPrompt'
import VerdictCard from '../components/VerdictCard'
import LogQuickAdd from '../components/LogQuickAdd'
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
import {
  airPageKeyByPolicy,
  pageSEO,
  statePageKeyByPolicy,
  pickerLadderPageKeys,
} from '../seo'
import { STATE_GUIDES, TOPIC_GUIDES } from '../data/guideRegistry'
import { feedbackMailto } from '../utils/feedback'
import { priorVisitCount } from '../utils/analytics'
import { buildHourlySeries } from '../utils/nws'
import {
  annotateHours,
  groupByDay,
  currentVerdict,
  timelineHours,
  pickTimelineDay,
  restOfDayPeak,
  nextDayPeak,
} from '../utils/verdict'
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

/**
 * Which prose section is ABOUT a topic guide, and which one.
 *
 * The two newest pages had exactly one route in — /states — and the home page
 * argued for both of them without linking either. `home.sections[2]` says
 * "UIL's 2026-27 standard names marching band alongside athletics";
 * `home.sections[3]` says "Texas UIL explicitly accepts internet-based
 * readings; Georgia GHSA requires a calibrated on-site instrument", which is
 * /forecast-or-device's entire subject.
 *
 * Keyed by seoKey off the registry rather than by slug, so the URL, the label
 * and the prerendered hub cannot drift apart. The link is a sibling of the
 * paragraph rather than markup inside the string because prerender.mjs escapes
 * these strings into HTML — tags in the copy would print as tags there.
 */
const SECTION_TOPIC_GUIDE: Record<number, string | undefined> = {
  2: 'marchingBand',
  3: 'forecastOrDevice',
}

/**
 * The page that tells a reader in an unverified state what to ask their
 * association for. The verdict card links it too, but only when the policy on
 * screen requires an on-site reading — and the NATA fallback an uncovered
 * state gets answers 'unspecified', so that link is never on an Ohio screen.
 */
const MEASUREMENT_GUIDE = TOPIC_GUIDES.find((guide) => guide.seoKey === 'forecastOrDevice')

export default function Home() {
  const { t, i18n } = useTranslation()
  const {
    location,
    policy,
    policyId,
    uilClassChosen,
    cifCategoryChosen,
    status,
    data,
    fetchedAt,
    errorKey,
    setZip,
    useMyLocation: geolocate,
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

  // Which day the hourly strip is showing. The week strip shows one flag per
  // day — its PEAK — which is the right summary and the wrong place to stop:
  // "Monday is black" and "Monday is black at 3pm but amber by 6" are
  // different decisions. Same forecast data, so this is a view change.
  /**
   * Changing location used to mean scrolling 3.4 screens to a button that
   * cleared everything and left the reader where they stood — looking at a
   * wall of prose, with the new ZIP field 1.35 screens ABOVE them. The label
   * saying where you are sits at the top of the verdict; the way to change it
   * now sits beside it, and the old button opens the same editor rather than
   * wiping the verdict first.
   *
   * LocationSetup already had a `compact` prop for this and no caller.
   */
  /**
   * Has this browser reached a verdict before today's load?
   *
   * Frozen at first render on purpose: `trackVerdictView` records THIS visit a
   * moment later, and a live read would flip mid-session and show the
   * add-to-home-screen hint to a first-time reader — the exact audience it is
   * wrong for.
   */
  const [returningReader] = useState(() => priorVisitCount() >= 1)

  const [changingLocation, setChangingLocation] = useState(false)
  const locationEditorRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!changingLocation) return
    locationEditorRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    // Focus after the scroll is queued so the field is both visible and typed
    // into — the previous flow left focus wherever the reader had been.
    const input = document.getElementById('zip-input') as HTMLInputElement | null
    input?.focus()
  }, [changingLocation])

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  // The rule lives in utils/verdict so it can be tested without a clock:
  // see pickTimelineDay for why today is not always the answer.
  const selectedDay = useMemo(
    () => pickTimelineDay(days, selectedDate),
    [days, selectedDate],
  )
  const allHours = useMemo(() => days.flatMap((d) => d.hours), [days])
  const current = useMemo(() => currentVerdict(allHours, now), [allHours, now])
  /**
   * The hottest hour still ahead today, for the line under the big number.
   *
   * Anchored on `current` — which tracks the minute tick — rather than on
   * `days[0]`. `days` is memoised on [data, policy, timeZone] and the series
   * starts at the hour of the FETCH, so `days[0].peak` is "the rest of today"
   * only at load: an hour later it still counts hours that have gone by, and
   * past local midnight it is yesterday under today's name.
   */
  const peakAhead = useMemo(
    () => (current ? restOfDayPeak(allHours, current) : null),
    [allHours, current],
  )
  /**
   * The evening. `restOfDayPeak` answers with the current hour once the day's
   * peak is behind the reader, the chip hides itself (verified live: shown in
   * Honolulu at 11am, gone in Atlanta at 5pm) — and nothing replaced it, so
   * tomorrow's peak sat in the week strip ~2.5 screens down. The site's own
   * copy calls that the primary use: "plan tomorrow's practice with the
   * forecast the night before."
   *
   * Same anchoring rule as above: `nextDayPeak` walks the series for the next
   * local DATE after the hour on the card, never `days[1]`, which past local
   * midnight is today.
   */
  const nextDay = useMemo(
    () => (current ? nextDayPeak(allHours, current) : null),
    [allHours, current],
  )
  const todayPeakSpent = current !== null && peakAhead !== null && peakAhead.time === current.time
  const tomorrowPeak = todayPeakSpent ? nextDay : null
  /** Tomorrow's local date, relative to the hour on the card. */
  const tomorrowDate = nextDay?.localDate ?? null

  const showingToday = selectedDay !== null && today !== null && selectedDay.date === today.date
  /**
   * Named "Tomorrow" rather than by a weekday, whether the page fell forward
   * to it on its own or the peak chip sent the reader there. It used to be
   * keyed on `days[1]`, which is tomorrow only at load — the same trap
   * restOfDayPeak and nextDayPeak are anchored on an hour to avoid.
   */
  const autoAdvancedToNextDay =
    !showingToday && selectedDay !== null && tomorrowDate !== null && selectedDay.date === tomorrowDate
  const hourlyHeading = showingToday
    ? t('verdict.todayHeading')
    : autoAdvancedToNextDay
      ? t('verdict.tomorrowHeading')
      : t('verdict.dayHeading', {
        day: selectedDay
          ? new Intl.DateTimeFormat(i18n.language, { weekday: 'long' }).format(
              new Date(`${selectedDay.date}T12:00:00`),
            )
          : '',
      })

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
  /**
   * The heat-axis mirror of the air link below. The picker keys guides by
   * POLICY id, and CA, KY, FL, NC, NY and VA have no policy id — they are not
   * in the picker — so a ZIP in any of them produced the NATA fallback with
   * no guide link and no notice, while the air axis on the same screen
   * detected the state and linked its air guide. This keys by the DETECTED
   * STATE instead, so every state with a guide gets one.
   *
   * Not a picker change: auto-selection is untouched. This surfaces the
   * caveat those pages already carry, which was unreachable from here.
   */
  const detectedGuide = location?.stateAbbr
    ? STATE_GUIDES.find((guide) => guide.abbr === location.stateAbbr)
    : undefined
  const pickerGuideKey = statePageKeyByPolicy[policyId]
  const pickerGuideSlug = pickerGuideKey ? pageSEO[pickerGuideKey].path : null
  // Only when the picker is not already pointing at this state's guide.
  const showStateGuide = !!detectedGuide && detectedGuide.slug !== pickerGuideSlug
  /**
   * The notice claims this state's own scale is not one of the picker's
   * options, so that is what it must be gated on. Gating on
   * `policyId === 'generic'` said it in Tennessee, where TSSAA IS an option
   * and merely is not auto-selected, and said it to a Texas reader who moved
   * the picker to NATA by hand. Both were false.
   */
  const ladderIsPickable = !!detectedGuide && pickerLadderPageKeys.has(detectedGuide.seoKey)
  /**
   * And WHICH notice comes from the oracle, not from one sentence stretched
   * over every state. The single version told New York — a heat-index state —
   * that its thresholds were comparable to the WBGT flag above, and told
   * Florida and Virginia they publish thresholds that neither of them
   * publishes.
   */
  const ladderNotice = !detectedGuide
    ? null
    : detectedGuide.ladder === 'heat-index'
      ? { heading: t('home.stateScaleHeading'), body: t('home.stateScaleBody') }
      : detectedGuide.ladder === 'no-state-numbers'
        ? {
            heading: t('home.stateNoNumbersHeading'),
            body: t('home.stateNoNumbersBody', {
              setBy: t(
                detectedGuide.numbersSetBy === 'districts'
                  ? 'home.stateNumbersSetByDistricts'
                  : 'home.stateNumbersSetByAssociation',
              ),
            }),
          }
        : { heading: t('home.stateLadderHeading'), body: t('home.stateLadderBody') }

  const stateAbbr = location?.stateAbbr ?? null
  /**
   * Which caveat, if any, stands under the verdict.
   *
   * Two of these four branches were missing, and the shape of what was
   * missing is the finding: the site warned where it knew MORE and stayed
   * silent where it knew less.
   *
   *   no guide at all — 34 states. A coach in Ohio or Alabama got a full-bleed
   *     NATA flag and no notice section whatsoever, while Kentucky and
   *     California got an orange-bordered warning that the flag is not theirs.
   *     Ohio and Alabama appear zero times on /states. The flag on an Ohio
   *     screen is a fallback that looks exactly like a state-mandated verdict.
   *   guide, and the picker is already on it — nothing to say.
   *   guide whose ladder the picker cannot offer — the existing three variants.
   *   guide whose ladder the picker CAN offer but is not showing — Tennessee,
   *     where TSSAA is an option that is simply not auto-selected, and any
   *     Georgia or Texas reader who moved the picker to NATA by hand. The old
   *     gate asked "is this state's ladder pickable", which is a fact about
   *     the picker; the reader's question is whether the flag ON SCREEN is
   *     their state's, which is a different one.
   */
  const stateNotice = !detectedGuide
    ? // Nothing may be claimed about a state we cannot name.
      stateAbbr
      ? {
          // The heading said "this state" while the body two lines under it
          // said "not OH's own rule" — one notice naming the state twice and
          // refusing to name it once. It is named.
          heading: t('home.stateUnverifiedHeading', { state: stateAbbr }),
          body: t('home.stateUnverifiedBody', { state: stateAbbr }),
        }
      : null
    : !showStateGuide
      ? null
      : !ladderIsPickable
        ? ladderNotice
        : {
            heading: t('home.stateNotSelectedHeading', { state: detectedGuide.abbr }),
            body: t('home.stateNotSelectedBody', {
              state: detectedGuide.abbr,
              policy: t(`policies.${policyId}`),
            }),
          }

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
          <LocationSetup onZip={setZip} onGeolocate={geolocate} busy={busy} errorKey={errorKey} />
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

      {/* California, for the same reason and in the same place: until the
          region category is answered, every flag below is the strictest CIF
          ladder rather than a finding about this school. */}
      {location?.stateAbbr === 'CA' && !cifCategoryChosen && (
        <CifCategoryPrompt onChoose={setPolicyId} />
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
          onChangeLocation={() => setChangingLocation(true)}
          peakAhead={tomorrowPeak ?? peakAhead}
          peakScope={tomorrowPeak ? 'tomorrow' : 'today'}
          // Only for the tomorrow chip. Pinning `selectedDate` to today would
          // also disable the fall-forward in pickTimelineDay, and the reader
          // would be left on an empty strip once today's drawable hours run
          // out — the late-evening hole, re-opened by a tap.
          onPeakSelect={tomorrowPeak ? setSelectedDate : undefined}
        />
      )}

      {location && status === 'ready' && changingLocation && (
        <div ref={locationEditorRef} className="border-2 border-ink bg-surface p-4">
          <LocationSetup
            compact
            onZip={(zip) => {
              setZip(zip)
              setChangingLocation(false)
            }}
            onGeolocate={() => {
              geolocate()
              setChangingLocation(false)
            }}
            busy={busy}
            errorKey={errorKey}
            onCancel={() => setChangingLocation(false)}
          />
        </div>
      )}

      {/* Directly under the verdict: a reader who stops at the flag must
          still have seen whose rule produced it. */}
      {location && status === 'ready' && current && (stateNotice || showStateGuide) && (
        <section className="border-2 border-flag-orange bg-surface p-5">
          {stateNotice && (
            <>
              <h2 className="display-num mb-2 text-xl uppercase">{stateNotice.heading}</h2>
              <p className="mb-3">{stateNotice.body}</p>
            </>
          )}
          <p className="flex flex-wrap gap-x-6 gap-y-1">
            {/* First, because it is the only one of the three that helps.
                A reader in one of the 34 uncovered states was told the site
                cannot answer their question and then sent to a table their
                state is not in — /states lists 16. This page does not know
                Ohio's rule either, but it says what to ask OHSAA for and how
                to read the answer, which is the next move from here. */}
            {!detectedGuide && stateAbbr && MEASUREMENT_GUIDE && (
              <Link
                to={`/${lang}/${MEASUREMENT_GUIDE.slug}`}
                className="font-semibold underline"
              >
                {t(MEASUREMENT_GUIDE.labelKey)} →
              </Link>
            )}
            {showStateGuide && detectedGuide ? (
              <Link to={`/${lang}/${detectedGuide.slug}`} className="font-semibold underline">
                {t(detectedGuide.labelKey)} →
              </Link>
            ) : (
              <Link to={`/${lang}/states`} className="font-semibold underline">
                {t('common.nav.states')} →
              </Link>
            )}
            {/* The reader in an uncovered state is the one person who can
                close the gap, and they are standing in it. */}
            {!detectedGuide && stateAbbr && (
              <a
                href={feedbackMailto(`wbgtcheck state policy: ${stateAbbr}`)}
                className="font-semibold underline"
              >
                {t('common.correctionCta')}
              </a>
            )}
          </p>
        </section>
      )}

      {/* Recording a reading belongs beside the reading. The full log is
          about 2.5 screens down, which is the right place to review the record
          and the wrong place to start one. */}
      {location && status === 'ready' && current && (
        <LogQuickAdd
          currentWbgtF={current.wbgtF}
          policy={policy}
          policyId={policyId}
          locationLabel={location.label}
        />
      )}

      {/* The one retention affordance on the site used to render LAST, below
          the footer nav, at ~90% scroll depth — a low-contrast paragraph one ×
          away from permanent dismissal, offered to a first-time reader who has
          no reason yet to want it. It sits here now, under the verdict and the
          log button, and only for someone who has been here before. */}
      {location && status === 'ready' && current && returningReader && <InstallHint />}

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
      {location && status === 'ready' && selectedDay && (
        <section id="hourly-view">
          <h2 className="display-num mb-2 text-xl uppercase">{hourlyHeading}</h2>
          <TodayTimeline
            hours={timelineHours(selectedDay)}
            currentTime={showingToday ? now : undefined}
          />
        </section>
      )}

      {location && status === 'ready' && days.length > 1 && selectedDay && (
        <section>
          <h2 className="display-num mb-2 text-xl uppercase">{t('verdict.weekHeading')}</h2>
          <p className="mb-2 text-sm text-ink-muted">{t('verdict.weekDrillHint')}</p>
          <WeekStrip
            days={days}
            selectedDate={selectedDay.date}
            onSelect={setSelectedDate}
            controls="hourly-view"
          />
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
                onClick={() => setChangingLocation(true)}
                className="inline-flex min-h-11 items-center border-2 border-line px-4 text-sm font-semibold text-ink-muted hover:text-ink"
              >
                {t('location.change')}
              </button>
            </div>
            {selectedDay && (
              <ShareCardButton
                day={selectedDay}
                policy={policy}
                locationLabel={location.label}
                isToday={showingToday}
              />
            )}
          </div>
          {/* Once the class is chosen the prompt above is gone, so this is the
              reminder that the choice is a region call and is changeable. */}
          {location.stateAbbr === 'TX' && policyId.startsWith('uil') && uilClassChosen && (
            <p className="max-w-2xl border-l-4 border-flag-orange pl-3 text-sm font-semibold">
              {t('policies.txClassHint')}
            </p>
          )}
          {/* California's equivalent, and it carries one thing Texas's does
              not: the measurement caveat. CIF's stance is 'yes' — it names an
              online WBGT reading for meter-less schools — so no device notice
              appears on a California verdict card, and the reason that is
              honest rather than convenient is that CIF named ONE NOAA page and
              this is not it. The prompt says so before the choice; this says
              it after, so the caveat does not leave with the question. */}
          {location.stateAbbr === 'CA' && policyId.startsWith('cif-cat') && cifCategoryChosen && (
            <p className="max-w-2xl border-l-4 border-flag-orange pl-3 text-sm font-semibold">
              {t('policies.caCategoryHint')}
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
          // The FIELD's clock, the same one the verdict card above stamps
          // with. WbgtLog grew the prop and nothing passed it, so the log
          // still stamped the device: same Atlanta session, card "AT 9:00 AM",
          // row "10:05 PM". This is the artifact with a Print button.
          timeZone={timeZone}
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
        {sections.map((_, i) => {
          const topicGuide = TOPIC_GUIDES.find(
            (guide) => guide.seoKey === SECTION_TOPIC_GUIDE[i],
          )
          return (
            // Indexed t() calls: i18next does not interpolate inside
            // returnObjects trees, and the bias numbers must come from the
            // oracle constants.
            <div key={t(`home.sections.${i}.heading`)}>
              <h2 className="display-num mb-1 text-xl uppercase">
                {t(`home.sections.${i}.heading`)}
              </h2>
              <p className="text-ink-muted">
                {t(`home.sections.${i}.body`, {
                  min: REMOTE_UNDERESTIMATE_MIN_C,
                  max: REMOTE_UNDERESTIMATE_MAX_C,
                })}
              </p>
              {topicGuide && (
                <p className="mt-1">
                  <Link
                    to={`/${lang}/${topicGuide.slug}`}
                    className="font-semibold underline"
                  >
                    {t(topicGuide.labelKey)} →
                  </Link>
                </p>
              )}
            </div>
          )
        })}
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
    </div>
  )
}
