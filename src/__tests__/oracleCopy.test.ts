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
  KHSAA_WBGT_REFERENCE,
  CIF_CATEGORIES,
  NCHSAA_REFERENCE,
  NYSPHSAA_HEAT_INDEX_REFERENCE,
  VHSL_REFERENCE,
  FHSAA_PRACTICE_REFERENCE,
  NYSPHSAA_WBGT_CATEGORIES,
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
    for (const table of [
      NCHSAA_REFERENCE,
      NYSPHSAA_HEAT_INDEX_REFERENCE,
      KHSAA_WBGT_REFERENCE,
      // Virginia and Florida's own tables. Both states were previously told
      // their thresholds could not be published at all, so neither had a label
      // for this guard to protect — and both now print six and five of them.
      VHSL_REFERENCE,
      FHSAA_PRACTICE_REFERENCE,
    ]) {
      for (const row of table.rows) harvest(row.sourceLabel)
    }
    // NYSPHSAA's WBGT chart is three ladders and no policy id, the same shape
    // as CIF below — fifteen more labels the POLICIES loop cannot see.
    for (const category of NYSPHSAA_WBGT_CATEGORIES) {
      for (const band of category.bands) harvest(band.sourceLabel)
    }
    // CIF's three ladders are not in POLICIES — they have no policy id, which
    // is the whole reason California is outside the picker — so the loop above
    // never saw their 15 labels. Nothing has leaked yet; the guard simply did
    // not cover the state with the most threshold literals on the site.
    for (const category of CIF_CATEGORIES) {
      for (const band of category.bands) harvest(band.sourceLabel)
    }
    // The GHSA FAQ comparison reaches wbgtVsHi.hiBody by interpolation, so its
    // rendered form must not be pre-baked into copy either.
    literals.add(
      `${GHSA_FAQ_WBGT_HI_COMPARISON.heatIndexMinF}-${GHSA_FAQ_WBGT_HI_COMPARISON.heatIndexMaxF}`,
    )

    // Guard the guard: an oracle refactor that renamed sourceLabel would make
    // this pass vacuously.
    expect(literals.size).toBeGreaterThanOrEqual(30)

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

/**
 * The /states Massachusetts note describes the footnote corrected in a7ffef6,
 * and both locales garbled the thing it restricts.
 *
 * EN said "any sport whose equipment the band modifies" — "the band" means
 * the WBGT band, but this is a site about marching band, where that reading is
 * not merely available, it is the likelier one. ES inverted subject and
 * object outright ("cualquier deporte cuyo equipo modifique la banda" = the
 * sport's team modifies the band), and `equipo` reads as team before
 * equipment.
 *
 * The rule is: equipment that must be MODIFIED at that band stops games in
 * that sport. Both locales must say so without leaning on a bare "the band".
 */
describe('the Massachusetts footnote note reads the way the footnote works', () => {
  it('names the WBGT band explicitly rather than saying "the band"', () => {
    expect(en.states.notes.ma).toMatch(/WBGT band/)
    expect(es.states.notes.ma).toMatch(/banda WBGT/)
  })

  it('makes the equipment the thing modified, not the actor', () => {
    expect(en.states.notes.ma).toMatch(/protective equipment has to be modified/i)
    // `equipo` alone reads as team; the guideline copy says `equipo de
    // protección` and this note now matches it.
    expect(es.states.notes.ma).toMatch(/equipo de protección deba modificarse/i)
    // The inverted Spanish reading that shipped.
    expect(es.states.notes.ma).not.toMatch(/equipo modifique la banda/i)
  })
})

/**
 * Force parity between the locales, and between each locale and the document.
 *
 * MIAA writes "Players SHOULD BE RESTRICTED to a helmet, shoulder pads, and
 * shorts ... all protective equipment MUST BE REMOVED for conditioning" — one
 * sentence carrying both strengths. English had flattened the first half into
 * a declarative ("helmet, shoulder pads and shorts only"), and Spanish had
 * raised the cooling-zone line from "should be available" to "Debe haber",
 * which is must. Neither locale may exceed the document, and they may not
 * disagree with each other about how binding a line is.
 */
describe('translated guidelines keep the source\'s force', () => {
  it('the equipment line stays a recommendation for the restriction, a requirement for removal', () => {
    expect(en.guideline.miaaEquipmentSports).toMatch(/should be restricted/i)
    expect(en.guideline.miaaEquipmentSports).toMatch(/must be removed/i)
    expect(es.guideline.miaaEquipmentSports).toMatch(/deberían/i)
    expect(es.guideline.miaaEquipmentSports).toMatch(/debe retirarse/i)
  })

  it('the cooling-zone line is not promoted to a requirement in Spanish', () => {
    expect(en.guideline.miaaCoolingZone).toMatch(/should be available/i)
    expect(es.guideline.miaaCoolingZone).toMatch(/^Debería/)
    // "Debe haber" is must, and it shipped that way.
    expect(es.guideline.miaaCoolingZone).not.toMatch(/^Debe haber/)
  })

  /**
   * "una bandera segura" reads as a SAFE flag. The sentence is warning that
   * the flag would be unreliable, so the Spanish said the opposite of the
   * English on a safety caveat.
   */
  it('the California picker caveat does not call the flag safe in Spanish', () => {
    // The sentence this was written for MOVED when California entered the
    // picker: the caveat is no longer "we cannot flag you at all" but "the
    // flag you are looking at is a strict placeholder until you answer". The
    // Spanish failure mode is unchanged, so the assertion follows the caveat
    // to its new home rather than being deleted with the old key.
    for (const dict of [en, es]) {
      expect(dict.california.categoryPickerBody.length).toBeGreaterThan(0)
      expect(dict.policies.categoryPrompt.spread.length).toBeGreaterThan(0)
    }
    expect(es.california.categoryPickerBody).not.toMatch(/bandera segura/i)
    expect(es.policies.categoryPrompt.spread).not.toMatch(/bandera segura/i)
    expect(es.policies.categoryPrompt.pending).not.toMatch(/bandera segura/i)
  })
})

