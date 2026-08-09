import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWbgtLog, readWbgtLog, WBGT_LOG_KEY } from '../hooks/useWbgtLog'

/**
 * Storage behavior of the reading log. The vitest node runner ships a broken
 * window.localStorage shim, so an in-memory stand-in is installed per test —
 * which also keeps tests hermetic.
 */

function installMemoryStorage() {
  const store = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    },
  })
  return store
}

const BASE = {
  wbgtF: 88.4,
  source: 'forecast' as const,
  flagKey: 'flags.orange.label',
  policyKey: 'policies.generic',
  locationLabel: 'Austin, TX',
}

let store: Map<string, string>

beforeEach(() => {
  store = installMemoryStorage()
})

describe('useWbgtLog storage', () => {
  it('starts empty and persists a saved entry with id, timestamp and source', () => {
    const { result } = renderHook(() => useWbgtLog())
    expect(result.current.entries).toEqual([])
    act(() => {
      result.current.addEntry(BASE)
    })
    expect(result.current.entries).toHaveLength(1)
    const entry = result.current.entries[0]
    expect(entry.source).toBe('forecast')
    expect(entry.wbgtF).toBe(88.4)
    expect(typeof entry.id).toBe('string')
    expect(entry.timestamp).toBeGreaterThan(0)
    // Round-trips through localStorage under the versioned key.
    expect(JSON.parse(store.get(WBGT_LOG_KEY)!)).toHaveLength(1)
  })

  it('keeps newest first and supports remove and clearAll', () => {
    const { result } = renderHook(() => useWbgtLog())
    act(() => {
      result.current.addEntry({ ...BASE, wbgtF: 80 })
    })
    act(() => {
      result.current.addEntry({ ...BASE, wbgtF: 90, source: 'onsite' })
    })
    expect(result.current.entries.map((e) => e.wbgtF)).toEqual([90, 80])
    const removeId = result.current.entries[0].id
    act(() => {
      result.current.removeEntry(removeId)
    })
    expect(result.current.entries.map((e) => e.wbgtF)).toEqual([80])
    act(() => {
      result.current.clearAll()
    })
    expect(result.current.entries).toEqual([])
    expect(readWbgtLog()).toEqual([])
  })

  it('drops malformed rows from storage instead of throwing the log away', () => {
    const good = {
      id: 'a',
      timestamp: Date.now(),
      wbgtF: 85,
      source: 'onsite',
      policyKey: 'policies.generic',
      locationLabel: 'Austin, TX',
    }
    store.set(
      WBGT_LOG_KEY,
      JSON.stringify([
        good,
        { id: 'b' }, // missing everything else
        { ...good, id: 'c', source: 'guess' }, // invalid source
        { ...good, id: 'd', wbgtF: 'hot' }, // non-numeric value
        'garbage',
      ]),
    )
    expect(readWbgtLog().map((e) => e.id)).toEqual(['a'])
  })

  it('survives unparseable storage', () => {
    store.set(WBGT_LOG_KEY, '{not json')
    expect(readWbgtLog()).toEqual([])
  })
})
