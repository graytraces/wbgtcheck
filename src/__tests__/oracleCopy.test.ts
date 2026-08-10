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
  SCHSL,
  TSSAA,
  IOWA_CATEGORY_2,
  GHSA_FAQ_WBGT_HI_COMPARISON,
  MIAA_COMPETITION_QUOTE,
  NCHSAA_REFERENCE,
  NYSPHSAA_HEAT_INDEX_REFERENCE,
  requiresOnSiteReading,
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
    //
    // The blocklist is DERIVED from the oracle rather than hand-listed: the
    // hand-written version protected exactly the states that existed when
    // someone last remembered to extend it, so a new state's thresholds would
    // have shipped unguarded. Fractional values only — whole numbers like 80
    // or 90 appear legitimately in prose (ages, minutes, years), while every
    // WBGT boundary in this oracle carries a tenth.
    const literals = new Set<string>()
    const harvest = (label: string) => {
      for (const match of label.matchAll(/\d+\.\d+/g)) literals.add(match[0])
    }
    for (const policy of Object.values(POLICIES)) {
      for (const band of policy.bands) harvest(band.sourceLabel)
    }
    for (const table of [NCHSAA_REFERENCE, NYSPHSAA_HEAT_INDEX_REFERENCE]) {
      for (const row of table.rows) harvest(row.sourceLabel)
    }
    // The GHSA FAQ comparison reaches wbgtVsHi.hiBody by interpolation, so its
    // rendered form must not be pre-baked into copy either.
    literals.add(
      `${GHSA_FAQ_WBGT_HI_COMPARISON.heatIndexMinF}-${GHSA_FAQ_WBGT_HI_COMPARISON.heatIndexMaxF}`,
    )

    // Guard the guard: an oracle refactor that renamed sourceLabel would make
    // this pass vacuously.
    expect(literals.size).toBeGreaterThanOrEqual(15)

    const prose = JSON.stringify([en, es])
    for (const literal of literals) {
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

  it('every device-stance state carries a warning matched to its own mandate', () => {
    // GA and SC had a dedicated warning paragraph; TN and IA had only a
    // sentence inside their apps prose. Structure is what gets levelled here —
    // the CLAIMS must stay different, because TSSAA and Iowa recommend where
    // GHSA and SCHSL require, and borrowing the compliance wording would
    // manufacture a mandate neither association wrote.
    for (const locale of [en, es]) {
      for (const page of ['georgia', 'southCarolina', 'tennessee', 'iowa'] as const) {
        expect(locale[page].deviceWarning?.length, `${page}.deviceWarning`).toBeGreaterThan(0)
      }
      // The strict pair may say "not accepted for compliance"; the weaker pair
      // must not.
      expect(locale.tennessee.deviceWarning.toLowerCase()).not.toMatch(
        /not accepted|no se aceptan/,
      )
      expect(locale.iowa.deviceWarning.toLowerCase()).not.toMatch(/not accepted|no se aceptan/)
    }
    expect(TSSAA.remoteEstimatesAllowed).toBe('device-recommended')
    expect(IOWA_CATEGORY_2.remoteEstimatesAllowed).toBe('device-recommended')
  })

  it('the disclaimer only names device-required states the oracle actually verified', () => {
    // It used to cite "Kentucky KHSAA" as a device-required example while
    // /states says the KHSAA documents were unreachable and asks the reader to
    // confirm directly. The site contradicted itself, and the disclaimer — the
    // page most likely to be quoted at someone — was the confident half.
    for (const locale of [en, es]) {
      expect(locale.disclaimerPage.notCompliance).not.toMatch(/KHSAA|Kentucky/i)
      // The named examples must be policies whose stance is verified primary.
      expect(locale.disclaimerPage.notCompliance).toMatch(/GHSA/)
      expect(locale.disclaimerPage.notCompliance).toMatch(/SCHSL/)
      // …and /states must still be the place that says KY is unconfirmed.
      expect(locale.states.notes.ky.length).toBeGreaterThan(0)
    }
    expect(requiresOnSiteReading(GHSA)).toBe(true)
    expect(requiresOnSiteReading(SCHSL)).toBe(true)
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

/**
 * Kentucky's off-site measurement rule has two strengths and the page knows
 * it: `footballBody` quotes the unconditional "must ... no off-site
 * measurement permitted", while `invalidBody` says the other sports get it
 * "still in the language of recommendation". The intro and the meta
 * description asserted the strong version for every sport — and the meta is
 * what search results show, so the overstatement travelled further than the
 * page that corrects it.
 *
 * The commit that split those two strengths (8108676) left a Directive saying
 * not to restate the weaker ones as unhedged. This is that Directive as a
 * test, since prose two keys away had already broken it.
 */
describe('Kentucky does not promote a football rule to all sports', () => {
  for (const [lang, dict] of [['en', en], ['es', es]] as const) {
    it(`${lang} intro and meta scope the measurement rule to football`, () => {
      for (const [name, copy] of [
        ['kentucky.intro', dict.kentucky.intro],
        ['seo.kentucky.description', dict.seo.kentucky.description],
      ] as const) {
        expect(copy, `${name} mentions the measurement rule`).toMatch(
          /off-site|off the|fuera del sitio|en el sitio|competition site|sitio de competición/i,
        )
        expect(copy, `${name} must name football as the scope`).toMatch(/football|fútbol/i)
      }
    })
  }

  it('the page still carries both strengths, not just the narrow one', () => {
    // Narrowing the intro must not quietly drop the other sports' rule.
    for (const dict of [en, es]) {
      expect(dict.kentucky.footballBody).toMatch(/\{\{quote\}\}/)
      expect(dict.kentucky.invalidBody).toMatch(/recommendation|recomendación/i)
    }
  })
})

/**
 * MIAA's competition sentence gives a ceiling and a rationale. The page used
 * to introduce it as "an explanation of why games are not held to the
 * practice time caps" — an inference, in the permissive direction, presented
 * as policy, and one the page had just contradicted by saying the table
 * governs games.
 *
 * The quote is checked first, because the silence is what makes the wording
 * wrong: if MIAA ever does address the caps, this test should fail and the
 * copy should be revisited rather than the assertion relaxed.
 */
describe('Massachusetts does not infer a competition exemption', () => {
  it('the source sentence says nothing about time caps', () => {
    expect(MIAA_COMPETITION_QUOTE).toMatch(/86\.0/)
    expect(MIAA_COMPETITION_QUOTE).not.toMatch(/minute|hour|cap|limit|duration/i)
  })

  it('the copy reports that silence instead of filling it', () => {
    expect(en.massachusetts.competitionBody).toMatch(/does not say/i)
    expect(es.massachusetts.competitionBody).toMatch(/no dice/i)
    for (const dict of [en, es]) {
      expect(dict.massachusetts.competitionBody).toMatch(/\{\{quote\}\}/)
      expect(dict.massachusetts.competitionBody).toMatch(/\{\{scope\}\}/)
    }
  })
})
