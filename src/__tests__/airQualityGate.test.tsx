import { describe, it, expect, beforeAll, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../i18n'
import en from '../locales/en.json'
import es from '../locales/es.json'
import AirQualityGate from '../components/AirQualityGate'
import type { AqiPayload } from '../utils/airnow'
import {
  WA_AIR_POLICY,
  OR_AIR_POLICY,
  CA_AIR_POLICY,
  classifyAqi,
} from '../data/airPolicyOracle'
import { isObservationStale, observationAge, readingForPolicy } from '../hooks/useAirQuality'
import {
  AIR_OBSERVATION_STALE_MINUTES,
  AIR_AREA_FAR_KM,
  AIR_AREA_MAX_REPRESENTATIVE_KM,
} from '../data/airPolicyOracle'

const SRC = join(__dirname, '..')

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

function payload(overrides: Partial<AqiPayload> = {}): AqiPayload {
  return {
    area: { name: 'Spokane', state: 'WA', lat: 47.66, lon: -117.43, distanceKm: 8 },
    observed: { date: '08/09/26', time: '14:00', timeZone: 'PDT', epochMs: Date.now() },
    overall: { aqi: 120, category: 'Unhealthy for Sensitive Groups', parameter: 'PM2.5' },
    pm25: { aqi: 120, category: 'Unhealthy for Sensitive Groups', parameter: 'PM2.5' },
    agencies: ['Spokane Regional Clean Air Agency'],
    preliminary: true,
    ...overrides,
  }
}

function renderGate(props: Partial<Parameters<typeof AirQualityGate>[0]> = {}) {
  return render(
    <MemoryRouter initialEntries={['/en']}>
      <AirQualityGate
        status="ready"
        data={payload()}
        policy={WA_AIR_POLICY}
        activity="medium"
        onActivityChange={() => {}}
        statePageSlug="washington-air-quality"
        now={Date.now()}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('AirQualityGate — co-display, never a replacement', () => {
  it('states that heat and air are separate gates and the stricter one governs', () => {
    renderGate()
    expect(screen.getByText(en.air.bothGatesNotice)).toBeInTheDocument()
    expect(en.air.bothGatesNotice.toLowerCase()).toContain('stricter')
    // It must not claim to clear anyone to play.
    expect(screen.getByText(en.air.notClearance)).toBeInTheDocument()
  })

  it('renders the AQI as number + category text, not color alone', () => {
    renderGate()
    expect(screen.getByText('120')).toBeInTheDocument()
    // EPA range label and the agency's own category wording both present.
    expect(screen.getByText(classifyAqi(120).sourceLabel)).toBeInTheDocument()
    expect(screen.getByText('Unhealthy for Sensitive Groups')).toBeInTheDocument()
  })

  it('paints the swatch with the unmodified EPA hex for the band', () => {
    const { container } = renderGate()
    const swatch = container.querySelector('[style*="background-color"]') as HTMLElement
    // 101-150 → EPA orange #FF7E00 → rgb(255, 126, 0)
    expect(swatch.style.backgroundColor).toBe('rgb(255, 126, 0)')
  })

  it('labels the reading preliminary and credits the reporting agency first', () => {
    renderGate()
    expect(screen.getByText(en.air.preliminaryNotice)).toBeInTheDocument()
    const credit = screen.getByText(/Spokane Regional Clean Air Agency/)
    expect(credit.textContent).toContain('EPA AirNow')
    // Agency name precedes the EPA program credit.
    const text = credit.textContent!
    expect(text.indexOf('Spokane Regional')).toBeLessThan(text.indexOf('EPA AirNow'))
  })

  it('carries the NFHS indoor-may-be-worse warning', () => {
    renderGate()
    expect(screen.getByText(en.air.indoorWarning)).toBeInTheDocument()
    expect(en.air.indoorWarning.toLowerCase()).toContain('worse')
  })
})

describe('AirQualityGate — jurisdiction behaviour', () => {
  it('WA: shows the duration toggle and the action for the selected column', () => {
    const onChange = vi.fn()
    renderGate({ onActivityChange: onChange })
    // 120 in the 1-4 h column → light intensity / 1-hour moderate cap.
    expect(screen.getByText(en.air.actions.limitLightOrHourModerate)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /15 min/ }))
    expect(onChange).toHaveBeenCalledWith('short')
  })

  it('WA: switching duration changes the prescribed action at the same AQI', () => {
    const { unmount } = renderGate({ activity: 'short' })
    // The under-an-hour column at 101-150 limits to moderate intensity; it
    // does not reach the light/1-hour cap the practice column gets.
    expect(screen.getByText(en.air.actions.limitModerate)).toBeInTheDocument()
    expect(screen.queryByText(en.air.actions.limitLightOrHourModerate)).not.toBeInTheDocument()
    unmount()
  })

  it('OR/CA: no duration toggle, because those sources do not vary by activity', () => {
    const { unmount } = renderGate({ policy: OR_AIR_POLICY, statePageSlug: 'oregon-air-quality' })
    expect(screen.queryByRole('button', { name: /15 min/ })).not.toBeInTheDocument()
    unmount()
    renderGate({ policy: CA_AIR_POLICY, statePageSlug: 'california-air-quality' })
    expect(screen.queryByRole('button', { name: /15 min/ })).not.toBeInTheDocument()
  })

  it('CA below the threshold says the bylaw is silent, not that it is fine', () => {
    renderGate({
      policy: CA_AIR_POLICY,
      statePageSlug: 'california-air-quality',
      data: payload({
        overall: { aqi: 120, category: 'Unhealthy for Sensitive Groups', parameter: 'PM2.5' },
      }),
    })
    expect(screen.getByText(en.air.noActionStated)).toBeInTheDocument()
    expect(en.air.noActionStated.toLowerCase()).toContain('not permission')
  })

  it('unverified state: EPA category only, explicitly no policy verdict', () => {
    renderGate({ policy: null, statePageSlug: null })
    expect(screen.getByText(en.air.noPolicyHeading)).toBeInTheDocument()
    expect(screen.getByText(en.air.noPolicyBody)).toBeInTheDocument()
    // No action sentence from any jurisdiction may appear.
    for (const action of Object.values(en.air.actions)) {
      expect(screen.queryByText(action)).not.toBeInTheDocument()
    }
  })
})

describe('AirQualityGate — reading selection and freshness', () => {
  it('WA uses the PM2.5 sub-index, since its table is a PM2.5 table', () => {
    const p = payload({
      overall: { aqi: 160, category: 'Unhealthy', parameter: 'OZONE' },
      pm25: { aqi: 90, category: 'Moderate', parameter: 'PM2.5' },
    })
    expect(readingForPolicy(p, WA_AIR_POLICY)).toMatchObject({ aqi: 90, basis: 'pm25' })
    // OR keys to the overall AQI instead.
    expect(readingForPolicy(p, OR_AIR_POLICY)).toMatchObject({ aqi: 160, basis: 'overall' })
    // No policy → overall.
    expect(readingForPolicy(p, null)).toMatchObject({ aqi: 160, basis: 'overall' })
  })

  it('shows BOTH readings with three channels each, and marks the higher one governing', () => {
    // When ozone drives the overall AQI past the PM2.5 sub-index, hiding the
    // overall category would under-warn — the earlier assertion that
    // 'Unhealthy' must be absent had the intent inverted. Both readings now
    // render as swatch + number + category name, and the higher carries the
    // governing badge (the WA policy band still reads PM2.5).
    renderGate({
      data: payload({
        overall: { aqi: 160, category: 'Unhealthy', parameter: 'OZONE' },
        pm25: { aqi: 90, category: 'Moderate', parameter: 'PM2.5' },
      }),
    })
    expect(screen.getByText('90')).toBeInTheDocument()
    expect(screen.getAllByText(/Moderate/).length).toBeGreaterThan(0)
    expect(screen.getByText('160')).toBeInTheDocument()
    expect(screen.getAllByText(/Unhealthy/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(en.air.governingLabel)).toHaveLength(1)
    // The policy band/action still follows PM2.5 (90 → Moderate band).
    expect(screen.getByText(en.air.actions.healthCondsOptOut)).toBeInTheDocument()
  })

  it('falls back to the overall AQI when the area reports no PM2.5', () => {
    const p = payload({
      overall: { aqi: 160, category: 'Unhealthy', parameter: 'OZONE' },
      pm25: null,
    })
    expect(readingForPolicy(p, WA_AIR_POLICY)).toMatchObject({ aqi: 160, basis: 'overall' })
  })

  it('warns when the nearest monitor is far from the field', () => {
    // Middle band: past "far" but still inside the representative range, so
    // the caveat appears and the activity verdict survives. (This case used
    // 120 km, which now lands in the stronger too-far branch below.)
    const distanceKm = (AIR_AREA_FAR_KM + AIR_AREA_MAX_REPRESENTATIVE_KM) / 2
    renderGate({ data: payload({ area: { name: 'Far', state: 'WA', lat: 47, lon: -117, distanceKm } }) })
    expect(screen.getByText(/nearest monitor is about/i)).toBeInTheDocument()
    expect(screen.getByText(en.air.actions.limitLightOrHourModerate)).toBeInTheDocument()
  })

  it('flags an observation older than the staleness window (90 min — one missed hourly cycle plus slack)', () => {
    expect(AIR_OBSERVATION_STALE_MINUTES).toBe(90)
    const now = Date.now()
    expect(observationAge(now - (AIR_OBSERVATION_STALE_MINUTES - 5) * 60_000, now)).toBe('fresh')
    expect(observationAge(now - (AIR_OBSERVATION_STALE_MINUTES + 5) * 60_000, now)).toBe('stale')
    expect(isObservationStale(now - (AIR_OBSERVATION_STALE_MINUTES - 5) * 60_000, now)).toBe(false)
    expect(isObservationStale(now - (AIR_OBSERVATION_STALE_MINUTES + 5) * 60_000, now)).toBe(true)
  })

  it('withdraws the activity verdict when the monitor is too far to speak for the field', () => {
    // The distance thresholds are product choices, not agency numbers — they
    // live in data/airDistance.js for exactly that reason.
    expect(AIR_AREA_MAX_REPRESENTATIVE_KM).toBeGreaterThan(AIR_AREA_FAR_KM)
    renderGate({
      data: payload({
        area: {
          name: 'Burns',
          state: 'OR',
          lat: 43.59,
          lon: -119.05,
          distanceKm: AIR_AREA_MAX_REPRESENTATIVE_KM + 20,
        },
        overall: { aqi: 30, category: 'Good', parameter: 'PM2.5' },
        pm25: { aqi: 30, category: 'Good', parameter: 'PM2.5' },
      }),
    })
    expect(screen.getByText(en.air.notRepresentativeHeading)).toBeInTheDocument()
    // No jurisdiction's action sentence may appear — a distant GOOD reading
    // presented with an activity instruction is false clearance.
    for (const action of Object.values(en.air.actions)) {
      expect(screen.queryByText(action)).not.toBeInTheDocument()
    }
    // The number itself stays visible, with its caveat.
    expect(screen.getByText('30')).toBeInTheDocument()
    // And the milder "far" note does not double up with the stronger one.
    expect(screen.queryByText(/nearest monitor is about/i)).not.toBeInTheDocument()
  })

  it('keeps the verdict for a monitor inside the representative range', () => {
    renderGate({
      data: payload({
        area: { name: 'Spokane', state: 'WA', lat: 47.66, lon: -117.43, distanceKm: 8 },
      }),
    })
    expect(screen.queryByText(en.air.notRepresentativeHeading)).not.toBeInTheDocument()
    expect(screen.getByText(en.air.actions.limitLightOrHourModerate)).toBeInTheDocument()
  })

  it('an unreadable observation time is unknown age, not fresh', () => {
    // DELIBERATE REVERSAL of the previous assertion (isObservationStale(null)
    // === false). observationEpochMs returns null for any time-zone
    // abbreviation outside TZ_OFFSET_HOURS and for any stamp its regexes miss,
    // so null is a real AirNow response rather than a theoretical one — and
    // what it holds is the last value published for that area, which can be
    // hours old. It was being shown as current with no warning. Not knowing
    // the age of a safety reading is not the same as knowing it is fresh.
    const now = Date.now()
    expect(observationAge(null, now)).toBe('unknown')
    expect(isObservationStale(null, now)).toBe(true)
  })

  it('says the age is unknown rather than reusing the stale wording', () => {
    renderGate({
      data: payload({
        observed: { date: '08/09/26', time: '14:00', timeZone: 'XYZ', epochMs: null },
      }),
    })
    expect(screen.getByText(en.air.unknownAgeNotice)).toBeInTheDocument()
    // The known-age message must not appear: it would name a time we could not
    // actually place on a clock.
    expect(
      screen.queryByText(en.air.staleNotice.replace('{{time}}', '14:00 XYZ')),
    ).not.toBeInTheDocument()
  })

  it('surfaces a usable message when AirNow is unavailable', () => {
    renderGate({ status: 'error', data: null })
    expect(screen.getByText(en.air.loadFailed)).toBeInTheDocument()
    expect(en.air.loadFailed).toContain('AirNow')
  })
})

describe('air copy derives numbers from the oracle', () => {
  it('no action template hardcodes a digit — thresholds arrive by interpolation', () => {
    // Strip the two things that legitimately contain digits: pollutant names
    // ("PM2.5", "PM10") and the placeholder tokens themselves ("{{pm25}}").
    // Any digit left over is a threshold hardcoded into copy.
    const stripPollutantNames = (s: string) =>
      s.replace(/PM2\.5|PM10/g, 'PM').replace(/\{\{\w+\}\}/g, '{{}}')
    for (const locale of [en, es]) {
      const actions = locale.air.actions as Record<string, string>
      for (const [key, template] of Object.entries(actions)) {
        expect(
          stripPollutantNames(template),
          `air.actions.${key} must not hardcode digits`,
        ).not.toMatch(/\d/)
      }
    }
  })

  it('warns when the WA table has to fall back from PM2.5 to the overall AQI', () => {
    renderGate({
      data: payload({
        overall: { aqi: 160, category: 'Unhealthy', parameter: 'OZONE' },
        pm25: null,
      }),
    })
    expect(screen.getByText(en.air.pm25FallbackNotice)).toBeInTheDocument()
  })

  it('air copy never claims the air is safe or clears play', () => {
    const prose = JSON.stringify([en.air, es.air]).toLowerCase()
    expect(prose).not.toContain('safe to practice')
    expect(prose).not.toContain('seguro practicar')
    expect(prose).not.toContain('cleared to play')
  })
})

describe('structural guard: the air axis never touches the heat verdict', () => {
  // Comments are stripped first: these guards are about what the code does,
  // and the modules deliberately DISCUSS the separation in prose.
  const read = (rel: string) =>
    readFileSync(join(SRC, rel), 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

  it('the air oracle does not import the WBGT oracle, or vice versa', () => {
    for (const f of ['data/airPolicyData.js', 'data/airPolicyOracle.ts']) {
      const src = read(f)
      expect(src, `${f} must not import the heat oracle`).not.toMatch(/from '\.\/policy(Data|Oracle)/)
    }
    for (const f of ['data/policyData.js', 'data/policyOracle.ts']) {
      expect(read(f), `${f} must not import the air oracle`).not.toMatch(/airPolicy/)
    }
  })

  it('the verdict card and verdict math never read air quality', () => {
    for (const f of ['components/VerdictCard.tsx', 'utils/verdict.ts', 'hooks/useWbgt.ts']) {
      const src = read(f)
      expect(src, `${f} must stay air-free`).not.toMatch(/airPolicy|useAirQuality|AirQualityGate|aqi/i)
    }
  })

  it('the air gate never reads a WBGT value', () => {
    const src = read('components/AirQualityGate.tsx')
    expect(src).not.toMatch(/wbgt/i)
    expect(src).not.toMatch(/classifyWbgt|HourVerdict|FlagColor/)
  })
})
