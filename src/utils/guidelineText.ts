import type { TFunction } from 'i18next'
import type { BandGuideline, FlagColor } from '../data/policyOracle'

/**
 * Renders a band's structured guideline facts (policy oracle) into localized
 * sentences. Every number in the output comes from the oracle constants — the
 * i18n layer only holds sentence templates.
 */
export function guidelineSentences(flag: FlagColor, g: BandGuideline, t: TFunction): string[] {
  if (g.noOutdoorWorkouts) return [t('guideline.noOutdoor')]

  const out: string[] = []
  if (flag === 'green') out.push(t('guideline.normal'))
  if (flag === 'yellow') out.push(t('guideline.discretion'))
  if (g.maxPracticeMinutes !== null && g.maxPracticeMinutes > 0) {
    out.push(t('guideline.maxPracticeMinutes', { minutes: g.maxPracticeMinutes }))
  }
  if (g.restBreaksPerHour !== null && g.restBreakMinMinutes !== null) {
    out.push(t('guideline.restBreaks', { n: g.restBreaksPerHour, minutes: g.restBreakMinMinutes }))
  }
  if (g.restMinutesPerHour !== null) {
    out.push(t('guideline.restMinutes', { minutes: g.restMinutesPerHour }))
  }
  if (g.footballEquipment === 'helmet-shoulder-pads-shorts') {
    out.push(t('guideline.footballHelmetShoulderShorts'))
  }
  if (g.footballEquipment === 'none') {
    out.push(t('guideline.footballNoEquipment'))
  }
  if (g.noConditioning) out.push(t('guideline.noConditioning'))
  if (g.coolingZoneRequired) out.push(t('guideline.coolingZone'))
  return out
}

/** The single most important line for the verdict card. */
export function primaryGuideline(flag: FlagColor, g: BandGuideline, t: TFunction): string {
  return guidelineSentences(flag, g, t)[0] ?? t('guideline.normal')
}
