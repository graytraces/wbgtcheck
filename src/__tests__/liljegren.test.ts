import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { wbgtLiljegren, relativeHumidityPercent, windSpeed2m } from '../lib/liljegren'

/**
 * Port verification against thermofeel's own regression fixture
 * (ecmwf/thermofeel tests/: thermofeel_testcases.csv inputs →
 * wbgt_liljegren.csv expected outputs, both in Kelvin).
 *
 * The Python test computes RH via Magnus-Tetens from (t2m, td), uses
 * pressure = 1013.25 hPa, instantaneous SSRD = accumulated/3600, and direct
 * fraction = fdir/ssrd — replicated exactly here.
 *
 * Tolerance: 1e-4 K. thermofeel asserts to 1e-6; we allow the extra margin
 * for JS vs numpy transcendental (exp/pow/tan) library differences. Observed
 * max error is printed for the report.
 */

interface TestCase {
  t2m: number
  td: number
  va: number
  ssrd: number
  fdir: number
  cossza: number
}

function loadFixtures(): { cases: TestCase[]; expected: number[] } {
  // vitest runs with cwd = project root; jsdom rewrites import.meta.url to
  // an http: URL, so fixture paths must be filesystem-anchored.
  const casesCsv = readFileSync(
    resolve(process.cwd(), 'src/test/fixtures/thermofeel_testcases.csv'),
    'utf-8',
  )
  const expectedCsv = readFileSync(
    resolve(process.cwd(), 'src/test/fixtures/wbgt_liljegren.csv'),
    'utf-8',
  )
  const lines = casesCsv.trim().split('\n')
  const header = lines[0].split(',')
  const idx = (name: string) => header.indexOf(name)
  const cases = lines.slice(1).map((line) => {
    const cols = line.split(',').map(Number)
    return {
      t2m: cols[idx('t2m')],
      td: cols[idx('td')],
      va: cols[idx('va')],
      ssrd: cols[idx('ssrd')],
      fdir: cols[idx('fdir')],
      cossza: cols[idx('cossza')],
    }
  })
  const expected = expectedCsv.trim().split('\n').map(Number)
  return { cases, expected }
}

describe('Liljegren WBGT port (thermofeel regression fixture)', () => {
  const { cases, expected } = loadFixtures()

  it('has the full 50-case fixture', () => {
    expect(cases.length).toBe(50)
    expect(expected.length).toBe(50)
  })

  it('reproduces every thermofeel expected value within 1e-4 K', () => {
    let maxErr = 0
    let maxErrIdx = -1
    cases.forEach((c, i) => {
      const rh = relativeHumidityPercent(c.t2m, c.td)
      const ssrdInst = c.ssrd / 3600
      const fdirFrac = c.fdir / c.ssrd
      const result = wbgtLiljegren(c.t2m, rh, 1013.25, c.va, ssrdInst, fdirFrac, c.cossza)
      expect(Number.isFinite(result), `case ${i} returned non-finite`).toBe(true)
      const err = Math.abs(result - expected[i])
      if (err > maxErr) {
        maxErr = err
        maxErrIdx = i
      }
      expect(err, `case ${i}: got ${result}, expected ${expected[i]}`).toBeLessThan(1e-4)
    })
    // Surfaced in the vitest output so the build report can quote it.
    console.log(`Liljegren port max |error| vs thermofeel fixture: ${maxErr.toExponential(3)} K (case ${maxErrIdx})`)
  })

  it('floors calm wind at the KNMI 10 m minimum (0.62 m/s → ~0.5 m/s at 2 m)', () => {
    // 2 m scaling of the floor keeps the sensor model out of the unstable
    // free-convection regime; exact value depends on the stability class.
    const night = windSpeed2m(0.62, -0.1, 0)
    expect(night).toBeGreaterThan(0.13)
    expect(night).toBeLessThan(0.62)
  })

  it('produces a plausible verdict-scale value for a hot Texas afternoon', () => {
    // 38 °C, dew point 24 °C, 3 m/s wind, strong sun near local noon.
    const t2K = 311.15
    const rh = relativeHumidityPercent(t2K, 297.15)
    const k = wbgtLiljegren(t2K, rh, 1013.25, 3, 900, 0.75, 0.9)
    const f = (k - 273.15) * 1.8 + 32
    // Any modeled WBGT for these inputs must land in the UIL orange-black
    // decision range — a unit slip (C/F/K) would throw it far outside.
    expect(f).toBeGreaterThan(85)
    expect(f).toBeLessThan(105)
  })
})
