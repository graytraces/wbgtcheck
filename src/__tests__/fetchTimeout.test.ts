import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  fetchWithTimeout,
  CLIENT_FETCH_TIMEOUT_MS,
  UPSTREAM_FETCH_TIMEOUT_MS,
} from '../utils/fetchWithTimeout'

/**
 * A hung upstream used to be worse than a failed one: status stayed 'loading',
 * the UI showed "Loading…" forever, and both recovery affordances (the retry
 * button and the stale banner) live inside the 'ready' branch, so neither
 * could appear. The only way out was a manual reload.
 */

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('fetchWithTimeout', () => {
  it('aborts a request that never settles', async () => {
    vi.useFakeTimers()
    // A fetch that only ever rejects when its signal aborts — i.e. a hung
    // upstream, which is the case with no natural end.
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () =>
              reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
            )
          }),
      ),
    )
    const pending = fetchWithTimeout('https://example.test/slow', {}, 1000)
    const assertion = expect(pending).rejects.toThrow(/abort/i)
    await vi.advanceTimersByTimeAsync(1001)
    await assertion
  })

  it('does not abort a request that answers in time', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 200 }))),
    )
    const res = await fetchWithTimeout('https://example.test/fast', {}, 1000)
    expect(res.status).toBe(200)
  })

  it('clears its timer so a resolved call cannot abort later', async () => {
    vi.useFakeTimers()
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout')
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 200 }))),
    )
    await fetchWithTimeout('https://example.test/fast', {}, 1000)
    expect(clearSpy).toHaveBeenCalled()
  })

  it('still passes the caller-supplied init through', async () => {
    const fetchMock = vi.fn((_input: string, _init?: RequestInit) =>
      Promise.resolve(new Response('{}', { status: 200 })),
    )
    vi.stubGlobal('fetch', fetchMock)
    await fetchWithTimeout('https://example.test/x', { headers: { Accept: 'application/json' } })
    const init = fetchMock.mock.calls[0][1]!
    expect((init.headers as Record<string, string>).Accept).toBe('application/json')
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('gives the proxy a shorter deadline than the client it answers', () => {
    // So the worker fails first and can return a status, instead of having the
    // connection cut out from under it.
    expect(UPSTREAM_FETCH_TIMEOUT_MS).toBeLessThan(CLIENT_FETCH_TIMEOUT_MS)
  })
})
