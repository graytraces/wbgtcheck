import { describe, it, expect } from 'vitest'
import en from '../locales/en.json'
import es from '../locales/es.json'
import i18n from '../i18n'
import { guidelineSentences } from '../utils/guidelineText'
import {
  POLICIES,
  UIL_CLASS_3,
  UIL_MANDATE_2026_QUOTE,
  GHSA,
  REMOTE_UNDERESTIMATE_MIN_C,
  REMOTE_UNDERESTIMATE_MAX_C,
} from '../data/policyOracle'

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
    for (const literal of [
      '79.7',
      '79.8',
      '84.6',
      '84.7',
      '84.9',
      '87.6',
      '87.7',
      '87.9',
      '89.7',
      '89.8',
      '86.9',
      '89.9',
      '90.1',
      '92.1',
      '104-105',
    ]) {
      expect(prose, `threshold literal ${literal} hardcoded in locale JSON`).not.toContain(literal)
    }
  })

  it('extraKeys sentences stay number-free (numbers must come from the oracle)', () => {
    // Bands carry extraKeys for requirements the shared fields cannot express.
    // Those strings render verbatim with no interpolation, so a digit in one
    // would be an unsourced number in safety copy.
    const keys = new Set<string>()
    for (const policy of Object.values(POLICIES)) {
      for (const band of policy.bands) {
        for (const key of band.guideline.extraKeys ?? []) keys.add(key)
      }
    }
    expect(keys.size).toBeGreaterThan(0)
    for (const locale of [en, es]) {
      for (const key of keys) {
        const leaf = key
          .split('.')
          .reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], locale)
        expect(typeof leaf, `${key} missing from a locale`).toBe('string')
        expect(leaf as string, `${key} must not hardcode digits`).not.toMatch(/\d/)
      }
    }
  })

  it('every policy in the picker has a display name in both locales', () => {
    for (const id of Object.keys(POLICIES)) {
      // Record<string, unknown>: policies also holds nested copy blocks
      // (classPrompt), so it is not a flat string map.
      expect((en.policies as Record<string, unknown>)[id], `en policies.${id}`).toBeTruthy()
      expect((es.policies as Record<string, unknown>)[id], `es policies.${id}`).toBeTruthy()
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

  it("Texas cadence copy keeps the plan's must/should split (both locales)", () => {
    // The plan requires the pre-practice reading but only recommends the ones
    // during practice. Copy that flattens both into "required" claims more
    // obligation than the source carries — the unsafe direction on a page a
    // coach may cite to an administrator.
    expect(en.texas.recordkeepingNote).toContain('must be taken')
    expect(en.texas.recordkeepingNote).toContain('should be taken')
    expect(en.texas.recordkeepingNote.toLowerCase()).not.toContain('cadence is required')
    expect(es.texas.recordkeepingNote).toContain('debe tomarse')
    expect(es.texas.recordkeepingNote).toContain('deberían tomarse')
    expect(es.texas.recordkeepingNote.toLowerCase()).not.toContain('cadencia es obligatoria')
  })

  it('the home page addresses marching band, the segment with no competitor', () => {
    // The guides named band directors; the home page's rendered DOM did not
    // contain "band" once — H1, meta description and all four sections spoke
    // only to coaches and trainers. UIL's 2026-27 standard names marching band
    // explicitly, so the claim is the oracle's, not ours.
    expect(UIL_MANDATE_2026_QUOTE).toContain('marching band')
    expect(en.home.intro.toLowerCase()).toContain('marching band')
    expect(en.home.sections[2].body.toLowerCase()).toContain('marching band')
    expect(en.seo.home.description.toLowerCase()).toContain('marching band')
    expect(es.home.intro.toLowerCase()).toContain('banda de marcha')
    expect(es.home.sections[2].body.toLowerCase()).toContain('banda de marcha')
    expect(es.seo.home.description.toLowerCase()).toContain('banda de marcha')
  })

  it('the home measurement note carries the no-approval-list caveat', () => {
    // The home copy used to read "UIL explicitly allows ... forecasts like this
    // one may be used for planning AND READINGS", which claims more than the
    // site's own verification supports: the FAQ says "approved internet-based
    // WBGT forecasting resource" and neither UIL document defines "approved"
    // or lists approved resources. /texas states that limit correctly; the home
    // page was the one surface that overrode it.
    expect(en.measurement.uilApps).toContain('approved')
    expect(en.measurement.uilApps.toLowerCase()).toContain("district's call")
    expect(es.measurement.uilApps).toContain('aprobado')
    expect(es.measurement.uilApps.toLowerCase()).toContain('decisión de su distrito')
    for (const locale of [en, es]) {
      // No surface may present the forecast as usable AS the official reading.
      expect(locale.measurement.uilApps.toLowerCase()).not.toContain('may be used for planning and readings')
      expect(locale.measurement.uilApps.toLowerCase()).not.toContain('planificación y lectura')
    }
  })

  it('the UIL-linked tool is presented as a link, never as an approval', () => {
    // Naming the one tool UIL links is honest; letting it read as an
    // endorsement would manufacture the approval the documents never give.
    expect(en.texas.linkedToolNote.toLowerCase()).toContain('not an approval')
    expect(es.texas.linkedToolNote.toLowerCase()).toContain('no una aprobación')
    // The no-approval-list caveat has to survive alongside it.
    expect(en.texas.legalityNoList).toContain('approved')
    expect(es.texas.legalityNoList).toContain('aprobado')
  })

  it('bias copy claims a range and nothing about its shape', () => {
    // The oracle documents "Published range: −1 to −3 °C" and nothing more —
    // the paper sits behind Wiley's Cloudflare block and has never been read
    // from here. Two strings had drifted into "about {{min}} °C low ON AVERAGE"
    // and "up to {{max}} °C low IN THE HOTTEST CONDITIONS": distribution
    // claims the site cannot support. verdict.conservativeNotice is frozen
    // copy and already phrases it honestly; these two now follow it.
    const banned = [
      /on average/i,
      /hottest conditions/i,
      /most dangerous conditions/i,
      /en promedio/i,
      /condiciones más calurosas/i,
      /condiciones más peligrosas/i,
    ]
    for (const locale of [en, es]) {
      for (const s of [locale.home.sections[1].body, locale.disclaimerPage.notMeasurement]) {
        for (const pattern of banned) {
          expect(s, `unsupported distribution claim: ${s.slice(0, 70)}…`).not.toMatch(pattern)
        }
      }
    }
  })

  it('Grundstein bias copy interpolates from the oracle (no digit literals in the 6 strings)', () => {
    for (const locale of [en, es]) {
      const strings = [
        locale.verdict.conservativeNotice,
        locale.disclaimerPage.notMeasurement,
        locale.home.sections[1].body,
      ]
      for (const s of strings) {
        expect(s).toContain('{{min}}')
        expect(s).toContain('{{max}}')
        expect(s, `bias string must not hardcode digits: ${s.slice(0, 60)}…`).not.toMatch(
          /\d\s*°C/,
        )
      }
    }
  })

  it('rendered bias copy carries the oracle constants (EN + ES)', async () => {
    const params = { min: REMOTE_UNDERESTIMATE_MIN_C, max: REMOTE_UNDERESTIMATE_MAX_C }
    for (const lang of ['en', 'es']) {
      await i18n.changeLanguage(lang)
      const rendered = i18n.t('verdict.conservativeNotice', params)
      expect(rendered).toContain(String(REMOTE_UNDERESTIMATE_MIN_C))
      expect(rendered).toContain(String(REMOTE_UNDERESTIMATE_MAX_C))
      expect(rendered).not.toContain('{{')
    }
    await i18n.changeLanguage('en')
  })
})
