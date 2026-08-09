import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWbgtLog, readWbgtLog, WBGT_LOG_KEY, MAX_LOG_ENTRIES } from '../hooks/useWbgtLog'

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

describe('useWbgtLog when storage refuses the write', () => {
  function installFailingStorage() {
    const store = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: () => {
          throw new DOMException('quota', 'QuotaExceededError')
        },
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
      },
    })
  }

  it('reports the failure instead of swallowing it', () => {
    // The log exists to be a record. Silently keeping it in memory only,
    // behind a success toast, sends the user away believing they have a file.
    installFailingStorage()
    const { result } = renderHook(() => useWbgtLog())
    let persisted = true
    act(() => {
      persisted = result.current.addEntry(BASE).persisted
    })
    expect(persisted).toBe(false)
    // Still usable on screen for the rest of the session.
    expect(result.current.entries).toHaveLength(1)
  })

  it('reports success when storage accepts the write', () => {
    const { result } = renderHook(() => useWbgtLog())
    let persisted = false
    act(() => {
      persisted = result.current.addEntry(BASE).persisted
    })
    expect(persisted).toBe(true)
    expect(readWbgtLog()).toHaveLength(1)
  })
})

describe('reading log cap', () => {
  it('keeps the newest MAX_LOG_ENTRIES rows and drops the oldest', () => {
    const { result } = renderHook(() => useWbgtLog())
    act(() => {
      for (let i = 0; i < MAX_LOG_ENTRIES + 25; i++) {
        result.current.addEntry({ ...BASE, wbgtF: 70 + (i % 30) })
      }
    })
    const stored = readWbgtLog()
    expect(stored).toHaveLength(MAX_LOG_ENTRIES)
    // Newest first, so the survivors are the most recent writes.
    expect(stored[0].timestamp).toBeGreaterThanOrEqual(stored[stored.length - 1].timestamp)
    expect(JSON.parse(store.get(WBGT_LOG_KEY)!)).toHaveLength(MAX_LOG_ENTRIES)
  })
})
