import type { AqiCategory, AqiColor } from '../data/airPolicyOracle'
import { AQI_CATEGORIES } from '../data/airPolicyOracle'

/**
 * AQI swatch styling.
 *
 * The six band colors are NOT a design decision: the AirNow Data Exchange
 * Guidelines require AQI values to be "disseminated in accordance with the AQI
 * and corresponding RGB colors" from the EPA Technical Assistance Document.
 * So the hex values come straight from the oracle (AQI_CATEGORIES) rather than
 * from index.css — a Tailwind token would let a designer silently retune a
 * regulated color. This module only chooses a legible FOREGROUND for each.
 *
 * These are deliberately separate from the WBGT flag palette (FLAG_SOLID and
 * friends): the flag palette is darkened for protanopia separation, the AQI
 * palette must stay EPA-exact, and the two must never be substituted.
 *
 * Foregrounds are picked by measured contrast against each EPA color rather
 * than by convention — black on EPA red (#FF0000) is 5.25:1 and passes AA for
 * body text, while white on the same red is only 4.0:1 and does not:
 *
 *   green  #00E400 · black 12.1:1    yellow #FFFF00 · black 19.6:1
 *   orange #FF7E00 · black  8.3:1    red    #FF0000 · black  5.3:1
 *   purple #8F3F97 · white  6.3:1    maroon #7E0023 · white 11.0:1
 *
 * Color is never the only channel anyway: every AQI readout in this app is
 * rendered as swatch + numeric value + category name.
 */

const INK = '#101418'
const PAPER = '#ffffff'

const FOREGROUND: Record<AqiColor, string> = {
  green: INK,
  yellow: INK,
  orange: INK,
  red: INK,
  purple: PAPER,
  maroon: PAPER,
}

export interface AqiSwatch {
  backgroundColor: string
  color: string
}

/** Inline style for a solid AQI surface, keyed by EPA category color. */
export const AQI_SWATCH: Record<AqiColor, AqiSwatch> = Object.fromEntries(
  AQI_CATEGORIES.map((c) => [
    c.color,
    { backgroundColor: c.hex, color: FOREGROUND[c.color] },
  ]),
) as Record<AqiColor, AqiSwatch>

export function aqiSwatchFor(category: AqiCategory): AqiSwatch {
  return AQI_SWATCH[category.color]
}

/**
 * Border color for outlined AQI chips on neutral surfaces. Yellow at full
 * chroma disappears against the light page background, so the outline reuses
 * the fill for every band and relies on the text label for meaning.
 */
export function aqiOutlineFor(category: AqiCategory): { borderColor: string } {
  return { borderColor: category.hex }
}
