export function cToF(c: number): number {
  return c * 1.8 + 32
}

export function cToK(c: number): number {
  return c + 273.15
}

export function kmhToMs(kmh: number): number {
  return kmh / 3.6
}

/**
 * The single display form for a WBGT reading, everywhere one appears.
 *
 * Whole-degree rounding put two numbers for the same reading on one screen —
 * the verdict card said 87 while the log button beside it said 86.6 — and
 * worse, it could contradict the chart it derives from: a reading of 89.6
 * displays as "90" but carries the ORANGE flag, while every UIL chart says red
 * begins at 89.8. Someone checking the site against their association's PDF
 * would find the site wrong. The bands are specified to a tenth, so readings
 * are shown to a tenth.
 */
export function formatWbgtF(wbgtF: number): string {
  return wbgtF.toFixed(1)
}

/**
 * The printed reading, back as a number — the value every flag must be derived
 * from.
 *
 * The whole-degree fix above left a half-tenth window behind: `formatWbgtF`
 * printed `toFixed(1)` while the classifier still read the raw float, so a
 * reading in [minF − 0.05, minF) rendered AS the boundary while carrying the
 * band below it. A UIL Class 3 reading of 86.95 printed "87.0 °F" beside a
 * YELLOW flag, and the chart the coach is holding says 87.0-90.0 is ORANGE —
 * wrong in the permissive direction, at every inclusive lower bound of every
 * policy.
 *
 * Deliberately defined as `Number(formatWbgtF(x))` rather than an independent
 * `Math.round(x * 10) / 10`: two roundings of the same double can disagree at
 * a tie, and the entire point is that the flag comes from the characters on
 * screen. Change the format and the classification follows it.
 */
export function displayedWbgtF(wbgtF: number): number {
  return Number(formatWbgtF(wbgtF))
}
