/**
 * Liljegren WBGT — TypeScript port of ecmwf/thermofeel (Apache-2.0).
 *
 * Ported from thermofeel/liljegren.py and the calculate_wbgt_liljegren /
 * calculate_relative_humidity_percent wrappers in thermofeel/thermofeel.py
 * (github.com/ecmwf/thermofeel, main branch, fetched 2026-08-09). See
 * NOTICE for attribution. Scalar port: thermofeel's vectorized fixed-point
 * iteration records each element's result at its own first convergence, so a
 * per-value loop reproduces it exactly.
 *
 * Physically based WBGT after Liljegren et al. (2008) — the reference method
 * for deriving WBGT from standard meteorological variables (RMSE 0.38-1.08 °C
 * vs field measurement). The globe and natural-wet-bulb sensors are each
 * solved from their steady-state energy balance by fixed-point iteration.
 *
 * References:
 *   Liljegren et al. (2008) https://doi.org/10.1080/15459620802310770
 *   Kong & Huber (2022) https://doi.org/10.1029/2021EF002334
 *
 * Verified against thermofeel's own 50-case regression fixture
 * (tests/thermofeel_testcases.csv → tests/wbgt_liljegren.csv); see
 * src/__tests__/liljegren.test.ts for the tolerance.
 */

// Physical constants (Liljegren et al. 2008; mdljts/wbgt header)
const STEFANB = 5.6696e-8 // Stefan-Boltzmann constant [W m-2 K-4]
const CP = 1003.5 // specific heat of dry air [J kg-1 K-1]
const M_AIR = 28.97 // molar mass of dry air [g mol-1]
const M_H2O = 18.015 // molar mass of water [g mol-1]
const R_GAS = 8314.34 // universal gas constant [J kmol-1 K-1]
const R_AIR = R_GAS / M_AIR // gas constant for air [J kg-1 K-1]
const PR = CP / (CP + 1.25 * R_AIR) // Prandtl number
const RATIO = (CP * M_AIR) / M_H2O // psychrometric grouping
const EMIS_WICK = 0.95
const ALB_WICK = 0.4
const D_WICK = 0.007 // wick diameter [m]
const L_WICK = 0.0254 // wick length [m]
const EMIS_GLOBE = 0.95
const ALB_GLOBE = 0.05
const D_GLOBE = 0.0508 // globe diameter [m]
const EMIS_SFC = 0.999
const ALB_SFC = 0.45
const CZA_MIN = 0.00873 // cos(89.5 deg): below this the sun is treated as down
const MIN_SPEED = 0.13 // internal floor on wind speed in the Reynolds number [m/s]
const CONVERGENCE = 0.02 // iteration tolerance [K]
const MAX_ITER = 500 // iteration cap
const MIN_WIND_10M = 0.62 // KNMI minimum 10 m wind (~0.5 m/s at 2 m) [m/s]

