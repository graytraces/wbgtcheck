import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import i18n from '../i18n'
import en from '../locales/en.json'
import VerdictCard from '../components/VerdictCard'
import WbgtLog from '../components/WbgtLog'
import { annotateHours } from '../utils/verdict'
import { formatWbgtF, displayedWbgtF } from '../utils/units'
import type { HourPoint } from '../utils/nws'
import { POLICIES, GENERIC_NATA, UIL_CLASS_3, classifyWbgt, type PolicyId } from '../data/policyOracle'

/**
 * The number on screen and the flag beside it must be the same reading.
 *
 * `formatWbgtF` prints `toFixed(1)`; the classifier used to read the raw
 * float. Every reading in [minF − 0.05, minF) therefore RENDERED as the
 * boundary value while carrying the band below it — a UIL Class 3 reading of
 * 86.95 printed "87.0 °F" under a YELLOW flag, while the UIL chart the coach
 * is holding says 87.0 - 90.0 is ORANGE. Wrong in the permissive direction, at
 * every inclusive lower bound of every policy this site publishes.
 *
 * The window is a half-tenth wide, which is exactly why it survived the
 * earlier whole-degree fix: nothing rounds twice by accident, and no test
 * asked what the printed characters classify as.
 */

const TZ = 'America/Chicago'
const T0 = Date.parse('2026-08-10T18:00:00+00:00')

const point = (wbgtF: number): HourPoint => ({ time: T0, wbgtF, source: 'nws', tempF: null })

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

/** Every inclusive lower bound published by any policy in the picker. */
function inclusiveBounds() {
  const out: { policyId: PolicyId; minF: number }[] = []
  for (const id of Object.keys(POLICIES) as PolicyId[]) {
    for (const band of POLICIES[id].bands) {
      if (band.minF !== null && band.minInclusive) out.push({ policyId: id, minF: band.minF })
    }
  }
  return out
}

describe('the flag belongs to the number on screen', () => {
  it('covers every policy, so no ladder can be left out of this', () => {
    const ids = new Set(inclusiveBounds().map((b) => b.policyId))
    expect([...ids].sort()).toEqual((Object.keys(POLICIES) as PolicyId[]).sort())
    // 76.0 (MIAA) through 92.1 (UIL Class 3 black) — the whole published range.
    expect(inclusiveBounds().length).toBeGreaterThanOrEqual(20)
  })

  it('a reading that PRINTS as the boundary carries the boundary band', () => {
    for (const { policyId, minF } of inclusiveBounds()) {
      // Inside the half-tenth window: below the bound as a float, equal to it
      // once printed.
      const raw = minF - 0.01
      const policy = POLICIES[policyId]
      expect(formatWbgtF(raw), `${policyId} ${minF}`).toBe(minF.toFixed(1))

      const [hour] = annotateHours([point(raw)], policy, TZ)
      const printedBand = classifyWbgt(policy, minF)
      expect(hour.flag, `${policyId}: ${formatWbgtF(raw)} °F is flagged below its own row`).toBe(
        printedBand.flag,
      )
      // And the value carried forward is the one that was printed, so the log
      // row and the share card cannot disagree with the card either.
      expect(hour.wbgtF).toBe(displayedWbgtF(raw))
    }
  })

  it('leaves readings that print BELOW the boundary in the cooler band', () => {
    // The fix may only move the flag to what the printed table says — never
    // promote a reading that still prints below its own row.
    for (const { policyId, minF } of inclusiveBounds()) {
      const raw = minF - 0.06 // prints as minF − 0.1
      const policy = POLICIES[policyId]
      expect(formatWbgtF(raw)).not.toBe(minF.toFixed(1))
      const [hour] = annotateHours([point(raw)], policy, TZ)
      expect(hour.flag, `${policyId} ${minF}`).toBe(classifyWbgt(policy, raw).flag)
    }
  })

  it('the verdict card flags the digits it printed', () => {
    // 86.95 under UIL Class 3: orange begins at 87.0 inclusive.
    render(
      <VerdictCard
        hour={annotateHours([point(86.95)], UIL_CLASS_3, TZ)[0]}
        policy={UIL_CLASS_3}
        locationLabel="Austin, TX"
        stateAbbr="TX"
        timeZone={TZ}
      />,
    )
    expect(screen.getByText('87.0')).toBeInTheDocument()
    const printedFlag = classifyWbgt(UIL_CLASS_3, 87.0).flag
    expect(printedFlag).toBe('orange')
    expect(screen.getAllByText(en.flags[printedFlag].label).length).toBeGreaterThan(0)
    expect(screen.queryByText(en.flags.yellow.label)).not.toBeInTheDocument()
  })

  it('the card is self-consistent even when handed a raw hour', () => {
    // A caller that did not go through annotateHours must not be able to
    // reintroduce the disagreement.
    render(
      <VerdictCard
        hour={{
          time: T0,
          wbgtF: 86.95,
          source: 'nws',
          tempF: null,
          flag: 'yellow',
          borderline: false,
          localHour: 13,
          localDate: '2026-08-10',
        }}
        policy={UIL_CLASS_3}
        locationLabel="Austin, TX"
        stateAbbr="TX"
        timeZone={TZ}
      />,
    )
    expect(screen.getByText('87.0')).toBeInTheDocument()
    expect(screen.getAllByText(en.flags.orange.label).length).toBeGreaterThan(0)
  })
})

describe('the reading log files what it prints', () => {
  beforeEach(() => {
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
  })

  it('an on-site reading typed inside the window is filed under the printed band', () => {
    // Generic NATA: orange begins at 87.0 inclusive. The row stored the
    // ROUNDED value beside a flag taken from the RAW one.
    render(
      <WbgtLog
        currentWbgtF={null}
        policy={GENERIC_NATA}
        policyId="generic"
        locationLabel="Austin, TX"
      />,
    )
    fireEvent.change(screen.getByLabelText(en.wbgtLog.onsiteLabel), { target: { value: '86.95' } })
    fireEvent.click(screen.getByRole('button', { name: en.wbgtLog.onsiteButton }))

    expect(screen.getByText('87.0')).toBeInTheDocument()
    const printedFlag = classifyWbgt(GENERIC_NATA, 87.0).flag
    expect(printedFlag).toBe('orange')
    expect(screen.getByText(en.flags[printedFlag].label)).toBeInTheDocument()
    expect(screen.queryByText(en.flags.yellow.label)).not.toBeInTheDocument()
  })
})
