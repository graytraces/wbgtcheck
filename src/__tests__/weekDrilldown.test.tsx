import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, fireEvent, within } from '@testing-library/react'
import i18n from '../i18n'
import en from '../locales/en.json'
import es from '../locales/es.json'
import {
  installMemoryStorage,
  stubForecastFetch,
  renderHome,
  aqiFixture,
  AUSTIN_TX,
} from '../test/homeFixture'

/**
 * Week → hour drill-down (P1-11).
 *
 * A week cell shows one flag: that day's peak. For a band director planning a
 * Monday evening rehearsal, "Monday peaks BLACK at 3pm" and "Monday is BLACK
 * all evening" are different decisions, and before this there was no way to
 * tell them apart — neither strip had a single button, link or ARIA role. The
 * site's own copy promises planning tomorrow with tonight's forecast.
 */

let store: Map<string, string>

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  store = installMemoryStorage()
  store.set('wbgt-location', JSON.stringify(AUSTIN_TX))
  store.set('wbgt-uil-class', JSON.stringify('uil-class-3'))
  store.set('wbgt-policy', JSON.stringify('uil-class-3'))
  stubForecastFetch({ aqi: aqiFixture() })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function week() {
  renderHome()
  await waitFor(() => expect(screen.getByText(en.verdict.weekHeading)).toBeInTheDocument())
  return within(screen.getByLabelText(en.verdict.weekHeading)).getAllByRole('button')
}

describe('week strip drill-down', () => {
  it('every day is a real control, and today is the one showing', async () => {
    const days = await week()
    expect(days.length).toBeGreaterThan(1)
    // Exactly one day is marked as the day on screen.
    const pressed = days.filter((d) => d.getAttribute('aria-pressed') === 'true')
    expect(pressed).toHaveLength(1)
    expect(pressed[0]).toBe(days[0])
    // Each day names the hourly view it drives.
    for (const day of days) {
      expect(day).toHaveAttribute('aria-controls', 'hourly-view')
    }
    expect(screen.getByText(en.verdict.todayHeading)).toBeInTheDocument()
  })

  it('choosing a later day retargets the hourly view and says which day it is', async () => {
    const days = await week()
    fireEvent.click(days[2])

    // The heading stops saying "Today" and names the weekday instead.
    expect(screen.queryByText(en.verdict.todayHeading)).not.toBeInTheDocument()
    const heading = screen.getByRole('heading', {
      name: new RegExp(en.verdict.dayHeading.replace('{{day}}', '\\w+')),
    })
    expect(heading).toBeInTheDocument()
    expect(days[2]).toHaveAttribute('aria-pressed', 'true')
    expect(days[0]).toHaveAttribute('aria-pressed', 'false')
  })

  it('the hourly view changes content, not just its label', async () => {
    const days = await week()
    const hourly = () =>
      within(document.getElementById('hourly-view')!).getAllByRole('listitem').length
    const todayHours = hourly()
    expect(todayHours).toBeGreaterThan(0)
    fireEvent.click(days[2])
    expect(hourly()).toBeGreaterThan(0)
    // The "now" ring belongs to today only — a later day has no current hour.
    fireEvent.click(days[0])
    expect(screen.getByText(en.verdict.todayHeading)).toBeInTheDocument()
  })

  it('is reachable by keyboard', async () => {
    const days = await week()
    days[1].focus()
    expect(document.activeElement).toBe(days[1])
    fireEvent.click(days[1])
    expect(days[1]).toHaveAttribute('aria-pressed', 'true')
  })

  it('tells the reader the cells are tappable and what they summarise', () => {
    for (const locale of [en, es]) {
      expect(locale.verdict.weekDrillHint.length).toBeGreaterThan(0)
      expect(locale.verdict.dayShowHours.length).toBeGreaterThan(0)
    }
  })
})

describe('the share card follows the day on screen', () => {
  it('titles today as today, and a later day by its weekday', async () => {
    const days = await week()
    // Today first: the card keeps the "today" title.
    expect(screen.getByRole('button', { name: en.share.download })).toBeInTheDocument()

    fireEvent.click(days[2])
    // The heading proves the view moved; the share button follows the same
    // selectedDay, so a Tuesday card can no longer be titled "Today's heat
    // flags" — wrong the moment it lands in a team chat.
    expect(screen.queryByText(en.verdict.todayHeading)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: en.share.download })).toBeInTheDocument()
    expect(en.share.dayFlags).toContain('{{day}}')
    expect(es.share.dayFlags).toContain('{{day}}')
  })
})