// Pasquill-Gifford stability lookup for the 10 m -> 2 m wind profile
// (Liljegren et al. 2008; Kong & Huber 2022 PyWBGT). Rows are wind-speed bins,
// columns are solar-radiation / night bins; the value is the stability class.
const LSRDT = [
  [1, 1, 2, 4, 0, 5, 6, 0],
  [1, 2, 3, 4, 0, 5, 6, 0],
  [2, 2, 3, 4, 0, 4, 4, 0],
  [3, 3, 4, 4, 0, 0, 0, 0],
  [3, 4, 4, 4, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
]
// Wind-profile power-law exponent per stability class (urban terrain).
const URBAN_EXP = [0.15, 0.15, 0.2, 0.25, 0.3, 0.3]

/** Saturation vapour pressure over liquid water [hPa], Buck (1981). */
function esat(tk: number): number {
  const y = (tk - 273.15) / (tk - 32.18)
  return 1.004 * 6.1121 * Math.exp(17.502 * y)
}

/** Dew-point temperature [K] from vapour pressure [hPa] (inverse of esat). */
function dewPoint(e: number): number {
  const z = Math.log(e / (6.1121 * 1.004))
  return 273.15 + (240.97 * z) / (17.502 - z)
}

/** Dynamic viscosity of air [kg m-1 s-1] (Bird, Stewart & Lightfoot). */
function viscosity(tk: number): number {
  const sigma = 3.617
  const epsKappa = 97.0
  const tr = tk / epsKappa
  const omega = ((tr - 2.9) / 0.4) * -0.034 + 1.048
  return (2.6693e-6 * Math.sqrt(M_AIR * tk)) / (sigma * sigma * omega)
}

/** Thermal conductivity of air [W m-1 K-1] (Eucken relation). */
function thermalCond(tk: number): number {
  return (CP + 1.25 * R_AIR) * viscosity(tk)
}

/** Diffusivity of water vapour in air [m2 s-1]; pair in hPa (BSL p.505). */
function diffusivity(tk: number, pair: number): number {
  const pcritAir = 36.4
  const pcritH2o = 218.0
  const tcritAir = 132.0
  const tcritH2o = 647.3
  const a = 3.64e-4
  const b = 2.334
  const pcrit13 = Math.pow(pcritAir * pcritH2o, 1.0 / 3.0)
  const tcrit512 = Math.pow(tcritAir * tcritH2o, 5.0 / 12.0)
  const tcrit12 = Math.sqrt(tcritAir * tcritH2o)
  const mmix = Math.sqrt(1.0 / M_AIR + 1.0 / M_H2O)
  const patm = pair / 1013.25
  return ((((a * Math.pow(tk / tcrit12, b) * pcrit13 * tcrit512) * mmix) / patm) * 1e-4)
}

/** Latent heat of vaporisation [J kg-1], valid 283-313 K. */
function evap(tk: number): number {
  return ((313.15 - tk) / 30.0) * -71100.0 + 2.4073e6
}

/** Clear-sky atmospheric emissivity; rh as fraction (Oke 2nd ed.). */
function emisAtm(tk: number, rh: number): number {
  const e = rh * esat(tk)
  return 0.575 * Math.pow(e, 0.143)
}

/** Convective heat-transfer coefficient for the globe (sphere) [W m-2 K-1]. */
function hSphereInAir(tk: number, pair: number, speed: number): number {
  const density = (pair * 100.0) / (R_AIR * tk)
  const re = (Math.max(speed, MIN_SPEED) * density * D_GLOBE) / viscosity(tk)
  const nu = 2.0 + 0.6 * Math.sqrt(re) * Math.pow(PR, 0.3333)
  return (nu * thermalCond(tk)) / D_GLOBE
}

/** Convective heat-transfer coefficient for the wick (cylinder) [W m-2 K-1]. */
function hCylinderInAir(tk: number, pair: number, speed: number): number {
  const a = 0.56
  const b = 0.281
  const c = 0.4
  const density = (pair * 100.0) / (R_AIR * tk)
  const re = (Math.max(speed, MIN_SPEED) * density * D_WICK) / viscosity(tk)
  const nu = b * Math.pow(re, 1.0 - c) * Math.pow(PR, 1.0 - a)
  return (nu * thermalCond(tk)) / D_WICK
}

/**
 * Globe temperature [degC] by fixed-point iteration of the energy balance.
 * rh is a fraction. NaN when the iteration does not converge within the cap.
 */
function solveGlobe(
  ta: number,
  rh: number,
  pair: number,
  speed: number,
  solar: number,
  fdir: number,
  cza: number,
): number {
  const tsfc = ta
  const emis = emisAtm(ta, rh)
  // Direct-beam geometry term; guarded so fdir == 0 contributes 0 even when the
  // sun is at/below the horizon (cza -> 0), avoiding 0 * inf.
  const czaSafe = cza > CZA_MIN ? cza : 1.0
  const beam = fdir > 0.0 ? fdir * (1.0 / (2.0 * czaSafe) - 1.0) : 0.0

  let tgPrev = ta
  for (let i = 0; i < MAX_ITER; i++) {
    const tref = 0.5 * (tgPrev + ta)
    const h = hSphereInAir(tref, pair, speed)
    const tgNew = Math.pow(
      0.5 * (emis * Math.pow(ta, 4) + EMIS_SFC * Math.pow(tsfc, 4)) -
        (h / (STEFANB * EMIS_GLOBE)) * (tgPrev - ta) +
        (solar / (2.0 * STEFANB * EMIS_GLOBE)) * (1.0 - ALB_GLOBE) * (beam + 1.0 + ALB_SFC),
      0.25,
    )
    if (Math.abs(tgNew - tgPrev) < CONVERGENCE) {
      return tgNew - 273.15
    }
    tgPrev = 0.9 * tgPrev + 0.1 * tgNew
  }
  return NaN
}

/**
 * Wet-bulb temperature [degC] by fixed-point iteration of the energy balance.
 * rh is a fraction. With rad=1 this is the natural wet-bulb temperature (the
 * term entering WBGT); rad=0 gives the psychrometric wet bulb. NaN where not
 * converged.
 */
function solveWetbulb(
  ta: number,
  rh: number,
  pair: number,
  speed: number,
  solar: number,
  fdir: number,
  cza: number,
  rad: number,
): number {
  const tsfc = ta
  // Solar-zenith angle, guarded so tan(sza) stays finite when the sun is at or
  // below the horizon (fdir is already 0 there, so the term contributes 0).
  const czaSafe = cza > CZA_MIN ? cza : 1.0
  const sza = Math.acos(Math.min(Math.max(czaSafe, -1.0), 1.0))
  const emis = emisAtm(ta, rh)
  const eair = rh * esat(ta)

  let twPrev = dewPoint(eair)
  for (let i = 0; i < MAX_ITER; i++) {
    const tref = 0.5 * (twPrev + ta)
    const h = hCylinderInAir(tref, pair, speed)
    const fatm =
      STEFANB *
        EMIS_WICK *
        (0.5 * (emis * Math.pow(ta, 4) + EMIS_SFC * Math.pow(tsfc, 4)) - Math.pow(twPrev, 4)) +
      (1.0 - ALB_WICK) *
        solar *
        ((1.0 - fdir) * (1.0 + (0.25 * D_WICK) / L_WICK) +
          fdir * (Math.tan(sza) / Math.PI + (0.25 * D_WICK) / L_WICK) +
          ALB_SFC)
    const ewick = esat(twPrev)
    const density = (pair * 100.0) / (R_AIR * tref)
    const sc = viscosity(tref) / (density * diffusivity(tref, pair))
    const twNew =
      ta -
      ((evap(tref) / RATIO) * (ewick - eair)) / (pair - ewick) * Math.pow(PR / sc, 0.56) +
      (fatm / h) * rad
    if (Math.abs(twNew - twPrev) < CONVERGENCE) {
      return twNew - 273.15
    }
    twPrev = 0.9 * twPrev + 0.1 * twNew
  }
  return NaN
}

/**
 * 10 m -> 2 m wind speed via the Liljegren stability-dependent profile:
 * va * (2/10)^p, where the power-law exponent p comes from a Pasquill-Gifford
 * stability class derived from solar elevation, incoming radiation and wind
 * speed. The result is floored at MIN_SPEED (0.13 m/s).
 */
export function windSpeed2m(va: number, cossza: number, ssrd: number): number {
  const daytime = cossza > 0.0

  // radiation / night column index of the stability table
  let col: number
  if (daytime) {
    col = ssrd >= 925.0 ? 0 : ssrd >= 675.0 ? 1 : ssrd >= 175.0 ? 2 : 3
  } else {
    col = 5
  }

  // wind-speed row index of the stability table (day and night thresholds)
  let row: number
  if (daytime) {
    row = va >= 6.0 ? 4 : va >= 5.0 ? 3 : va >= 3.0 ? 2 : va >= 2.0 ? 1 : 0
  } else {
    row = va >= 2.5 ? 2 : va >= 2.0 ? 1 : 0
  }

  const stabilityClass = LSRDT[row][col]
  const exponent = URBAN_EXP[stabilityClass - 1]
  return Math.max(va * Math.pow(2.0 / 10.0, exponent), MIN_SPEED)
}

/**
 * Liljegren WBGT [K] from 2 m temperature [K], relative humidity [%], surface
 * pressure [hPa], 10 m wind speed [m/s], instantaneous downward shortwave
 * radiation [W/m2], direct-beam fraction [0-1], and cosine of the solar
 * zenith angle. Mirrors thermofeel.calculate_wbgt_liljegren (wind_scaling
 * "liljegren"). NaN where the iteration does not converge.
 */
export function wbgtLiljegren(
  t2K: number,
  rhPct: number,
  pressureHpa: number,
  va10m: number,
  ssrd: number,
  fdirFrac: number,
  cossza: number,
): number {
  // KNMI minimum wind floor at 10 m, then scale to the 2 m sensor height.
  const va = Math.max(va10m, MIN_WIND_10M)
  const speed = windSpeed2m(va, cossza, ssrd)

  const rhFrac = rhPct / 100.0

  // KNMI direct-beam guards: clamp to [0, 0.9] and zero below the horizon.
  // Math.min/max propagate NaN like np.clip, keeping parity with thermofeel.
  let fdir = Math.min(Math.max(fdirFrac, 0.0), 0.9)
  if (cossza < CZA_MIN) fdir = 0.0

  const tgC = solveGlobe(t2K, rhFrac, pressureHpa, speed, ssrd, fdir, cossza)
  const tnwbC = solveWetbulb(t2K, rhFrac, pressureHpa, speed, ssrd, fdir, cossza, 1.0)
  const t2C = t2K - 273.15

  const wbgtC = 0.1 * t2C + 0.2 * tgC + 0.7 * tnwbC
  return wbgtC + 273.15
}

/**
 * Relative humidity [%] from 2 m and dew-point temperature [K] via
 * Magnus-Tetens (coefficients per Murray 1967) — the same formulation
 * thermofeel uses to feed its Liljegren regression fixture. Not clamped:
 * supersaturation (td > t2) exceeds 100%.
 */
export function relativeHumidityPercent(t2K: number, tdK: number): number {
  const t2C = t2K - 273.15
  const tdC = tdK - 273.15
  const es = 6.11 * Math.pow(10.0, (7.5 * t2C) / (237.3 + t2C))
  const e = 6.11 * Math.pow(10.0, (7.5 * tdC) / (237.3 + tdC))
  return (e / es) * 100.0
}
