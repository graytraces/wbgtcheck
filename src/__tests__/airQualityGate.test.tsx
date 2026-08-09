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
  WA_INDOOR_PM25_THRESHOLD_UG_M3,
  classifyAqi,
} from '../data/airPolicyOracle'
import { isObservationStale, readingForPolicy } from '../hooks/useAirQuality'
import { AIR_OBSERVATION_STALE_MINUTES } from '../data/airPolicyOracle'

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
        activity="athletics"
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
  it('WA: shows the activity toggle and the action for the selected activity', () => {
    const onChange = vi.fn()
    renderGate({ onActivityChange: onChange })
    // 120 with athletics selected → cancel or move.
    expect(screen.getByText(en.air.actions.cancelOrMove)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Recess/ }))
    expect(onChange).toHaveBeenCalledWith('recess')
  })

  it('WA: switching activity changes the prescribed action at the same AQI', () => {
    const { unmount } = renderGate({ activity: 'recess' })
    // Recess at 101-150 keeps children with conditions indoors; it does not cancel.
    expect(
      screen.getByText(
        i18n.t('air.actions.sensitiveIndoorsLight', { pm25: WA_INDOOR_PM25_THRESHOLD_UG_M3 }),
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(en.air.actions.cancelOrMove)).not.toBeInTheDocument()
    unmount()
  })

  it('OR/CA: no activity toggle, because those sources do not vary by activity', () => {
    const { unmount } = renderGate({ policy: OR_AIR_POLICY, statePageSlug: 'oregon-air-quality' })
    expect(screen.queryByRole('button', { name: /Recess/ })).not.toBeInTheDocument()
    unmount()
    renderGate({ policy: CA_AIR_POLICY, statePageSlug: 'california-air-quality' })
    expect(screen.queryByRole('button', { name: /Recess/ })).not.toBeInTheDocument()
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

  it('falls back to the overall AQI when the area reports no PM2.5', () => {
    const p = payload({
      overall: { aqi: 160, category: 'Unhealthy', parameter: 'OZONE' },
      pm25: null,
    })
    expect(readingForPolicy(p, WA_AIR_POLICY)).toMatchObject({ aqi: 160, basis: 'overall' })
  })

  it('warns when the nearest monitor is far from the field', () => {
    renderGate({ data: payload({ area: { name: 'Far', state: 'WA', lat: 47, lon: -117, distanceKm: 120 } }) })
    expect(screen.getByText(/nearest monitor is about/i)).toBeInTheDocument()
  })

  it('flags an observation older than the staleness window', () => {
    const now = Date.now()
    expect(isObservationStale(null, now)).toBe(false)
    expect(isObservationStale(now - (AIR_OBSERVATION_STALE_MINUTES - 5) * 60_000, now)).toBe(false)
    expect(isObservationStale(now - (AIR_OBSERVATION_STALE_MINUTES + 5) * 60_000, now)).toBe(true)
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

  it('the WA indoor PM2.5 threshold reaches the rendered sentence', () => {
    const rendered = i18n.t('air.actions.allIndoorsLight', {
      pm25: WA_INDOOR_PM25_THRESHOLD_UG_M3,
    })
    expect(rendered).toContain(String(WA_INDOOR_PM25_THRESHOLD_UG_M3))
    expect(rendered).not.toContain('{{')
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
