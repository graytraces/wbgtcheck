import { describe, it, expect } from 'vitest'
import { defaultPolicyFor, policyMatchesState } from '../hooks/useWbgt'
import {
  POLICIES,
  UIL_CLASS_2,
  UIL_CLASS_3,
  FHSAA,
  FHSAA_NO_OUTDOOR_WBGT_F,
  GENERIC_NATA,
  classifyWbgt,
} from '../data/policyOracle'

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
    // MIAA: one statewide policy, no sub-categories, every band stricter than
    // the generic fallback — safe to select without asking.
    expect(defaultPolicyFor('MA')).toBe('miaa')
    // FHSAA §41.8: five bands onto five flags, no question to ask first.
    expect(defaultPolicyFor('FL')).toBe('fhsaa')
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
    for (const state of ['TX', 'GA', 'SC', 'IA', 'MA', 'FL', 'TN', 'NC', 'NY', null]) {
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
    expect(policyMatchesState('MA', 'miaa')).toBe(true)
    expect(policyMatchesState('FL', 'fhsaa')).toBe(true)
    expect(policyMatchesState('FL', 'generic')).toBe(false)
    expect(policyMatchesState('MA', 'ghsa')).toBe(false)
    expect(policyMatchesState('GA', 'uil-class-3')).toBe(false)
  })

  it('states with no default never claim a policy, so moving there re-derives', () => {
    expect(policyMatchesState('CO', 'generic')).toBe(false)
    expect(policyMatchesState(null, 'generic')).toBe(false)
  })
})

/**
 * TSSAA is a picker option that is never auto-selected, and policyMatchesState
 * did not know it. A Tennessee reader who chose TSSAA lost the choice the next
 * time a ZIP was entered — it fell back to generic silently. The flags are
 * identical between the two, so nothing on screen looked wrong; what went was
 * the guideline wording and the policy name on the share card.
 */
describe('an explicit choice survives re-location', () => {
  it('keeps TSSAA for a Tennessee reader', () => {
    expect(policyMatchesState('TN', 'tssaa')).toBe(true)
    expect(policyMatchesState('TN', 'generic')).toBe(false)
  })

  it('covers every state whose policy the picker can select', () => {
    // Derived from the picker map: any state with a selectable ladder must be
    // able to hold onto it, or the choice is lost on the next ZIP.
    const selectable: Array<[string, string]> = [
      ['TX', 'uil-class-2'],
      ['GA', 'ghsa'],
      ['SC', 'schsl'],
      ['IA', 'iowa'],
      ['MA', 'miaa'],
      ['FL', 'fhsaa'],
      ['TN', 'tssaa'],
    ]
    for (const [abbr, id] of selectable) {
      expect(policyMatchesState(abbr, id as never), `${abbr} loses ${id}`).toBe(true)
    }
  })

  it('does not claim a match for a state with no policy of its own', () => {
    for (const abbr of ['CA', 'KY', 'NC', 'NY', 'VA', 'CO']) {
      expect(policyMatchesState(abbr, 'generic')).toBe(false)
    }
  })
})

/**
 * Auto-selecting Florida, and the reason it is defensible — which is NOT the
 * reason Massachusetts and Iowa are.
 *
 * MIAA and Iowa were safe to select unasked partly because every band of each
 * is stricter than the generic NATA fallback. Florida is not, and a comment
 * claiming it was would be the kind of unchecked reassurance this repo keeps
 * finding. At exactly two readings in the whole published range — 87.0 and
 * 90.0 — FHSAA reads one band COOLER than the fallback, because FHSAA prints
 * those temperatures as the top of the band below ("82.1 - 87.0",
 * "87.1 - 90.0") while NATA prints them as the bottom of the band above.
 *
 * Both sites are faithful to their own chart, and Policy 41 is the chart a
 * Florida school answers to. The point of pinning it is that the divergence is
 * a KNOWN and bounded two tenths rather than something discovered later and
 * mistaken for a regression.
 */
describe('what the Florida default changes for a Florida reader', () => {
  const FLAGS = ['green', 'yellow', 'orange', 'red', 'black'] as const

  it('differs from the NATA fallback at exactly the two named edges', () => {
    const differing: string[] = []
    for (let tenth = 780; tenth <= 950; tenth += 1) {
      const wbgtF = tenth / 10
      if (classifyWbgt(FHSAA, wbgtF).flag !== classifyWbgt(GENERIC_NATA, wbgtF).flag) {
        differing.push(wbgtF.toFixed(1))
      }
    }
    expect(differing).toEqual(['87.0', '90.0'])
    // …and at both, FHSAA is the cooler flag, matching its own printed row.
    for (const wbgtF of [87.0, 90.0]) {
      const fl = classifyWbgt(FHSAA, wbgtF)
      const nata = classifyWbgt(GENERIC_NATA, wbgtF)
      expect(FLAGS.indexOf(fl.flag), `${wbgtF}`).toBeLessThan(FLAGS.indexOf(nata.flag))
      // The row label a coach would check this against names the value as its
      // upper bound, which is why the cooler flag is the faithful one.
      expect(fl.sourceLabel).toContain(wbgtF.toFixed(1))
    }
  })

  it('is the same flag as the fallback everywhere else in the range', () => {
    // The change a Florida reader actually experiences is the guidance and the
    // named policy, not a wholesale re-flagging — worth knowing before anyone
    // reads the two edges above as a big move.
    let same = 0
    for (let tenth = 780; tenth <= 950; tenth += 1) {
      const wbgtF = tenth / 10
      if (classifyWbgt(FHSAA, wbgtF).flag === classifyWbgt(GENERIC_NATA, wbgtF).flag) same += 1
    }
    expect(same).toBe(171 - 2)
  })

  it('and the top band still stops outdoor activity where §41.8 says', () => {
    expect(classifyWbgt(FHSAA, FHSAA_NO_OUTDOOR_WBGT_F).flag).toBe('black')
    expect(
      classifyWbgt(FHSAA, FHSAA_NO_OUTDOOR_WBGT_F).guideline.noOutdoorWorkouts,
    ).toBe(true)
    // A tenth below it is red, not black: 92.0 is the printed top of the
    // 90.1-92.0 row.
    expect(classifyWbgt(FHSAA, 92.0).flag).toBe('red')
  })
})
