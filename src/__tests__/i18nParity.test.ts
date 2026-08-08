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
