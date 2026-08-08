import { describe, it, expect } from 'vitest'
import { solarPosition, clearSkyGhi, cloudyGhi, directFraction } from '../lib/solar'

describe('solar position (NOAA approximation)', () => {
  it('declination ≈ +23.44° at the June solstice', () => {
    const { declinationDeg } = solarPosition(0, 0, new Date(Date.UTC(2026, 5, 21, 12)))
    expect(Math.abs(declinationDeg - 23.44)).toBeLessThan(0.5)
  })

  it('declination ≈ −23.44° at the December solstice', () => {
    const { declinationDeg } = solarPosition(0, 0, new Date(Date.UTC(2026, 11, 21, 12)))
    expect(Math.abs(declinationDeg + 23.44)).toBeLessThan(0.5)
  })

  it('declination ≈ 0° at the March equinox', () => {
    const { declinationDeg } = solarPosition(0, 0, new Date(Date.UTC(2026, 2, 20, 12)))
    expect(Math.abs(declinationDeg)).toBeLessThan(1.0)
  })

  it('sun nearly overhead at equator solar noon on the equinox (lon 0, ~12 UTC)', () => {
    const { cosZenith } = solarPosition(0, 0, new Date(Date.UTC(2026, 2, 20, 12, 8)))
    expect(cosZenith).toBeGreaterThan(0.99)
  })

  it('sun below horizon at local midnight in Texas', () => {
    // Austin ≈ 30.27 N, −97.74 E; 06:00 UTC ≈ 00:00 CST.
    const { cosZenith } = solarPosition(30.27, -97.74, new Date(Date.UTC(2026, 7, 9, 6)))
    expect(cosZenith).toBeLessThan(0)
  })

  it('sun up at Texas summer mid-afternoon (20 UTC ≈ 15:00 CDT)', () => {
    const { cosZenith } = solarPosition(30.27, -97.74, new Date(Date.UTC(2026, 7, 9, 20)))
    expect(cosZenith).toBeGreaterThan(0.5)
  })
})

describe('irradiance model (Kasten & Czeplak 1980)', () => {
  it('clear-sky GHI is 0 at night and ~960 W/m² for overhead sun', () => {
    expect(clearSkyGhi(-0.2)).toBe(0)
    expect(clearSkyGhi(1)).toBe(960)
  })

  it('full overcast removes 75% of clear-sky GHI', () => {
    expect(cloudyGhi(1, 1)).toBeCloseTo(960 * 0.25, 6)
  })

  it('clear sky leaves GHI untouched', () => {
    expect(cloudyGhi(1, 0)).toBeCloseTo(960, 6)
  })

  it('direct fraction shrinks from 0.85 (clear) to 0 (overcast)', () => {
    expect(directFraction(0)).toBeCloseTo(0.85, 6)
    expect(directFraction(1)).toBe(0)
    expect(directFraction(0.5)).toBeCloseTo(0.425, 6)
  })
})
