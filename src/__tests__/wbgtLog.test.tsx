import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import i18n from '../i18n'
import en from '../locales/en.json'
import es from '../locales/es.json'
import WbgtLog from '../components/WbgtLog'
import LogQuickAdd from '../components/LogQuickAdd'
import VerdictCard from '../components/VerdictCard'
import { readWbgtLog, WBGT_LOG_KEY, type WbgtLogEntry } from '../hooks/useWbgtLog'
import { GENERIC_NATA, classifyWbgt } from '../data/policyOracle'
import type { HourVerdict } from '../utils/verdict'
import { awayTimeZone } from '../test/homeFixture'

/**
 * The honesty contract of the reading log: every rendered entry names its
 * source (forecast estimate vs on-site reading), and both save paths emit
 * the GA4 event with that source.
 */

function installMemoryStorage() {
  const store = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    },
  })
}

function renderLog(currentWbgtF: number | null = 88.4) {
  return render(
    <WbgtLog
      currentWbgtF={currentWbgtF}
      policy={GENERIC_NATA}
      policyId="generic"
      locationLabel="Austin, TX"
    />,
  )
}

let gtag: ReturnType<typeof vi.fn>

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  installMemoryStorage()
  gtag = vi.fn()
  window.gtag = gtag as unknown as typeof window.gtag
})

describe('WbgtLog', () => {
  it('one tap logs the current estimate, labeled as a forecast estimate', () => {
    renderLog(88.4)
    fireEvent.click(screen.getByRole('button', { name: /88\.4/ }))
    expect(screen.getByText(en.wbgtLog.sourceForecast)).toBeInTheDocument()
    expect(screen.queryByText(en.wbgtLog.sourceOnsite)).not.toBeInTheDocument()
    expect(gtag).toHaveBeenCalledWith('event', 'wbgt_log_save', { source: 'forecast' })
  })

  it('manual entry logs an on-site reading, labeled as such', () => {
    renderLog(null)
    // No forecast button when there is no current estimate (the forecast
    // button is the only button with a number in its name).
    expect(screen.queryByRole('button', { name: /\d/ })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(en.wbgtLog.onsiteLabel), { target: { value: '92.1' } })
    fireEvent.click(screen.getByRole('button', { name: en.wbgtLog.onsiteButton }))
    expect(screen.getByText(en.wbgtLog.sourceOnsite)).toBeInTheDocument()
    expect(screen.getByText('92.1')).toBeInTheDocument()
    expect(gtag).toHaveBeenCalledWith('event', 'wbgt_log_save', { source: 'onsite' })
  })

  it('rejects out-of-range manual input (button stays disabled)', () => {
    renderLog(null)
    const button = screen.getByRole('button', { name: en.wbgtLog.onsiteButton })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByLabelText(en.wbgtLog.onsiteLabel), { target: { value: '999' } })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByLabelText(en.wbgtLog.onsiteLabel), { target: { value: '85' } })
    expect(button).toBeEnabled()
  })

  it('clear-all requires a confirm step and then empties the history', () => {
    renderLog(88.4)
    fireEvent.click(screen.getByRole('button', { name: /88\.4/ }))
    fireEvent.click(screen.getByRole('button', { name: en.wbgtLog.clearAll }))
    expect(screen.getByText(en.wbgtLog.clearConfirm)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: en.wbgtLog.clearAll }))
    expect(screen.queryByText(en.wbgtLog.sourceForecast)).not.toBeInTheDocument()
  })

  it('shows the UIL cadence hint with interpolated oracle numbers', () => {
    renderLog(88.4)
    expect(
      screen.getByText(i18n.t('wbgtLog.cadenceHint', { before: 15, interval: 30 })),
    ).toBeInTheDocument()
  })
})

