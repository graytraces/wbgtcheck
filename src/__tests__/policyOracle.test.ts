import { describe, it, expect } from 'vitest'
import {
  POLICIES,
  UIL_CLASS_2,
  UIL_CLASS_3,
  GHSA,
  GENERIC_NATA,
  classifyWbgt,
  isBorderline,
  nextBandBoundary,
  BORDERLINE_MARGIN_F,
  REMOTE_UNDERESTIMATE_MIN_F,
  REMOTE_UNDERESTIMATE_MAX_F,
  UIL_EFFECTIVE_DATE,
  UIL_READING_BEFORE_PRACTICE_MAX_MINUTES,
  UIL_READING_INTERVAL_MINUTES,
  GHSA_READING_INTERVAL_MINUTES,
  GHSA_CALIBRATION_INTERVAL_YEARS,
} from '../data/policyOracle'
import type { FlagColor, HeatPolicy } from '../data/policyOracle'

function flagAt(policy: HeatPolicy, f: number): FlagColor {
  return classifyWbgt(policy, f).flag
}

describe('policy oracle — band boundaries vs primary sources', () => {
  it('UIL Class 3 boundaries match the 25-26 WBGT chart', () => {
    expect(flagAt(UIL_CLASS_3, 81.9)).toBe('green')
    expect(flagAt(UIL_CLASS_3, 82.0)).toBe('yellow')
    expect(flagAt(UIL_CLASS_3, 86.9)).toBe('yellow')
    expect(flagAt(UIL_CLASS_3, 87.0)).toBe('orange')
    expect(flagAt(UIL_CLASS_3, 90.0)).toBe('orange')
    expect(flagAt(UIL_CLASS_3, 90.1)).toBe('red')
    expect(flagAt(UIL_CLASS_3, 92.0)).toBe('red')
    expect(flagAt(UIL_CLASS_3, 92.1)).toBe('black')
  })

  it('UIL Class 2 boundaries match the 25-26 WBGT chart', () => {
    expect(flagAt(UIL_CLASS_2, 79.6)).toBe('green')
    expect(flagAt(UIL_CLASS_2, 79.7)).toBe('yellow')
    expect(flagAt(UIL_CLASS_2, 84.6)).toBe('yellow')
    expect(flagAt(UIL_CLASS_2, 84.7)).toBe('orange')
    expect(flagAt(UIL_CLASS_2, 87.6)).toBe('orange')
    expect(flagAt(UIL_CLASS_2, 87.7)).toBe('red')
    expect(flagAt(UIL_CLASS_2, 89.7)).toBe('red')
    expect(flagAt(UIL_CLASS_2, 89.8)).toBe('black')
  })

  it('GHSA boundaries match By-law 2.67 (92.0 itself is red; black is "Over 92.0")', () => {
    expect(flagAt(GHSA, 81.9)).toBe('green')
    expect(flagAt(GHSA, 82.0)).toBe('yellow')
    expect(flagAt(GHSA, 86.9)).toBe('yellow')
    expect(flagAt(GHSA, 87.0)).toBe('orange')
    expect(flagAt(GHSA, 89.9)).toBe('orange')
    expect(flagAt(GHSA, 90.0)).toBe('red')
    expect(flagAt(GHSA, 92.0)).toBe('red')
    expect(flagAt(GHSA, 92.01)).toBe('black')
  })

  it('generic NATA fallback resolves the 92.0-92.1 source gap upward (conservative)', () => {
    expect(flagAt(GENERIC_NATA, 92.0)).toBe('red')
    expect(flagAt(GENERIC_NATA, 92.05)).toBe('black')
  })
})

