import { describe, it, expect, beforeAll } from 'vitest'
import type { ReactElement } from 'react'
import { render as renderBare, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../i18n'
import en from '../locales/en.json'
import VerdictCard from '../components/VerdictCard'
import {
  UIL_CLASS_3,
  GHSA,
  GENERIC_NATA,
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

/**
 * The card links /forecast-or-device from its device notice, so every render
 * needs a router — on the site it always has one (Home is inside the app's).
 * Wrapping here rather than at each call site keeps the existing tests reading
 * as they did.
 */
const render = (ui: ReactElement) =>
  renderBare(<MemoryRouter initialEntries={['/en']}>{ui}</MemoryRouter>)

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

  /**
   * That sentence IS the question /forecast-or-device answers, state by
   * state, and the only route to that page was two small labels 1.35 screens
   * down /states. So the sentence is the link.
   */
  it('routes the device notice to the page that answers it', () => {
    const hour: HourVerdict = {
      ...hourAt(84),
      flag: classifyWbgt(GHSA, 84).flag,
      borderline: isBorderline(GHSA, 84),
    }
    const { container } = render(
      <VerdictCard
        hour={hour}
        policy={GHSA}
        locationLabel="Atlanta, GA"
        stateAbbr="GA"
        timeZone="America/New_York"
      />,
    )
    const link = container.querySelector('a[href="/en/forecast-or-device"]')
    expect(link, 'the device notice is not a link').not.toBeNull()
    expect(link!.textContent).toContain('do NOT satisfy compliance')
  })

  it('does not raise the question where the state has answered yes', () => {
    // Texas names an internet reading, so there is no compliance notice and
    // nothing for the link to be attached to.
    const { container } = render(
      <VerdictCard
        hour={hourAt(84)}
        policy={UIL_CLASS_3}
        locationLabel="Austin, TX"
        stateAbbr="TX"
        timeZone="America/Chicago"
      />,
    )
    expect(container.querySelector('a[href="/en/forecast-or-device"]')).toBeNull()
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

/**
 * The fold answered a different question from the one being asked.
 *
 * Measured live at 8-9am local: Austin's headline said 80.0 YELLOW "Use
 * discretion" on a day peaking 93.2 BLACK "No outdoor workouts"; Miami 83.0
 * YELLOW against 90.0 RED; Birmingham 76.0 GREEN against 88.0 ORANGE. The
 * coach reading it is deciding about 4pm. The peak sat 1.7-2.5 screens down
 * inside a strip that needs 980px in a 390px scroller — 5 of 14 hours visible,
 * and the peak hour not among them. The card's own share PNG has headlined the
 * peak all along.
 */
describe('the card says where the day is going, not only where it is', () => {
  const AT = Date.parse('2026-08-10T13:00:00+00:00')
  const peakHour = (wbgtF: number, atMs: number): HourVerdict => ({
    ...hourAt(wbgtF),
    time: atMs,
    localHour: new Date(atMs).getUTCHours() - 5,
  })

  const renderWithPeak = (nowF: number, peakF: number) =>
    render(
      <VerdictCard
        hour={{ ...hourAt(nowF), time: AT }}
        policy={UIL_CLASS_3}
        locationLabel="Austin, TX"
        stateAbbr="TX"
        timeZone="America/Chicago"
        peakAhead={peakHour(peakF, AT + 6 * 3600_000)}
      />,
    )

  it('names the peak, its flag and its hour', () => {
    // 80.0 YELLOW now, 93.2 BLACK at 2pm — the Austin case, verbatim.
    renderWithPeak(80, 93.2)
    const expected = i18n.t('verdict.peakAhead', {
      value: '93.2',
      flag: en.flags[classifyWbgt(UIL_CLASS_3, 93.2).flag].label,
      time: new Intl.DateTimeFormat('en', {
        timeZone: 'America/Chicago',
        hour: 'numeric',
      }).format(new Date(AT + 6 * 3600_000)),
    })
    expect(screen.getByText(expected)).toBeInTheDocument()
    // The flag it names is not the flag on the big number — which is the
    // entire finding.
    expect(classifyWbgt(UIL_CLASS_3, 93.2).flag).not.toBe(classifyWbgt(UIL_CLASS_3, 80).flag)
  })

  it('is triple-coded and reaches the hourly view', () => {
    renderWithPeak(80, 93.2)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '#hourly-view')
    // Colour…
    const flag = classifyWbgt(UIL_CLASS_3, 93.2).flag
    expect(link.className).toContain(`bg-flag-${flag}`)
    // …icon…
    expect(link.querySelector('svg')).not.toBeNull()
    // …and the word, which is what survives every colour-vision type.
    expect(link.textContent).toContain(en.flags[flag].label)
  })

  it('says nothing when the hour on the card is already the peak', () => {
    render(
      <VerdictCard
        hour={{ ...hourAt(93.2), time: AT }}
        policy={UIL_CLASS_3}
        locationLabel="Austin, TX"
        stateAbbr="TX"
        timeZone="America/Chicago"
        peakAhead={{ ...hourAt(93.2), time: AT }}
      />,
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByText(/Rest of today peaks/)).not.toBeInTheDocument()
  })

  it('renders nothing extra for a caller that has no peak to give', () => {
    render(
      <VerdictCard
        hour={{ ...hourAt(80), time: AT }}
        policy={UIL_CLASS_3}
        locationLabel="Austin, TX"
        stateAbbr="TX"
        timeZone="America/Chicago"
      />,
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

/**
 * The card named where the reading is, when it was taken and how it was
 * obtained — and never whose rule turned it into a flag. The PNG it exports
 * has printed "Georgia GHSA" in its footer all along, so the artifact that
 * leaves the site could justify a decision and the screen it came from could
 * not. In a state with no verified policy that screen is a NATA fallback
 * rendered identically to a state mandate.
 */
describe('the card names the rule that produced the flag', () => {
  it('prints the policy beside the reading, for a state ladder and for the fallback', () => {
    for (const policy of [UIL_CLASS_3, GENERIC_NATA]) {
      const view = render(
        <VerdictCard
          hour={{ ...hourAt(84), flag: classifyWbgt(policy, 84).flag }}
          policy={policy}
          locationLabel="Somewhere, US"
          stateAbbr="OH"
          timeZone="America/Chicago"
        />,
      )
      // The same key ShareCardButton composes its footer from, so the screen
      // and the PNG cannot name the rule differently.
      expect(screen.getByText(en.verdict.wbgtLabel, { exact: false }).textContent).toContain(
        i18n.t(`policies.${policy.id}`),
      )
      view.unmount()
    }
  })

  it('distinguishes the fallback from a mandate by name', () => {
    // The point of the line: these two screens were pixel-identical apart from
    // the number, and one of them is not anybody's rule.
    expect(i18n.t('policies.generic')).not.toBe(i18n.t('policies.ghsa'))
    render(
      <VerdictCard
        hour={{ ...hourAt(84), flag: classifyWbgt(GENERIC_NATA, 84).flag }}
        policy={GENERIC_NATA}
        locationLabel="Columbus, OH"
        stateAbbr="OH"
        timeZone="America/New_York"
      />,
    )
    expect(screen.getByText(i18n.t('policies.generic'), { exact: false })).toBeInTheDocument()
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
