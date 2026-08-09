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
