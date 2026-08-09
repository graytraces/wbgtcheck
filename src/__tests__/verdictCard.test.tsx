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
  it('shows the rounded WBGT, the oracle-derived flag label, and the permanent safety notices', () => {
    render(
      <VerdictCard
        hour={hourAt(88.4)}
        policy={UIL_CLASS_3}
        locationLabel="Austin, TX"
        stateAbbr="TX"
        timeZone="America/Chicago"
      />,
    )
    expect(screen.getByText('88')).toBeInTheDocument()
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
    expect(region.textContent).toContain('88')
    const flag = classifyWbgt(UIL_CLASS_3, 88.4).flag
    expect(region.textContent).toContain(en.flags[flag].label)
    // What does not: the permanent notices that ride along on every render.
    expect(region.textContent).not.toContain(en.verdict.verifyOnsite)
  })
})
