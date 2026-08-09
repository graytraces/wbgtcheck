import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../i18n'
import en from '../locales/en.json'
import es from '../locales/es.json'
import PrivacyPolicy from '../pages/PrivacyPolicy'
import { MAX_LOG_ENTRIES } from '../data/logRetention.js'

/**
 * The privacy policy has to describe what this build actually stores, and it
 * fell a release behind: the reading log shipped keeping up to 200 entries —
 * each with a timestamp, a WBGT, a source, flag and policy keys and a location
 * label — while the policy still described a single saved location. The scan
 * below fails when a new storage key appears without a mention here.
 */

const SRC = join(process.cwd(), 'src')

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'test') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) sourceFiles(full, out)
    else if (/\.(ts|tsx|js)$/.test(entry.name)) out.push(full)
  }
  return out
}

/** Every storage key the app reads or writes, straight from the source. */
function storageKeysInSource(): string[] {
  const keys = new Set<string>()
  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(/(?:LOCAL|SESSION)?_?(?:KEY|FLAG_KEY)\s*=\s*'([^']+)'/g)) {
      if (match[1].startsWith('wbgt')) keys.add(match[1])
    }
  }
  return [...keys].sort()
}

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('privacy disclosure', () => {
  it('names every storage key the code uses', () => {
    const keys = storageKeysInSource()
    // Guard the guard: if the regex stops matching, this test would pass
    // vacuously and the disclosure could rot unnoticed.
    expect(keys.length).toBeGreaterThanOrEqual(7)

    // What each key is, in the words the policy uses for it. Adding a storage
    // key means adding it here AND saying so on the page.
    const disclosed: Record<string, RegExp> = {
      'wbgt-location': /last location/i,
      'wbgt-policy': /chosen policy/i,
      'wbgt-uil-class': /UIL class/i,
      'wbgt-theme': /light or dark/i,
      'wbgt-activity': /activity duration/i,
      'wbgt:log:v1': /reading log/i,
      'wbgt-a2hs-dismissed': /add-to-home-screen/i,
      'wbgt-stale-reload': /session storage/i,
    }
    const policyText = `${en.privacy.locationContent} ${en.privacy.logContent} ${en.privacy.storageContent}`
    for (const key of keys) {
      const pattern = disclosed[key]
      expect(pattern, `storage key ${key} is not described in the privacy policy`).toBeDefined()
      expect(policyText, `privacy policy does not describe ${key}`).toMatch(pattern)
    }
  })

  it('states what a log entry holds, its cap, and how to delete it', () => {
    for (const [locale, place] of [
      [en, /location/i],
      [es, /ubicación/i],
    ] as const) {
      expect(locale.privacy.logContent).toContain('{{max}}')
      // The two fields a reader would be surprised to learn are kept.
      expect(locale.privacy.logContent).toMatch(/WBGT/i)
      expect(locale.privacy.logContent).toMatch(place)
    }
    // "Clear all" is the deletion route the log UI actually offers.
    expect(en.privacy.logContent).toMatch(/clear all/i)
    expect(es.privacy.logContent).toMatch(/borrar todo/i)
  })

  it('renders the cap from the same constant the log enforces', () => {
    render(
      <MemoryRouter initialEntries={['/en/privacy']}>
        <PrivacyPolicy />
      </MemoryRouter>,
    )
    expect(screen.getByText(new RegExp(`${MAX_LOG_ENTRIES} entries`))).toBeInTheDocument()
    expect(screen.queryByText(/\{\{max\}\}/)).not.toBeInTheDocument()
  })

  it('names AirNow as the air-quality source without overstating what it receives', () => {
    for (const locale of [en, es]) {
      expect(locale.privacy.dataContent).toMatch(/AirNow/)
      expect(locale.privacy.dataContent).toMatch(/EPA/)
    }
    // The worker downloads AirNow's whole hourly file and matches the nearest
    // reporting area itself, so coordinates never reach AirNow. Saying they do
    // would be a false disclosure in the alarming direction.
    expect(en.privacy.dataContent).toMatch(/never sent to AirNow/i)
    expect(es.privacy.dataContent).toMatch(/nunca se envían a AirNow/i)
  })
})

describe('advertising consent matches the stated policy', () => {
  it('denies all three ad signals in every region', () => {
    // The policy says the site runs no ads. The second consent default —
    // everywhere outside the EEA/UK list — used to GRANT ad_storage,
    // ad_user_data and ad_personalization, collecting advertising-grade data
    // the product does not use and the policy disclaims.
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
    const script = /<script>([\s\S]*?)<\/script>/.exec(html)![1]
    const defaults = [...script.matchAll(/gtag\('consent',\s*'default',\s*\{([\s\S]*?)\}\s*\)/g)]
    expect(defaults.length).toBeGreaterThanOrEqual(2)
    for (const [, body] of defaults) {
      for (const signal of ['ad_storage', 'ad_user_data', 'ad_personalization']) {
        expect(body, `${signal} must be denied in every consent default`).toMatch(
          new RegExp(`${signal}:\\s*'denied'`),
        )
      }
    }
    // And the policy still says so.
    expect(en.privacy.analyticsContent.toLowerCase()).toContain('do not run ads')
  })
})
