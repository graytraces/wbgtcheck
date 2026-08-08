import { describe, it, expect } from 'vitest'
import en from '../locales/en.json'
import es from '../locales/es.json'
import i18n from '../i18n'
import { guidelineSentences } from '../utils/guidelineText'
import { UIL_CLASS_3, GHSA } from '../data/policyOracle'

/**
 * Oracle→copy derivation guard (content policy): guideline numbers may only
 * enter copy through interpolation from oracle constants — never hardcoded in
 * locale JSON. Complements policyOracle.test.ts (which pins the constants to
 * the primary sources).
 */

describe('guideline copy derives from the oracle', () => {
  it('guideline templates carry placeholders, not hardcoded numbers', () => {
    for (const locale of [en, es]) {
      const g = locale.guideline as Record<string, string>
      expect(g.restBreaks).toContain('{{n}}')
      expect(g.restBreaks).toContain('{{minutes}}')
      expect(g.restMinutes).toContain('{{minutes}}')
      expect(g.maxPracticeMinutes).toContain('{{minutes}}')
      // No digits in any guideline template — numbers only via interpolation.
      for (const [key, template] of Object.entries(g)) {
        expect(template, `guideline.${key} must not hardcode digits`).not.toMatch(/\d/)
      }
    }
  })

  it('rendered sentences contain the oracle numbers (UIL orange, EN)', async () => {
    await i18n.changeLanguage('en')
    const orange = UIL_CLASS_3.bands.find((b) => b.flag === 'orange')!
    const text = guidelineSentences('orange', orange.guideline, i18n.t).join(' ')
    expect(text).toContain(String(orange.guideline.maxPracticeMinutes))
    expect(text).toContain(String(orange.guideline.restBreaksPerHour))
  })

  it('rendered sentences contain the oracle numbers (GHSA red, ES)', async () => {
    await i18n.changeLanguage('es')
    const red = GHSA.bands.find((b) => b.flag === 'red')!
    const text = guidelineSentences('red', red.guideline, i18n.t).join(' ')
    expect(text).toContain(String(red.guideline.maxPracticeMinutes))
    expect(text).toContain(String(red.guideline.restMinutesPerHour))
    await i18n.changeLanguage('en')
  })

  it('no WBGT threshold literals leak into locale JSON prose', () => {
    // Threshold numbers must render from PolicyBand.sourceLabel, not copy.
    // (The GHSA FAQ 92≈104-105 comparison enters wbgtVsHi.hiBody via
    // interpolation, so no locale string may contain these literals.)
    const prose = JSON.stringify([en, es])
    for (const literal of ['79.7', '84.6', '84.7', '87.6', '87.7', '89.7', '89.8', '86.9', '89.9', '90.1', '92.1', '104-105']) {
      expect(prose, `threshold literal ${literal} hardcoded in locale JSON`).not.toContain(literal)
    }
  })

  it('all five flags have name+label in both locales', () => {
    for (const locale of [en, es]) {
      for (const flag of ['green', 'yellow', 'orange', 'red', 'black']) {
        const entry = (locale.flags as Record<string, { name: string; label: string }>)[flag]
        expect(entry?.name).toBeTruthy()
        expect(entry?.label).toBeTruthy()
      }
    }
  })

  it('safety copy never claims "safe to practice"', () => {
    const prose = JSON.stringify([en, es]).toLowerCase()
    expect(prose).not.toContain('safe to practice')
    expect(prose).not.toContain('seguro practicar')
  })
})
