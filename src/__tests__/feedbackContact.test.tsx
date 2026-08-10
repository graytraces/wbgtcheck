import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { requireFreshDist } from '../test/requireDist'
import type { ReactElement } from 'react'
import i18n from '../i18n'
import en from '../locales/en.json'
import es from '../locales/es.json'
import { FEEDBACK_EMAIL, feedbackMailto } from '../utils/feedback'
import Layout from '../components/Layout'
import Texas from '../pages/Texas'
import Georgia from '../pages/Georgia'
import SouthCarolina from '../pages/SouthCarolina'
import Tennessee from '../pages/Tennessee'
import Iowa from '../pages/Iowa'
import NorthCarolina from '../pages/NorthCarolina'
import NewYork from '../pages/NewYork'
import Virginia from '../pages/Virginia'
import WashingtonAir from '../pages/WashingtonAir'
import OregonAir from '../pages/OregonAir'
import CaliforniaAir from '../pages/CaliforniaAir'

/**
 * Contact-surface rules. HARD RULE: the operator's personal address must
 * never appear anywhere on the site — every contact surface routes through
 * FEEDBACK_EMAIL (src/data/feedbackContact.js). The dist scan covers the
 * prerender path; run `npm run build` first for that test.
 */

const BANNED = 'graytraces'
const DIST = join(__dirname, '../../dist')

function distHtmlFiles(): string[] {
  return readdirSync(DIST, { recursive: true })
    .map(String)
    .filter((f) => f.endsWith('.html'))
}

const GUIDE_PAGES: Array<[string, string, ReactElement]> = [
  ['texas', 'texas', <Texas />],
  ['georgia', 'georgia', <Georgia />],
  ['south-carolina', 'south-carolina', <SouthCarolina />],
  ['tennessee', 'tennessee', <Tennessee />],
  ['iowa', 'iowa', <Iowa />],
  ['north-carolina', 'north-carolina', <NorthCarolina />],
  ['new-york', 'new-york', <NewYork />],
  ['virginia', 'virginia', <Virginia />],
  ['washington-air-quality', 'washington-air-quality', <WashingtonAir />],
  ['oregon-air-quality', 'oregon-air-quality', <OregonAir />],
  ['california-air-quality', 'california-air-quality', <CaliforniaAir />],
]

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('personal address never appears', () => {
  it('locale JSONs carry no banned address fragment', () => {
    expect(JSON.stringify(en)).not.toContain(BANNED)
    expect(JSON.stringify(es)).not.toContain(BANNED)
  })

  it('no built HTML contains the banned fragment (dist scan)', () => {
    requireFreshDist()
    const files = distHtmlFiles()
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const html = readFileSync(join(DIST, file), 'utf8')
      expect(html.includes(BANNED), `${file} contains "${BANNED}"`).toBe(false)
    }
  })

  it('prerendered guide pages carry the correction mailto', () => {
    requireFreshDist()
    for (const lang of ['en', 'es']) {
      const html = readFileSync(join(DIST, lang, 'texas.html'), 'utf8')
      expect(html).toContain(`mailto:${FEEDBACK_EMAIL}`)
    }
  })
})

describe('feedback surfaces', () => {
  it('footer renders the feedback mailto with the prefilled subject', () => {
    // The vitest node runner ships a broken window.localStorage shim
    // (getItem missing); useTheme reads it unguarded on Layout mount.
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    })
    render(
      <MemoryRouter initialEntries={['/en']}>
        <Routes>
          <Route path="/:lang" element={<Layout />}>
            <Route index element={<div />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: en.common.footer.feedback })
    expect(link).toHaveAttribute('href', feedbackMailto('wbgtcheck feedback'))
  })

  it('every guide page renders the correction note with its topic in the subject', () => {
    for (const [topic, path, element] of GUIDE_PAGES) {
      const { unmount, getByRole } = render(
        <MemoryRouter initialEntries={[`/en/${path}`]}>
          <Routes>
            <Route path="/:lang/*" element={element} />
          </Routes>
        </MemoryRouter>,
      )
      const link = getByRole('link', { name: en.common.correctionCta })
      expect(link, topic).toHaveAttribute(
        'href',
        feedbackMailto(`wbgtcheck correction: ${topic}`),
      )
      unmount()
    }
  })
})
