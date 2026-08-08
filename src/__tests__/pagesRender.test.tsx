import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { ReactElement } from 'react'
import i18n from '../i18n'
import en from '../locales/en.json'
import Home from '../pages/Home'
import Texas from '../pages/Texas'
import Georgia from '../pages/Georgia'
import States from '../pages/States'
import Disclaimer from '../pages/Disclaimer'
import { UIL_CLASS_2, UIL_CLASS_3, GHSA } from '../data/policyOracle'
import { STATE_DIRECTORY } from '../data/stateDirectory'

/**
 * Rendered-DOM (post-JS) prose survival guards — the WRS-visible tree, not
 * the prerender HTML. App.tsx strips [data-prerender] on mount, so anything
 * asserted here must come from the React render itself (wiki:
 * prerender-wrs-prosewipe; assertions derive from the oracle, not copied
 * strings).
 */

function renderAt(path: string, element: ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:lang" element={element} />
        <Route path="/:lang/*" element={element} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('post-JS rendered DOM', () => {
  it('Home renders the keyword H1 from home.pageTitle (H1-desync guard)', () => {
    renderAt('/en', <Home />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toBe(en.home.pageTitle)
  })

  it('Home renders the prose sections (not only prerender)', () => {
    renderAt('/en', <Home />)
    for (const section of en.home.sections) {
      expect(screen.getByText(section.heading)).toBeInTheDocument()
    }
  })

  it('Texas renders every oracle band label for both classes', () => {
    renderAt('/en/texas', <Texas />)
    for (const band of [...UIL_CLASS_2.bands, ...UIL_CLASS_3.bands]) {
      expect(screen.getAllByText(band.sourceLabel).length).toBeGreaterThan(0)
    }
  })

  it('Georgia renders every GHSA band label and the device-only warning', () => {
    renderAt('/en/georgia', <Georgia />)
    for (const band of GHSA.bands) {
      expect(screen.getAllByText(band.sourceLabel).length).toBeGreaterThan(0)
    }
    expect(screen.getByText(en.georgia.deviceWarning)).toBeInTheDocument()
  })

  it('States renders one row per directory entry', () => {
    renderAt('/en/states', <States />)
    for (const row of STATE_DIRECTORY) {
      expect(screen.getAllByText(row.abbr).length).toBeGreaterThan(0)
    }
  })

  it('Disclaimer renders the not-a-measurement and not-compliance sections', () => {
    renderAt('/en/disclaimer', <Disclaimer />)
    expect(screen.getByText(en.disclaimerPage.notMeasurement)).toBeInTheDocument()
    expect(screen.getByText(en.disclaimerPage.notCompliance)).toBeInTheDocument()
  })
})
