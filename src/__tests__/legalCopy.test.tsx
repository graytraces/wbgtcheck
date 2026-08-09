import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import i18n from '../i18n'
import en from '../locales/en.json'
import es from '../locales/es.json'
import Disclaimer from '../pages/Disclaimer'
import VerdictCard from '../components/VerdictCard'
import { UIL_CLASS_3, GENERIC_NATA, classifyWbgt, isBorderline } from '../data/policyOracle'
import { isStale, STALE_AFTER_MS } from '../hooks/useWbgt'
import type { HourVerdict } from '../utils/verdict'

/**
 * Legal-review guards (2026-08-09 four-axis review).
 *
 * The FROZEN strings below were approved verbatim by the legal review
 * ("do not touch a single character"). If one of these assertions fails, the
 * copy was edited — revert the copy, do not update the test, unless a new
 * legal review explicitly re-approves the wording.
 */

const FROZEN = {
  en: {
    conservativeNotice:
      'Remote estimates read LOW vs on-site meters (−{{min}} to −{{max}} °C in studies). Near a boundary, treat it as the higher flag.',
    verifyOnsite:
      'Confirm on site before and during activity — this forecast is a planning aid, not a measurement.',
  },
  es: {
    conservativeNotice:
      'Las estimaciones remotas marcan MENOS que los medidores en el campo (−{{min}} a −{{max}} °C en estudios). Cerca de un límite, trátela como la bandera superior.',
    verifyOnsite:
      'Confirme en el sitio antes y durante la actividad — este pronóstico es una ayuda de planificación, no una medición.',
  },
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('frozen safety copy (legal-approved, pinned verbatim)', () => {
  it('EN conservativeNotice/verifyOnsite are unchanged', () => {
    expect(en.verdict.conservativeNotice).toBe(FROZEN.en.conservativeNotice)
    expect(en.verdict.verifyOnsite).toBe(FROZEN.en.verifyOnsite)
  })

  it('ES conservativeNotice/verifyOnsite are unchanged', () => {
    expect(es.verdict.conservativeNotice).toBe(FROZEN.es.conservativeNotice)
    expect(es.verdict.verifyOnsite).toBe(FROZEN.es.verifyOnsite)
  })
})

describe('legal batch copy (L1-L7)', () => {
  it('L1: affiliation disclaimer names every body, in both locales', () => {
    for (const locale of [en, es]) {
      const s = locale.common.footer.affiliation
      for (const body of ['UIL', 'GHSA', 'NFHS', 'NATA']) {
        expect(s).toContain(body)
      }
    }
    expect(en.common.footer.affiliation).toContain('not affiliated')
  })

  it('L2: liability carries AS IS, implied-warranty, damages, and judgment sentences', () => {
    const enL = en.disclaimerPage.liability
    expect(enL).toContain('AS IS')
    expect(enL).toContain('merchantability')
    expect(enL).toContain('fitness for a particular purpose')
    expect(enL).toContain('punitive')
    expect(enL).toContain('independent judgment')
    const esL = es.disclaimerPage.liability
    expect(esL).toContain('TAL CUAL')
    expect(esL).toContain('comerciabilidad')
    expect(esL).toContain('punitivos')
  })

  it('L3: notMedical excludes emergency/life-safety use', () => {
    expect(en.disclaimerPage.notMedical).toContain('primary emergency warning system')
    expect(es.disclaimerPage.notMedical).toContain('sistema primario de alerta de emergencia')
  })

  it('L4: governing law names Republic of Korea and Seoul Central District Court', () => {
    expect(en.disclaimerPage.governingLaw).toContain('Republic of Korea')
    expect(en.disclaimerPage.governingLaw).toContain('Seoul Central District Court')
    expect(es.disclaimerPage.governingLaw).toContain('República de Corea')
  })

  it('L5: legal contact email present in both locales (workshop address only)', () => {
    expect(en.disclaimerPage.legalContact).toContain('cardi.workshop@gmail.com')
    expect(es.disclaimerPage.legalContact).toContain('cardi.workshop@gmail.com')
  })

  it('L7: conditions points at the date/time of displayed data', () => {
    expect(en.disclaimerPage.conditions).toContain('date and time')
    expect(es.disclaimerPage.conditions).toContain('fecha y hora')
  })

  it('L7 supplement: availability carries the NWS-timeliness link and no-uninterrupted/error-free warranty, in our own words', () => {
    const enA = en.disclaimerPage.availability
    expect(enA).toContain('National Weather Service')
    expect(enA).toContain('uninterrupted')
    expect(enA).toContain('error-free')
    // Own wording, not the NWS server-notice sentence verbatim
    expect(enA).not.toContain('Timely delivery of data and products from this server')
    const esA = es.disclaimerPage.availability
    expect(esA).toContain('NWS')
    expect(esA).toContain('ininterrumpido')
  })

  it('AQI clause is one step stronger than the WBGT clauses', () => {
    // Named in the air-quality phase: the AQI reading is preliminary, hourly,
    // and area-wide, and EPA disclaims decision-making use. All four ideas
    // must survive copy edits, in both locales.
    const enA = en.disclaimerPage.airQuality
    expect(enA).toContain('preliminary')
    expect(enA).toContain('reporting area')
    expect(enA).toContain('not fully verified or validated')
    expect(enA).toContain('decision-making')
    // And it must restate that air never relaxes the heat verdict.
    expect(enA.toLowerCase()).toContain('never lowers a heat flag')
    expect(enA.toLowerCase()).toContain('stricter')

    const esA = es.disclaimerPage.airQuality
    expect(esA).toContain('preliminar')
    expect(esA).toContain('zona de reporte')
    expect(esA).toContain('AirNow')
    expect(esA.toLowerCase()).toContain('más estricta')
  })

  it('Disclaimer page renders the AQI clause (post-JS DOM)', () => {
    render(
      <MemoryRouter initialEntries={['/en/disclaimer']}>
        <Routes>
          <Route path="/:lang/*" element={<Disclaimer />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText(en.disclaimerPage.airQuality)).toBeInTheDocument()
  })

  it('Disclaimer page renders the new sections (post-JS DOM)', () => {
    render(
      <MemoryRouter initialEntries={['/en/disclaimer']}>
        <Routes>
          <Route path="/:lang/*" element={<Disclaimer />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText(en.disclaimerPage.governingLaw)).toBeInTheDocument()
    expect(screen.getByText(en.disclaimerPage.legalContact)).toBeInTheDocument()
    expect(screen.getByText(en.disclaimerPage.availability)).toBeInTheDocument()
  })
})

describe('L6: stale-forecast guard', () => {
  it('isStale trips only past the threshold', () => {
    const now = 10_000_000
    expect(isStale(null, now)).toBe(false)
    expect(isStale(now - STALE_AFTER_MS + 1000, now)).toBe(false)
    expect(isStale(now - STALE_AFTER_MS - 1000, now)).toBe(true)
  })

  it('VerdictCard shows the data reference time when fetchedAt is provided', () => {
    render(card(UIL_CLASS_3, 85, Date.parse('2026-08-10T18:00:00+00:00')))
    expect(screen.getByText(/forecast loaded/i)).toBeInTheDocument()
  })
})

function hourAt(wbgtF: number): HourVerdict {
  return {
    time: Date.parse('2026-08-10T20:00:00+00:00'),
    wbgtF,
    source: 'nws',
    tempF: null,
    flag: classifyWbgt(UIL_CLASS_3, wbgtF).flag,
    borderline: isBorderline(UIL_CLASS_3, wbgtF),
    localHour: 15,
    localDate: '2026-08-10',
  }
}

function card(policy: typeof UIL_CLASS_3, wbgtF: number, fetchedAt: number | null = null) {
  return (
    <VerdictCard
      hour={hourAt(wbgtF)}
      policy={policy}
      locationLabel="Test, TX"
      stateAbbr="TX"
      timeZone="America/Chicago"
      fetchedAt={fetchedAt}
    />
  )
}

describe('granularity batch copy (G1-G4)', () => {
  it('G1: Texas class copy gives geography, not "when in doubt" resignation', () => {
    expect(en.texas.classesBody).not.toContain('when in doubt')
    expect(en.texas.classesBody).toContain('Class 3')
    expect(en.texas.classesBody).toContain('Panhandle')
    expect(en.policies.txClassHint).toContain('Houston')
    expect(es.policies.txClassHint).toContain('Houston')
  })

  it('G2: generic-fallback regional caveat renders only for the NATA policy', () => {
    const { unmount } = render(card(GENERIC_NATA as typeof UIL_CLASS_3, 85))
    expect(
      screen.getByText(
        i18n.t('verdict.genericRegionNotice'),
      ),
    ).toBeInTheDocument()
    unmount()
    render(card(UIL_CLASS_3, 85))
    expect(screen.queryByText(i18n.t('verdict.genericRegionNotice'))).not.toBeInTheDocument()
  })

  it('G3: surface caveat renders always and never claims artificial turf is hotter', () => {
    render(card(UIL_CLASS_3, 85))
    expect(screen.getByText(i18n.t('verdict.surfaceNotice'))).toBeInTheDocument()
    for (const locale of [en, es]) {
      const s = locale.verdict.surfaceNotice.toLowerCase()
      expect(s).not.toContain('turf')
      expect(s).not.toContain('artificial')
      expect(s).not.toContain('césped')
    }
  })

  it('G4: district caveat exists and the states intro carries the VA/MD layer', () => {
    for (const locale of [en, es]) {
      expect(locale.policies.districtNote.length).toBeGreaterThan(0)
      expect(locale.states.intro).toContain('Virginia')
      expect(locale.states.intro).toContain('Maryland')
    }
  })
})