describe('WbgtLog when the write fails', () => {
  it('warns on screen instead of showing the success toast', () => {
    // Storage that accepts reads but refuses writes — quota exceeded, or a
    // profile that blocks persistence. The row appears in the list either way,
    // which is exactly why the failure has to be said out loud.
    const store = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: () => {
          throw new DOMException('quota', 'QuotaExceededError')
        },
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
      },
    })
    renderLog(88.4)
    fireEvent.click(screen.getByRole('button', { name: /log current estimate/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(en.wbgtLog.saveFailedNote)
    expect(screen.queryByRole('button', { name: en.wbgtLog.savedToast })).not.toBeInTheDocument()
  })

  it('shows the toast and no warning when the write lands', () => {
    installMemoryStorage()
    renderLog(88.4)
    fireEvent.click(screen.getByRole('button', { name: /log current estimate/i }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

/**
 * The log is stamped in the FIELD's time zone, the same one the verdict card
 * above it uses.
 *
 * Same session, Atlanta GA, phone on UTC+9: the card said "RIGHT NOW · AT 9:00
 * AM" and the log entry that card had just created said "Aug 10, 2026 at 10:05
 * PM". Commit 4efe3c6 fixed exactly this in VerdictCard — passing `timeZone`
 * to the "as of" formatter, with a comment citing the away game — and did not
 * carry it into the log, which is the artifact with a Print button, i.e. the
 * one that gets handed to an athletic director.
 */
describe('the log and the card keep the same clock', () => {
  const STAMP = Date.parse('2026-08-10T13:05:00Z')
  const TZ = awayTimeZone(STAMP)

  const entry: WbgtLogEntry = {
    id: 'row-1',
    timestamp: STAMP,
    wbgtF: 88.4,
    source: 'forecast',
    flagKey: `flags.${classifyWbgt(GENERIC_NATA, 88.4).flag}.label`,
    policyKey: 'policies.generic',
    locationLabel: 'Atlanta, GA',
  }

  const hour: HourVerdict = {
    time: STAMP,
    wbgtF: 88.4,
    source: 'nws',
    tempF: null,
    flag: classifyWbgt(GENERIC_NATA, 88.4).flag,
    borderline: false,
    localHour: 9,
    localDate: '2026-08-10',
  }

  const inZone = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en', { ...opts, timeZone: TZ }).format(new Date(STAMP))

  beforeEach(() => {
    installMemoryStorage()
    window.localStorage.setItem(WBGT_LOG_KEY, JSON.stringify([entry]))
  })

  it('stamps the row in the forecast zone, not the device zone', () => {
    render(
      <WbgtLog
        currentWbgtF={88.4}
        policy={GENERIC_NATA}
        policyId="generic"
        locationLabel="Atlanta, GA"
        timeZone={TZ}
      />,
    )
    const row = screen.getByLabelText(en.wbgtLog.historyTitle).querySelector('li')!
    const expected = new Date(STAMP).toLocaleString('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: TZ,
    })
    expect(row.textContent).toContain(expected)
    // And not the reading of the same instant on the machine running this.
    const deviceStamp = new Date(STAMP).toLocaleString('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    expect(deviceStamp).not.toBe(expected)
    expect(row.textContent).not.toContain(deviceStamp)
  })

  it('shows the same clock time as the card that created the row', () => {
    render(
      <>
        <VerdictCard
          hour={hour}
          policy={GENERIC_NATA}
          locationLabel="Atlanta, GA"
          stateAbbr="GA"
          timeZone={TZ}
          fetchedAt={STAMP}
        />
        <WbgtLog
          currentWbgtF={88.4}
          policy={GENERIC_NATA}
          policyId="generic"
          locationLabel="Atlanta, GA"
          timeZone={TZ}
        />
      </>,
    )
    const clock = inZone({ hour: 'numeric', minute: '2-digit' })
    expect(screen.getByText(en.verdict.nowHeading, { exact: false }).textContent).toContain(clock)
    const row = screen.getByLabelText(en.wbgtLog.historyTitle).querySelector('li')!
    expect(row.textContent, 'the log disagrees with the card above it').toContain(clock)
  })

  it('dates the printed sheet in the same zone', () => {
    render(
      <WbgtLog
        currentWbgtF={88.4}
        policy={GENERIC_NATA}
        policyId="generic"
        locationLabel="Atlanta, GA"
        timeZone={TZ}
      />,
    )
    // The print header is the identification line on the page handed over.
    const header = screen.getByText(
      i18n.t('wbgtLog.printHeader', {
        location: 'Atlanta, GA',
        range: inZone({ dateStyle: 'medium' }),
      }),
    )
    expect(header).toBeInTheDocument()
  })

  it('still renders without a zone, on the device clock', () => {
    // The prop is optional so a caller that has no forecast zone yet still
    // gets a readable row rather than a crash.
    render(
      <WbgtLog
        currentWbgtF={88.4}
        policy={GENERIC_NATA}
        policyId="generic"
        locationLabel="Atlanta, GA"
      />,
    )
    const row = screen.getByLabelText(en.wbgtLog.historyTitle).querySelector('li')!
    expect(within(row).getByText('88.4')).toBeInTheDocument()
  })
})

describe('LogQuickAdd beside the verdict', () => {
  it('writes to the same log the history below reads', () => {
    installMemoryStorage()
    render(
      <>
        <LogQuickAdd
          currentWbgtF={88.4}
          policy={GENERIC_NATA}
          policyId="generic"
          locationLabel="Austin, TX"
        />
        <WbgtLog
          currentWbgtF={88.4}
          policy={GENERIC_NATA}
          policyId="generic"
          locationLabel="Austin, TX"
        />
      </>,
    )
    // One shared listener set, so saving from the quick button fills the
    // history further down the same page without a reload.
    fireEvent.click(screen.getByRole('button', { name: /log 88\.4/i }))
    expect(readWbgtLog()).toHaveLength(1)
    expect(screen.getByLabelText(en.wbgtLog.historyTitle)).toBeInTheDocument()
  })

  it('points at the full log once there is something in it', () => {
    installMemoryStorage()
    render(
      <LogQuickAdd
        currentWbgtF={88.4}
        policy={GENERIC_NATA}
        policyId="generic"
        locationLabel="Austin, TX"
      />,
    )
    // Nothing logged yet — no link to an empty list.
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /log 88\.4/i }))
    expect(screen.getByRole('link')).toHaveAttribute('href', '#wbgt-log')
  })
})

/**
 * The log's first sentence and the note under the Print button disagreed.
 *
 * `intro` said the record is "for this session"; `storageNote` says it lives
 * until site data is cleared, and the measured behaviour is the second one —
 * an entry written on one day is still there in a new tab the next. `intro` is
 * the sentence a coach actually reads, and it told them not to rely on the
 * artefact the Print button exists to produce.
 */
describe('the log says how long it keeps things, and says it once', () => {
  it('does not call a season-long record a session', () => {
    for (const dict of [en, es]) {
      expect(dict.wbgtLog.intro).not.toMatch(/this session|esta sesi[óo]n/i)
      expect(dict.wbgtLog.intro).toMatch(/season|temporada/i)
      // …and it agrees with the storage note rather than contradicting it.
      expect(dict.wbgtLog.intro).toMatch(/until you clear|hasta que usted lo borre/i)
      expect(dict.wbgtLog.storageNote).toMatch(/clearing site data|borrar los datos|elimina/i)
    }
  })
})
