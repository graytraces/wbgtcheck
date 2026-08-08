export function cToF(c: number): number {
  return c * 1.8 + 32
}

export function fToC(f: number): number {
  return (f - 32) / 1.8
}

export function kToF(k: number): number {
  return cToF(k - 273.15)
}

export function cToK(c: number): number {
  return c + 273.15
}

export function kmhToMs(kmh: number): number {
  return kmh / 3.6
}
