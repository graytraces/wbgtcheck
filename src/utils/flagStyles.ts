import {
  CircleCheck,
  TriangleAlert,
  OctagonAlert,
  Flame,
  OctagonX,
  type LucideIcon,
} from 'lucide-react'
import type { FlagColor } from '../data/policyOracle'

/**
 * Flag rendering is always triple-coded — color + icon + text label — so the
 * verdict survives every color-vision type. Never render a flag with color
 * alone.
 */

export const FLAG_ICON: Record<FlagColor, LucideIcon> = {
  green: CircleCheck,
  yellow: TriangleAlert,
  orange: OctagonAlert,
  red: Flame,
  black: OctagonX,
}

/** Solid flag surface + its accessible on-color. */
export const FLAG_SOLID: Record<FlagColor, string> = {
  green: 'bg-flag-green text-on-flag-green',
  yellow: 'bg-flag-yellow text-on-flag-yellow',
  orange: 'bg-flag-orange text-on-flag-orange',
  red: 'bg-flag-red text-on-flag-red',
  black: 'bg-flag-black text-on-flag-black',
}

/** Soft tinted surface for chips and table rows (keeps ink color). */
export const FLAG_TINT: Record<FlagColor, string> = {
  green: 'bg-tint-green',
  yellow: 'bg-tint-yellow',
  orange: 'bg-tint-orange',
  red: 'bg-tint-red',
  black: 'bg-tint-black',
}

/** Hex values for canvas rendering (share card) — keep in sync with index.css. */
export const FLAG_HEX: Record<FlagColor, { bg: string; fg: string }> = {
  green: { bg: '#0f5a35', fg: '#ffffff' },
  yellow: { bg: '#f5c518', fg: '#101418' },
  orange: { bg: '#e8720c', fg: '#101418' },
  red: { bg: '#cf2233', fg: '#ffffff' },
  black: { bg: '#101418', fg: '#ffffff' },
}
