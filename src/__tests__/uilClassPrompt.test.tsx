import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { screen, fireEvent, act, renderHook, waitFor } from '@testing-library/react'
import i18n from '../i18n'
import en from '../locales/en.json'
import es from '../locales/es.json'
import { useWbgt } from '../hooks/useWbgt'
import {
  installMemoryStorage,
  stubForecastFetch,
  renderHome,
  AUSTIN_TX,
} from '../test/homeFixture'

/**
 * Texas class prompt (P0-2).
 *
 * UIL assigns Class 2 or Class 3 by county and no machine-readable county list
 * is published, so the site defaults to the stricter Class 2. At Austin's
 * August forecast that default flags the whole week black — "no practice",
 * every day — where Class 3, the ladder most of central and east Texas is
 * actually on, caps practice at an hour. A default that severe has to announce
 * itself above the verdict instead of in prose below the picker, and the
 * user's answer has to stick.
 */

let store: Map<string, string>

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  store = installMemoryStorage()
  stubForecastFetch()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function homeWithTexasLocation() {
  store.set('wbgt-location', JSON.stringify(AUSTIN_TX))
  const view = renderHome()
  await waitFor(() => expect(screen.getByLabelText(en.policies.pickerLabel)).toBeInTheDocument())
  return view
}

describe('UIL class prompt', () => {
  it('asks Texas users for their class, above the verdict', async () => {
    await homeWithTexasLocation()
    const heading = screen.getByText(en.policies.classPrompt.heading)
    expect(heading).toBeInTheDocument()
    expect(screen.getByText(en.policies.classPrompt.pending)).toBeInTheDocument()

    // The whole finding was that the caveat sat BELOW the picker, under the
    // verdict it qualifies. Pin the order, not just the presence.
    const verdict = screen.getByText(en.verdict.conservativeNotice.split('{{')[0].trim(), {
      exact: false,
    })
    const picker = screen.getByLabelText(en.policies.pickerLabel)
    for (const later of [verdict, picker]) {
      expect(heading.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('does not ask outside Texas', async () => {
    store.set(
      'wbgt-location',
      JSON.stringify({ lat: 33.75, lon: -84.39, label: 'Atlanta, GA', stateAbbr: 'GA' }),
    )
    renderHome()
    await waitFor(() => expect(screen.getByLabelText(en.policies.pickerLabel)).toBeInTheDocument())
    expect(screen.queryByText(en.policies.classPrompt.heading)).not.toBeInTheDocument()
  })

  it('answering stores the class and stops asking', async () => {
    const view = await homeWithTexasLocation()
    fireEvent.click(screen.getByRole('button', { name: en.policies['uil-class-3'] }))

    expect(screen.queryByText(en.policies.classPrompt.heading)).not.toBeInTheDocument()
    expect(store.get('wbgt-policy')).toBe(JSON.stringify('uil-class-3'))
    expect(store.get('wbgt-uil-class')).toBe(JSON.stringify('uil-class-3'))
    // The class hint takes over once the question is answered.
    expect(screen.getByText(en.policies.txClassHint)).toBeInTheDocument()

    view.unmount()
    renderHome()
    await waitFor(() => expect(screen.getByLabelText(en.policies.pickerLabel)).toBeInTheDocument())
    expect(screen.queryByText(en.policies.classPrompt.heading)).not.toBeInTheDocument()
  })

  it('choosing Class 2 also counts as an answer (it is a choice, not the default)', () => {
    const { result } = renderHook(() => useWbgt())
    expect(result.current.uilClassChosen).toBe(false)
    act(() => {
      result.current.setPolicyId('uil-class-2')
    })
    expect(result.current.uilClassChosen).toBe(true)
    expect(store.get('wbgt-uil-class')).toBe(JSON.stringify('uil-class-2'))
  })

  it('a non-UIL policy pick never answers the Texas question', () => {
    const { result } = renderHook(() => useWbgt())
    act(() => {
      result.current.setPolicyId('generic')
    })
    expect(result.current.uilClassChosen).toBe(false)
    expect(store.get('wbgt-uil-class')).toBeUndefined()
  })

  it('carries the region guidance and the map link in both locales', () => {
    for (const locale of [en, es]) {
      const prompt = locale.policies.classPrompt
      expect(prompt.body).toContain('Austin')
      expect(prompt.body).toContain('Panhandle')
      expect(prompt.mapLink.length).toBeGreaterThan(0)
      // The load-bearing line: it says the flags on screen are the strict
      // guess, not a finding about the user's own school.
      expect(prompt.pending.length).toBeGreaterThan(0)
    }
  })
})
