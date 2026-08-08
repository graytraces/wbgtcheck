/**
 * Shared guideline-sentence assembly — plain JS so scripts/prerender.mjs and
 * the React app (via utils/guidelineText.ts) build the exact same sentences
 * from the exact same oracle facts. The `t` argument is any
 * (key, params) => string lookup: i18next's t in the app, the mini-t in
 * prerender.
 *
 * @param {string} flag
 * @param {import('../data/policyOracle').BandGuideline} g
 * @param {(key: string, params?: Record<string, unknown>) => string} t
 * @returns {string[]}
 */
export function guidelineSentences(flag, g, t) {
  if (g.noOutdoorWorkouts) return [t('guideline.noOutdoor')]

  const out = []
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
