import { describe, it, expect } from 'vitest'
import { defaultPolicyFor, policyMatchesState } from '../hooks/useWbgt'
import { POLICIES, UIL_CLASS_2, UIL_CLASS_3, classifyWbgt } from '../data/policyOracle'

/**
 * Which policy a location gets BEFORE the user picks one.
 *
 * These two functions decide the flag every first-time visitor sees, and until
 * now nothing reached them — the suite could stay green while the Texas
 * default was relaxed. That default is the one that matters: UIL assigns
 * Class 2 or Class 3 by county, no machine-readable list exists, and the two
 * ladders disagree by a full band in the range Texas actually sits in during
 * August. Class 2 is the stricter of the two, so it is the only safe guess.
 */

describe('default policy per state', () => {
  it('Texas defaults to the STRICTER UIL class', () => {
    expect(defaultPolicyFor('TX')).toBe('uil-class-2')
  })

  it('the Texas default is strict in the direction that matters', () => {
    // Same reading, two ladders: Class 2 caps practice and bans equipment
    // where Class 3 still allows a two-hour session. Defaulting to Class 3
    // would hand an unasked user the more permissive of two possible answers.
    const wbgtF = 88
    const class2 = classifyWbgt(UIL_CLASS_2, wbgtF)
    const class3 = classifyWbgt(UIL_CLASS_3, wbgtF)
    expect(class2.flag).toBe('red')
    expect(class3.flag).toBe('orange')
    expect(class2.guideline.maxPracticeMinutes).toBeLessThan(
      class3.guideline.maxPracticeMinutes as number,
    )
    expect(class2.guideline.footballEquipment).toBe('none')
    expect(POLICIES[defaultPolicyFor('TX')]).toBe(UIL_CLASS_2)
  })

  it('states with a verified association policy get it; everyone else gets the generic fallback', () => {
    expect(defaultPolicyFor('GA')).toBe('ghsa')
    expect(defaultPolicyFor('SC')).toBe('schsl')
    expect(defaultPolicyFor('IA')).toBe('iowa')
    expect(defaultPolicyFor('CO')).toBe('generic')
    expect(defaultPolicyFor(null)).toBe('generic')
    // NC and NY are deliberately absent from the picker (incompatible scales),
    // so they must fall through to the generic band set rather than to a
    // confidently wrong state policy.
    expect(defaultPolicyFor('NC')).toBe('generic')
    expect(defaultPolicyFor('NY')).toBe('generic')
    // TN has a policy in the picker but is not auto-selected: TSSAA lets a
    // school choose WBGT or heat index, so the site does not pick for them.
    expect(defaultPolicyFor('TN')).toBe('generic')
  })

  it('every default is a policy the picker actually offers', () => {
    for (const state of ['TX', 'GA', 'SC', 'IA', 'TN', 'NC', 'NY', null]) {
      expect(POLICIES[defaultPolicyFor(state)]).toBeDefined()
    }
  })
})

describe('policy ownership by state', () => {
  it('either UIL class counts as a Texas choice, so re-locating within Texas keeps it', () => {
    expect(policyMatchesState('TX', 'uil-class-2')).toBe(true)
    expect(policyMatchesState('TX', 'uil-class-3')).toBe(true)
    expect(policyMatchesState('TX', 'ghsa')).toBe(false)
    expect(policyMatchesState('TX', 'generic')).toBe(false)
  })

  it('single-policy states match only their own', () => {
    expect(policyMatchesState('GA', 'ghsa')).toBe(true)
    expect(policyMatchesState('SC', 'schsl')).toBe(true)
    expect(policyMatchesState('IA', 'iowa')).toBe(true)
    expect(policyMatchesState('GA', 'uil-class-3')).toBe(false)
  })

  it('states with no default never claim a policy, so moving there re-derives', () => {
    expect(policyMatchesState('CO', 'generic')).toBe(false)
    expect(policyMatchesState(null, 'generic')).toBe(false)
  })
})