/**
 * Meta descriptions are trimmed to fit 160 characters, and the trims had
 * drifted apart: Spanish North Carolina ended "y por qué queda fuera." with
 * nothing to say what it was outside of, Spanish Massachusetts had lost the
 * WBGT term entirely while English kept it, and English Iowa had dropped
 * cheerleading while Spanish kept it. Same page, different facts per language.
 */
describe('meta descriptions survive their trim in both languages', () => {
  it('no description ends on a dangling preposition or article', () => {
    for (const [lang, dict] of [['en', en], ['es', es]] as const) {
      for (const [key, entry] of Object.entries(dict.seo)) {
        const description = (entry as { description?: string }).description
        if (!description) continue
        expect(description.trim(), `${lang}/${key} ends mid-phrase`).not.toMatch(
          /\b(de|del|la|el|los|las|y|en|con|por qué queda fuera|of|the|and|why it sits outside)\.$/i,
        )
      }
    }
  })

  it('both locales keep the same load-bearing terms per page', () => {
    expect(en.seo.massachusetts.description).toMatch(/wet bulb globe|WBGT/i)
    expect(es.seo.massachusetts.description).toMatch(/bulbo húmedo|WBGT/i)
    expect(en.seo.iowa.description).toMatch(/cheer/i)
    expect(es.seo.iowa.description).toMatch(/porristas/i)
    expect(es.seo.northCarolina.description).toMatch(/selector/i)
    expect(en.seo.northCarolina.description).toMatch(/picker/i)
  })
})

/**
 * Three places where this site stated a rule more broadly than the document.
 */
describe('scope claims match the documents', () => {
  it('Kentucky names the four sports its measurement rule reaches', () => {
    // KHSAA's matrix puts the rule in football (must) and in cross country,
    // field hockey and soccer (strong recommendation). The ALL OUTDOOR SPORTS
    // column has no measurement-location rule, so baseball, tennis, golf and
    // marching band get nothing — "the other sports" swept them all in.
    for (const [copy, name] of [
      [en.kentucky.intro, 'en intro'],
      [en.states.notes.ky, 'en note'],
    ] as const) {
      expect(copy, name).toMatch(/cross country/i)
      expect(copy, name).toMatch(/field hockey/i)
      expect(copy, name).not.toMatch(/the other sports/i)
    }
    for (const [copy, name] of [
      [es.kentucky.intro, 'es intro'],
      [es.states.notes.ky, 'es note'],
    ] as const) {
      expect(copy, name).toMatch(/campo traviesa/i)
      expect(copy, name).not.toMatch(/los demás deportes/i)
    }
    expect(en.states.notes.ky).toMatch(/all-sports column sets no measurement-location rule/i)
  })

  it('the Massachusetts footnote says games SHOULD not occur, not that they stop', () => {
    // Source: "If equipment modifications are necessary, no games should
    // occur for that sport." The English note had promoted should to a stop —
    // the same overreach this project bans in translation, in the original.
    expect(en.states.notes.ma).toMatch(/games should not occur/i)
    expect(en.states.notes.ma).not.toMatch(/stops games entirely/i)
    expect(es.states.notes.ma).toMatch(/no deberían jugarse partidos/i)
  })

  /**
   * MIAA §2 contrasts competition with "continuous 1 to 2 hour practices",
   * and 1 and 2 hours ARE the table's caps — so the document is not silent
   * about them, it just never says how they apply to a game. "Nothing about
   * the caps" overshot; the narrower claim is the true one.
   */
  it('does not claim MIAA is silent about the caps, only about their application', () => {
    expect(en.massachusetts.competitionBody).toMatch(/does not say is how the practice time caps apply/i)
    expect(en.massachusetts.competitionBody).not.toMatch(/nothing about the caps/i)
    expect(es.massachusetts.competitionBody).not.toMatch(/nada sobre los topes/i)
  })

  it('the conditional legend covers delegation and silence, not just recommendation', () => {
    // FL requires monitoring year-round (not conditional), MD delegates, and
    // NJ/LA never use the term. One definition covered none of them.
    expect(en.states.legendMandateConditional).toMatch(/delegated/i)
    expect(en.states.legendMandateConditional).toMatch(/never uses the term/i)
    expect(es.states.legendMandateConditional).toMatch(/delega/i)
  })
})
