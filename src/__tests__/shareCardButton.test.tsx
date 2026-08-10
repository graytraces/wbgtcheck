import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from '../i18n'
import en from '../locales/en.json'
import es from '../locales/es.json'
import ShareCardButton from '../components/ShareCardButton'
import { annotateHours, groupByDay } from '../utils/verdict'
import type { HourPoint } from '../utils/nws'
import { GENERIC_NATA } from '../data/policyOracle'

/**
 * The button that offers the card has to name the day the card is of.
 *
 * The PNG title already followed the selected day; the button offering it still
 * said "today", so drilling into Thursday and tapping Share produced a file
 * captioned Thursday from a control that promised today's flags. It goes into a
 * team chat, where it outlives the screen it came from.
 *
 * `verdict.shareButtonDay` appeared in no test file at all — the string existed
 * and nothing rendered it.
 */

const TZ = 'America/Chicago'
// 2026-08-13 is a Thursday; noon local keeps it inside the timeline window.
const NOON = Date.parse('2026-08-13T17:00:00+00:00')

function day() {
  const points: HourPoint[] = [0, 1, 2].map((i) => ({
    time: NOON + i * 3_600_000,
    wbgtF: 88.4,
    source: 'nws',
    tempF: null,
  }))
  const [only] = groupByDay(annotateHours(points, GENERIC_NATA, TZ))
  return only
}

function renderButton(isToday: boolean) {
  return render(
    <ShareCardButton
      day={day()}
      policy={GENERIC_NATA}
      locationLabel="Austin, TX"
      isToday={isToday}
    />,
  )
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('the share button names the day it shares', () => {
  it('says "today" only when the selected day is today', () => {
    renderButton(true)
    expect(screen.getByRole('button', { name: en.verdict.shareButton })).toBeInTheDocument()
  })

  it('names the weekday once the reader has drilled into another day', () => {
    const view = renderButton(false)
    const weekday = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(
      new Date(`${day().date}T12:00:00`),
    )
    expect(weekday).toBe('Thursday')
    expect(
      screen.getByRole('button', { name: i18n.t('verdict.shareButtonDay', { day: weekday }) }),
    ).toBeInTheDocument()
    // And it must stop making the claim it can no longer support.
    expect(screen.queryByRole('button', { name: en.verdict.shareButton })).not.toBeInTheDocument()
    view.unmount()
  })

  it('carries the day-named label in both locales, with the day interpolated', () => {
    for (const dict of [en, es]) {
      expect(dict.verdict.shareButtonDay).toContain('{{day}}')
      expect(dict.verdict.shareButtonDay).not.toBe(dict.verdict.shareButton)
    }
  })
})