describe('policy oracle — guideline facts vs primary sources', () => {
  it('UIL orange caps practice at 2h with 4×4-min breaks; red caps at 1h with 20 min rest', () => {
    const orange = UIL_CLASS_3.bands.find((b) => b.flag === 'orange')!
    expect(orange.guideline.maxPracticeMinutes).toBe(120)
    expect(orange.guideline.restBreaksPerHour).toBe(4)
    expect(orange.guideline.restBreakMinMinutes).toBe(4)
    expect(orange.guideline.footballEquipment).toBe('helmet-shoulder-pads-shorts')

    const red = UIL_CLASS_3.bands.find((b) => b.flag === 'red')!
    expect(red.guideline.maxPracticeMinutes).toBe(60)
    expect(red.guideline.restMinutesPerHour).toBe(20)
    expect(red.guideline.footballEquipment).toBe('none')
    expect(red.guideline.noConditioning).toBe(true)
  })

  it('UIL mandates the rapid cooling zone from yellow upward (chart wording)', () => {
    for (const policy of [UIL_CLASS_2, UIL_CLASS_3]) {
      for (const flag of ['yellow', 'orange', 'red'] as const) {
        expect(policy.bands.find((b) => b.flag === flag)!.guideline.coolingZoneRequired).toBe(true)
      }
      expect(policy.bands.find((b) => b.flag === 'green')!.guideline.coolingZoneRequired).toBe(false)
    }
  })

  it('UIL Class 2 and Class 3 share guidelines — only thresholds differ', () => {
    for (const flag of ['green', 'yellow', 'orange', 'red', 'black'] as const) {
      expect(UIL_CLASS_2.bands.find((b) => b.flag === flag)!.guideline).toEqual(
        UIL_CLASS_3.bands.find((b) => b.flag === flag)!.guideline,
      )
    }
  })

  it('GHSA black band prohibits outdoor workouts', () => {
    expect(GHSA.bands.find((b) => b.flag === 'black')!.guideline.noOutdoorWorkouts).toBe(true)
  })

  it('every policy has exactly the five flags ordered hottest-first', () => {
    for (const policy of Object.values(POLICIES)) {
      expect(policy.bands.map((b) => b.flag)).toEqual(['black', 'red', 'orange', 'yellow', 'green'])
    }
  })
})

describe('policy oracle — measurement/compliance stance', () => {
  it('UIL explicitly allows internet/app measurement; GHSA requires a device', () => {
    expect(UIL_CLASS_2.remoteEstimatesAllowed).toBe('yes')
    expect(UIL_CLASS_3.remoteEstimatesAllowed).toBe('yes')
    expect(GHSA.remoteEstimatesAllowed).toBe('device-required')
    expect(GENERIC_NATA.remoteEstimatesAllowed).toBe('unspecified')
  })

  it('administrative constants match the sources', () => {
    expect(UIL_EFFECTIVE_DATE).toBe('2026-08-01')
    expect(UIL_READING_BEFORE_PRACTICE_MAX_MINUTES).toBe(15)
    expect(UIL_READING_INTERVAL_MINUTES).toBe(30)
    expect(GHSA_READING_INTERVAL_MINUTES).toBe(30)
    expect(GHSA_CALIBRATION_INTERVAL_YEARS).toBe(2)
  })

  it('every policy carries a primary-source URL and verification date', () => {
    for (const policy of Object.values(POLICIES)) {
      expect(policy.source.url).toMatch(/^https:\/\//)
      expect(policy.source.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe('borderline advisory (conservative bias)', () => {
  it('flags readings within the margin below the next boundary', () => {
    // UIL Class 3 yellow→orange boundary is 87.0.
    expect(isBorderline(UIL_CLASS_3, 87.0 - BORDERLINE_MARGIN_F + 0.1)).toBe(true)
    expect(isBorderline(UIL_CLASS_3, 87.0 - BORDERLINE_MARGIN_F - 0.5)).toBe(false)
  })

  it('never flags the hottest band (no band above black)', () => {
    expect(isBorderline(UIL_CLASS_3, 99)).toBe(false)
    expect(nextBandBoundary(UIL_CLASS_3, classifyWbgt(UIL_CLASS_3, 99))).toBeNull()
  })

  it('Grundstein bias constants bracket the published -1 to -3 °C in °F', () => {
    expect(REMOTE_UNDERESTIMATE_MIN_F).toBeCloseTo(1.9, 5)
    expect(REMOTE_UNDERESTIMATE_MAX_F).toBeCloseTo(5.4, 5)
  })
})
