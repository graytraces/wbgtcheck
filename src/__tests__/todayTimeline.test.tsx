import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import i18n from '../i18n'
import TodayTimeline from '../components/TodayTimeline'
import type { HourVerdict } from '../utils/verdict'

/**
 * Triple-coding guard for the hour chips (AGENTS.md rule ②: colour + icon +
 * text label, never colour alone).
 *
 * The chips are too narrow for a visible flag word, so the label is sr-only.
 * That is the ONLY channel assistive tech has here: the icon is aria-hidden
 * and `title` is not reliably announced and cannot be hovered on touch. A
 * previous review closed this as "no change needed" on colour-vision grounds
 * alone — correct about colour, silent about screen readers. If these
 * assertions fail, the flag name was removed from the chip; restore it rather
 * than relaxing the test.
 */

function hour(flag: HourVerdict['flag'], wbgtF: number, localHour: number): HourVerdict {
  return {
    time: Date.parse(`2026-08-10T${String(localHour).padStart(2, '0')}:00:00+00:00`),
    wbgtF,
    source: 'nws',
    tempF: null,
    flag,
    borderline: false,
    localHour,
    localDate: '2026-08-10',
  }
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('TodayTimeline hour chips are readable without colour', () => {
  it('every chip carries its flag name as text, not only in a title attribute', () => {
    const hours = [
      hour('green', 78, 8),
      hour('yellow', 84, 10),
      hour('orange', 88, 12),
      hour('red', 91, 14),
      hour('black', 94, 16),
    ]
    render(<TodayTimeline hours={hours} />)

    // One accessible flag name per chip, in the rendered DOM.
    for (const flag of ['green', 'yellow', 'orange', 'red', 'black'] as const) {
      const name = i18n.t(`flags.${flag}.name`)
      expect(screen.getByText(name), `${flag} chip must expose its flag name`).toBeInTheDocument()
    }
  })

  it('the threshold chips (orange and above) pair the name with the reading', () => {
    // Orange-and-above is where the guidance actually bites, so those chips
    // must carry both channels a non-visual reader can use.
    const hours = [hour('orange', 88, 12), hour('red', 91, 14), hour('black', 94, 16)]
    render(<TodayTimeline hours={hours} />)

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)

    const expected = [
      { flag: 'orange', value: '88' },
      { flag: 'red', value: '91' },
      { flag: 'black', value: '94' },
    ] as const
    expected.forEach(({ flag, value }, i) => {
      const chip = within(items[i])
      expect(chip.getByText(i18n.t(`flags.${flag}.name`))).toBeInTheDocument()
      expect(chip.getByText(value)).toBeInTheDocument()
    })
  })
})
