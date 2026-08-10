import { describe, it, expect, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import i18n from '../i18n'
import SEO from '../components/SEO'
import { requireFreshDist } from '../test/requireDist'

/**
 * Share cards.
 *
 * Until public/og-{lang}.png existed, every share of every page on this site
 * unfurled as a bare link — no image, in Slack, iMessage, WhatsApp, Discord
 * and Facebook alike. That is not cosmetic on a product whose only
 * distribution is a coach pasting a verdict into a team chat: the link that
 * shows nothing is the link nobody opens.
 *
 * Three things have to hold together and each has failed separately in this
 * repo's history:
 *   1. the file exists and is the size the meta tags CLAIM (an og:image:width
 *      that disagrees with the file makes Facebook re-crop or drop it);
 *   2. the built HTML carries it, per locale — index.html holds an English
 *      default, so a Spanish page that kept it would advertise the wrong card;
 *   3. <SEO> re-emits it after hydration. The prerendered meta tags carry
 *      data-prerender and are DELETED on mount (see structuredData.test.tsx);
 *      the JSON-LD survived that only because it was excluded. og:image has no
 *      such exclusion, so if <SEO> ever stopped emitting it, the served HTML
 *      would still look right and the post-JS DOM — which is what a crawler
 *      that renders sees — would have none.
 */

const REPO = process.cwd()
const WIDTH = 1200
const HEIGHT = 630
const LANGS = ['en', 'es'] as const

/** Width/height straight out of the PNG's IHDR chunk. */
function pngSize(bytes: Buffer): { width: number; height: number } {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  expect(bytes.subarray(0, 8).equals(signature), 'not a PNG').toBe(true)
  expect(bytes.toString('ascii', 12, 16), 'first chunk is not IHDR').toBe('IHDR')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

describe('the share card asset', () => {
  for (const lang of LANGS) {
    it(`public/og-${lang}.png is a ${WIDTH}×${HEIGHT} PNG`, () => {
      const path = join(REPO, 'public', `og-${lang}.png`)
      expect(existsSync(path), `${path} missing — run node scripts/gen-og-image.mjs`).toBe(true)
      const bytes = readFileSync(path)
      expect(pngSize(bytes)).toEqual({ width: WIDTH, height: HEIGHT })
      // Facebook rejects over 8MB and Twitter over 5MB; this card is flat
      // colour and type, so anything approaching even 300KB means something
      // has gone wrong in the generator (a photo, an unscaled screenshot).
      expect(bytes.length, `og-${lang}.png is ${(bytes.length / 1024).toFixed(0)}KB`).toBeLessThan(
        300 * 1024,
      )
    })
  }

  it('the two locales are different images, not one file copied twice', () => {
    const [en, es] = LANGS.map((lang) => readFileSync(join(REPO, 'public', `og-${lang}.png`)))
    expect(en.equals(es)).toBe(false)
  })
})

describe('built HTML carries the card for ITS locale', () => {
  let files: string[] = []

  beforeAll(() => {
    const dist = requireFreshDist()
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? walk(join(dir, entry.name))
          : entry.name.endsWith('.html')
            ? [join(dir, entry.name)]
            : [],
      )
    files = walk(dist)
  })

  it('every page has exactly one og:image, and it is the page language', () => {
    // 22 pages × 2 locales. A smaller number means the walk missed a tree and
    // every assertion below covers less than it appears to.
    expect(files.length).toBeGreaterThanOrEqual(40)
    for (const file of files) {
      const html = readFileSync(file, 'utf-8')
      const rel = file.replace(`${process.cwd()}/`, '')
      // Attribute-order tolerant, but `property="og:image"` is matched with
      // its closing quote so og:image:width and og:image:alt do not count.
      const images = [
        ...html.matchAll(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/g),
      ].map((m) => m[1])
      expect(images, `${rel} og:image count`).toHaveLength(1)
      // dist/en.html and dist/es/texas.html — the locale is the first path
      // segment under dist, or the filename for the two home pages.
      const lang = /<html lang="(\w+)"/.exec(html)![1]
      expect(images[0], `${rel} advertises the wrong locale's card`).toBe(
        `https://wbgtcheck.com/og-${lang}.png`,
      )
    }
  })

  it('every page declares the dimensions the file actually has', () => {
    const real = pngSize(readFileSync(join(REPO, 'public', 'og-en.png')))
    for (const file of files) {
      const html = readFileSync(file, 'utf-8')
      const rel = file.replace(`${process.cwd()}/`, '')
      expect(html, `${rel} og:image:width`).toContain(
        `<meta data-prerender="true" property="og:image:width" content="${real.width}"`,
      )
      expect(html, `${rel} og:image:height`).toContain(
        `<meta data-prerender="true" property="og:image:height" content="${real.height}"`,
      )
    }
  })

  it('twitter:card is summary_large_image everywhere, and only once', () => {
    for (const file of files) {
      const html = readFileSync(file, 'utf-8')
      const rel = file.replace(`${process.cwd()}/`, '')
      const cards = [...html.matchAll(/<meta[^>]*name="twitter:card" content="([^"]+)"/g)].map(
        (m) => m[1],
      )
      // The English default in index.html has to be STRIPPED, not merely
      // overridden: two twitter:card tags and the unfurler takes the first.
      expect(cards, `${rel} twitter:card`).toEqual(['summary_large_image'])
    }
  })

  it('the card file ships to dist/ (the meta tags point at a real URL)', () => {
    const dist = requireFreshDist()
    for (const lang of LANGS) {
      expect(existsSync(join(dist, `og-${lang}.png`)), `dist/og-${lang}.png`).toBe(true)
    }
  })
})

describe('SEO re-emits the card after hydration', () => {
  const renderAt = (lang: string, path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/:lang/*" element={<SEO pageKey="texas" />} />
          <Route path="/:lang" element={<SEO pageKey="home" />} />
        </Routes>
      </MemoryRouter>,
    ) && lang

  for (const lang of LANGS) {
    it(`emits the ${lang} card, its dimensions and twitter:image`, async () => {
      await i18n.changeLanguage(lang)
      renderAt(lang, `/${lang}/texas`)

      const content = (selector: string) =>
        document.head.querySelector<HTMLMetaElement>(selector)?.content

      expect(content('meta[property="og:image"]')).toBe(`https://wbgtcheck.com/og-${lang}.png`)
      expect(content('meta[property="og:image:width"]')).toBe(String(WIDTH))
      expect(content('meta[property="og:image:height"]')).toBe(String(HEIGHT))
      expect(content('meta[name="twitter:card"]')).toBe('summary_large_image')
      expect(content('meta[name="twitter:image"]')).toBe(`https://wbgtcheck.com/og-${lang}.png`)

      // The alt is localized copy, not the key echoed back by a missing
      // translation — seo.ogCard.headline exists in both locales.
      const alt = content('meta[property="og:image:alt"]')
      expect(alt).toBeTruthy()
      expect(alt).not.toContain('seo.ogCard')
      await i18n.changeLanguage('en')
    })
  }

  it('the two locales get different alt text', async () => {
    const alts: string[] = []
    for (const lang of LANGS) {
      await i18n.changeLanguage(lang)
      renderAt(lang, `/${lang}/texas`)
      alts.push(document.head.querySelector<HTMLMetaElement>('meta[property="og:image:alt"]')!.content)
    }
    await i18n.changeLanguage('en')
    expect(alts[0]).not.toBe(alts[1])
  })
})
