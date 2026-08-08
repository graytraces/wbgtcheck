import { clsx, type ClassValue } from 'clsx'

// clsx only — tailwind-merge was dropped after verifying every call site
// produces identical output without conflicting-class resolution.
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
