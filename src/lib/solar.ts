/**
 * Solar geometry + irradiance estimation for the Liljegren fallback path.
 *
 * NWS gridpoints do not publish solar radiation, so when we must estimate
 * WBGT (offices without wetBulbGlobeTemperature, e.g. EWX/Austin-San Antonio)
 * the shortwave input is modeled:
 *
 *  - Solar position: NOAA "General Solar Position Calculations" Fourier-series
 *    approximation (declination + equation of time + hour angle).
 *  - Clear-sky global horizontal irradiance: Kasten & Czeplak (1980),
 *    GHI_clear = 990·cos(zenith) − 30 W/m².
 *  - Cloud attenuation: Kasten & Czeplak (1980),
 *    GHI = GHI_clear · (1 − 0.75·C^3.4), C = sky cover fraction 0-1.
 *  - Direct-beam fraction: 0.85·(1 − C) — a documented simplification (clear
 *    sky direct share ≈ 0.85 at moderate zenith, shrinking with overcast);
 *    the Liljegren KNMI guard clamps it to ≤ 0.9 downstream.
 *
 * Every value that flows through this module is an ESTIMATE and is labeled as
 * such in the UI. See the Grundstein bias notice in policyOracle.ts.
 */

const DEG = Math.PI / 180

export interface SolarPosition {
  /** Cosine of the solar zenith angle (negative → sun below horizon). */
  cosZenith: number
  /** Solar declination in degrees (for tests). */
  declinationDeg: number
}

export function solarPosition(latDeg: number, lonDeg: number, date: Date): SolarPosition {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1)
  const doy = Math.floor((date.getTime() - start) / 86400000) + 1
  const hourUtc =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600

  // Fractional year [rad]
  const g = ((2 * Math.PI) / 365) * (doy - 1 + (hourUtc - 12) / 24)

  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g)

  // Equation of time [minutes]
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g))

  // True solar time [minutes], working in UTC (tz offset 0, east-positive lon)
  const tst = hourUtc * 60 + eqtime + 4 * lonDeg
  const haDeg = tst / 4 - 180

  const lat = latDeg * DEG
  const cosZenith =
    Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(haDeg * DEG)

  return { cosZenith, declinationDeg: decl / DEG }
}

/** Clear-sky global horizontal irradiance [W/m²], Kasten & Czeplak (1980). */
export function clearSkyGhi(cosZenith: number): number {
  return Math.max(0, 990 * cosZenith - 30)
}

/** Cloud-attenuated GHI [W/m²]; cloudFrac 0-1, Kasten & Czeplak (1980). */
export function cloudyGhi(cosZenith: number, cloudFrac: number): number {
  const c = Math.min(Math.max(cloudFrac, 0), 1)
  return clearSkyGhi(cosZenith) * (1 - 0.75 * Math.pow(c, 3.4))
}

/** Estimated direct-beam fraction of GHI; cloudFrac 0-1. */
export function directFraction(cloudFrac: number): number {
  const c = Math.min(Math.max(cloudFrac, 0), 1)
  return 0.85 * (1 - c)
}
