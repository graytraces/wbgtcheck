import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isStaleChunkError, reloadOnceForStaleAssets } from '../utils/staleRecovery'

describe('isStaleChunkError', () => {
  it('matches the failed-dynamic-import wording of all three engines', () => {
    // Chrome / Safari / Firefox respectively — the messages a stale deploy
    // produces when a hashed route chunk has been removed.
    const messages = [
      'Failed to fetch dynamically imported module: https://wbgtcheck.com/assets/Texas-abc.js',
      'Importing a module script failed.',
      'error loading dynamically imported module',
    ]
    for (const message of messages) {
      expect(isStaleChunkError(new Error(message)), message).toBe(true)
      expect(isStaleChunkError(message), message).toBe(true)
    }
  })

  it('rejects unrelated errors — those must show the retry UI, not reload', () => {
    expect(isStaleChunkError(new Error('boom'))).toBe(false)
    expect(isStaleChunkError(new TypeError('undefined is not a function'))).toBe(false)
    expect(isStaleChunkError(undefined)).toBe(false)
    expect(isStaleChunkError(null)).toBe(false)
    expect(isStaleChunkError({ status: 404 })).toBe(false)
  })
})

describe('reloadOnceForStaleAssets', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('reloads on the first call and reports true', () => {
    const reload = vi.fn()
    expect(reloadOnceForStaleAssets(reload)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('refuses a second reload inside the guard window (no reload loop)', () => {
    const reload = vi.fn()
    expect(reloadOnceForStaleAssets(reload)).toBe(true)
    expect(reloadOnceForStaleAssets(reload)).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('allows a reload again once the guard window has passed', () => {
    const reload = vi.fn()
    // A flag from a previous, long-resolved incident must not block recovery.
    window.sessionStorage.setItem('wbgt-stale-reload', String(Date.now() - 120_000))
    expect(reloadOnceForStaleAssets(reload)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
