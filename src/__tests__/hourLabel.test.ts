import { describe, it, expect } from 'vitest'
import { hourLabel } from '../utils/hourLabel'

/**
 * The strip's labels were hardcoded English 12-hour ("10a", "4p") in every
 * locale, directly under a header that renders through Intl — so a Spanish
 * page showed "10a" above and "A LAS 16:00" below. One screen, two clock
 * conventions, and the strip was using the wrong one for the language.
 */
describe('hourLabel', () => {
  it('keeps the compact 12-hour form in English', () => {
    expect(hourLabel(0, 'en')).toBe('12a')
    expect(hourLabel(9, 'en')).toBe('9a')
    expect(hourLabel(12, 'en')).toBe('12p')
    expect(hourLabel(16, 'en')).toBe('4p')
    expect(hourLabel(23, 'en')).toBe('11p')
  })

  it('uses the 24-hour clock in Spanish, matching the verdict header', () => {
    expect(hourLabel(0, 'es')).toBe('00')
    expect(hourLabel(9, 'es')).toBe('09')
    expect(hourLabel(16, 'es')).toBe('16')
    expect(hourLabel(23, 'es')).toBe('23')
    // No English meridiem markers leak into the Spanish strip.
    for (let h = 0; h < 24; h++) expect(hourLabel(h, 'es')).not.toMatch(/[ap]/)
  })

  it('stays short enough for a 64px chip in both locales', () => {
    for (let h = 0; h < 24; h++) {
      expect(hourLabel(h, 'en').length).toBeLessThanOrEqual(3)
      expect(hourLabel(h, 'es').length).toBe(2)
    }
  })

  it('falls back to the English form for an unusable locale tag', () => {
    expect(hourLabel(16, 'not-a-locale!!')).toBe('4p')
  })
})
