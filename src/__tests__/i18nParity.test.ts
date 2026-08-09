import { describe, it, expect } from 'vitest'
import en from '../locales/en.json'
import es from '../locales/es.json'

/**
 * EN↔ES structural parity: every key present in one locale must exist in the
 * other with the same shape, and interpolation placeholders must match — a
 * missing ES key silently falls back to English (EN-leak).
 */

type Tree = Record<string, unknown>

function keyPaths(obj: Tree, prefix = ''): string[] {
  const out: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...keyPaths(v as Tree, path))
    } else {
      out.push(path)
    }
  }
  return out.sort()
}

function placeholders(s: string): string[] {
  return [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()
}

function leafAt(obj: Tree, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o as Tree)?.[k], obj)
}

describe('EN/ES locale parity', () => {
  it('key structures are identical', () => {
    expect(keyPaths(es as Tree)).toEqual(keyPaths(en as Tree))
  })

  it('interpolation placeholders match per key', () => {
    for (const path of keyPaths(en as Tree)) {
      const enLeaf = leafAt(en as Tree, path)
      const esLeaf = leafAt(es as Tree, path)
      if (typeof enLeaf === 'string' && typeof esLeaf === 'string') {
        expect(placeholders(esLeaf), `placeholder mismatch at ${path}`).toEqual(
          placeholders(enLeaf),
        )
      }
    }
  })

  it('array sections have equal lengths (home.sections)', () => {
    expect((es as Tree & { home: { sections: unknown[] } }).home.sections.length).toBe(
      (en as Tree & { home: { sections: unknown[] } }).home.sections.length,
    )
  })
})

describe('Spanish quotation handling', () => {
  // Two ES strings had the association's words TRANSLATED inside quotation
  // marks — quoting sentences UIL and SCHSL never wrote — while iowa and
  // tennessee kept the originals. Quotations now stay in the source language
  // everywhere, with a parenthetical gloss, and each guide page says so once.
  it('keeps association quotations in their original English', () => {
    const cases: Array<[string, string]> = [
      [es.texas.measurementApps, 'other scientifically proven method'],
      [es.states.notes.sc, 'phone apps are not scientifically approved'],
      [es.iowa.appsBody, '{{apps}}'],
      [es.tennessee.appsBody, '{{apps}}'],
    ]
    for (const [text, original] of cases) {
      expect(text, `quotation should carry the source wording: ${original}`).toContain(original)
    }
  })

  it('tells Spanish readers the quotations are deliberately untranslated', () => {
    expect(es.common.quotesInEnglish.length).toBeGreaterThan(0)
    expect(en.common.quotesInEnglish.length).toBeGreaterThan(0)
  })

  it('has no leftover machine-translated quotation of the UIL plan', () => {
    // The specific fabricated rendering that shipped.
    expect(es.texas.measurementApps).not.toContain(
      '"u otro método científicamente probado',
    )
  })
})
