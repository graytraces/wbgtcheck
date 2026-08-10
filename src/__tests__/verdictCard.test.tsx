import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from '../i18n'
import en from '../locales/en.json'
import VerdictCard from '../components/VerdictCard'
import {
  UIL_CLASS_3,
  GHSA,
  classifyWbgt,
  REMOTE_UNDERESTIMATE_MIN_C,
  REMOTE_UNDERESTIMATE_MAX_C,
} from '../data/policyOracle'
import type { HourVerdict } from '../utils/verdict'
import { isBorderline } from '../data/policyOracle'
import { awayTimeZone } from '../test/homeFixture'

function hourAt(wbgtF: number, source: 'nws' | 'estimated' = 'nws'): HourVerdict {
  return {
    time: Date.parse('2026-08-10T20:00:00+00:00'),
    wbgtF,
    source,
    tempF: null,
    flag: classifyWbgt(UIL_CLASS_3, wbgtF).flag,
    borderline: isBorderline(UIL_CLASS_3, wbgtF),
    localHour: 15,
    localDate: '2026-08-10',
  }
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('VerdictCard', () => {
  it('shows the WBGT to a tenth, the oracle-derived flag label, and the permanent safety notices', () => {
    render(
      <VerdictCard
        hour={hourAt(88.4)}
        policy={UIL_CLASS_3}
        locationLabel="Austin, TX"
        stateAbbr="TX"
        timeZone="America/Chicago"
      />,
    )
    expect(screen.getByText('88.4')).toBeInTheDocument()
    const expectedFlag = classifyWbgt(UIL_CLASS_3, 88.4).flag
    expect(screen.getAllByText(en.flags[expectedFlag].label).length).toBeGreaterThan(0)
    // Non-negotiable permanent notices (bias numbers interpolate from the oracle)
    expect(
      screen.getByText(
        i18n.t('verdict.conservativeNotice', {
          min: REMOTE_UNDERESTIMATE_MIN_C,
          max: REMOTE_UNDERESTIMATE_MAX_C,
        }),
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(en.verdict.verifyOnsite)).toBeInTheDocument()
  })

  it('labels estimated hours and explains the estimate', () => {
    render(
      <VerdictCard
        hour={hourAt(85, 'estimated')}
        policy={UIL_CLASS_3}
        locationLabel="Austin, TX"
        stateAbbr="TX"
        timeZone="America/Chicago"
      />,
    )
    expect(screen.getAllByText(en.verdict.estimatedBadge).length).toBeGreaterThan(0)
    expect(screen.getByText(en.verdict.estimatedExplain)).toBeInTheDocument()
  })

  it('shows the borderline upgrade advisory inside the margin', () => {
    // 86.5 with the orange boundary at 87.0 → borderline under the 2 °F margin
    render(
      <VerdictCard
        hour={hourAt(86.5)}
        policy={UIL_CLASS_3}
        locationLabel="Austin, TX"
        stateAbbr="TX"
        timeZone="America/Chicago"
      />,
    )
    expect(isBorderline(UIL_CLASS_3, 86.5)).toBe(true)
    expect(screen.getByText(new RegExp(en.flags.orange.label))).toBeInTheDocument()
  })

  it('shows the device-only compliance warning under GHSA', () => {
    const hour: HourVerdict = {
      ...hourAt(84),
      flag: classifyWbgt(GHSA, 84).flag,
      borderline: isBorderline(GHSA, 84),
    }
    render(
      <VerdictCard
        hour={hour}
        policy={GHSA}
        locationLabel="Atlanta, GA"
        stateAbbr="GA"
        timeZone="America/New_York"
      />,
    )
    // Interpolated body name comes from the policy source
    expect(
      screen.getByText((content) => content.includes('do NOT satisfy compliance')),
    ).toBeInTheDocument()
  })
})

/**
 * The "as of" line and the reading's own hour are two clocks on one line, so
 * they have to be the same clock. Commit 4efe3c6 passed `timeZone` to the as-of
 * formatter for the away-game case — a Texas team checking Atlanta's forecast
 * saw times two hours apart on the same card — and nothing guarded it: the only
 * two VerdictCard renders in the suite never passed `fetchedAt`, so the branch
 * was never entered and deleting `timeZone` from it failed nothing.
 */
describe('the card keeps one clock', () => {
  const AT = Date.parse('2026-08-10T20:00:00+00:00')
  // Deliberately not the runner's zone — see awayTimeZone.
  const TZ = awayTimeZone(AT)

  it('stamps "as of" in the forecast zone, like the hour beside it', () => {
    render(
      <VerdictCard
        hour={{ ...hourAt(88.4), time: AT }}
        policy={UIL_CLASS_3}
        locationLabel="Atlanta, GA"
        stateAbbr="GA"
        timeZone={TZ}
        fetchedAt={AT}
      />,
    )
    const inZone = new Intl.DateTimeFormat('en', {
      timeZone: TZ,
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(AT))
    const onDevice = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(
      new Date(AT),
    )
    expect(inZone, 'the chosen zone matches the runner, so this proves nothing').not.toBe(onDevice)

    // Same instant, same line: the reading's hour and the load time must print
    // identically.
    const line = screen.getByText(en.verdict.nowHeading, { exact: false })
    expect(line.textContent).toContain(i18n.t('verdict.atTime', { time: inZone }))
    expect(line.textContent).toContain(i18n.t('verdict.asOf', { time: inZone }))
    expect(line.textContent, 'the as-of stamp is on the device clock').not.toContain(
      i18n.t('verdict.asOf', { time: onDevice }),
    )
  })

  it('says nothing about load time when there is none to report', () => {
    render(
      <VerdictCard
        hour={{ ...hourAt(88.4), time: AT }}
        policy={UIL_CLASS_3}
        locationLabel="Atlanta, GA"
        stateAbbr="GA"
        timeZone={TZ}
      />,
    )
    const line = screen.getByText(en.verdict.nowHeading, { exact: false })
    expect(line.textContent).not.toContain(en.verdict.asOf.replace('{{time}}', '').trim())
  })
})

describe('verdict card live region', () => {
  it('announces the reading and flag, not the safety strip', () => {
    const { container } = render(
      <VerdictCard
        hour={hourAt(88.4)}
        policy={UIL_CLASS_3}
        locationLabel="Austin, TX"
        stateAbbr="TX"
        timeZone="America/Chicago"
      />,
    )
    const live = container.querySelectorAll('[aria-live]')
    expect(live).toHaveLength(1)
    const region = live[0]
    expect(region.tagName).not.toBe('SECTION')
    // What changes: the number and the flag label.
    expect(region.textContent).toContain('88.4')
    const flag = classifyWbgt(UIL_CLASS_3, 88.4).flag
    expect(region.textContent).toContain(en.flags[flag].label)
    // What does not: the permanent notices that ride along on every render.
    expect(region.textContent).not.toContain(en.verdict.verifyOnsite)
  })
})
