import { useCallback, useEffect, useState } from 'react'

/**
 * Session reading log — the pooldose light-log pattern ported: localStorage,
 * versioned key, capped list, i18n KEYS stored instead of translated text so
 * a log written in one language renders in the other after a switch.
 *
 * Honesty rule: every entry carries its source — a forecast estimate is
 * never presentable as an on-site reading. UIL recommends (not requires)
 * keeping WBGT records on file; this log is that file for people who want
 * one, not a compliance system.
 */

export const WBGT_LOG_KEY = 'wbgt:log:v1'
export const MAX_LOG_ENTRIES = 200

export type WbgtLogSource = 'forecast' | 'onsite'

export interface WbgtLogEntry {
  id: string
  timestamp: number
  /** °F, one decimal max — formatted at render time. */
  wbgtF: number
  source: WbgtLogSource
  /** i18n KEY of the flag label (flags.<color>.label) under the policy below. */
  flagKey?: string
  /** i18n KEY of the policy name (policies.<id>). */
  policyKey: string
  locationLabel: string
}

export type NewWbgtLogEntry = Omit<WbgtLogEntry, 'id' | 'timestamp'>

function canUseStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function'
  } catch {
    return false
  }
}

// localStorage is user-writable and may hold rows from an older build —
// shape-check every row and drop the malformed ones, never the whole log.
function isEntry(value: unknown): value is WbgtLogEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<WbgtLogEntry>
  return (
    typeof entry.id === 'string' &&
    typeof entry.timestamp === 'number' &&
    Number.isFinite(entry.timestamp) &&
    typeof entry.wbgtF === 'number' &&
    Number.isFinite(entry.wbgtF) &&
    (entry.source === 'forecast' || entry.source === 'onsite') &&
    (entry.flagKey === undefined || typeof entry.flagKey === 'string') &&
    typeof entry.policyKey === 'string' &&
    typeof entry.locationLabel === 'string'
  )
}

export function readWbgtLog(): WbgtLogEntry[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(WBGT_LOG_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEntry).slice(0, MAX_LOG_ENTRIES)
  } catch {
    return []
  }
}

// One shared list across every mounted hook, so a save from the button
// updates the history further down the same page.
const listeners = new Set<(entries: WbgtLogEntry[]) => void>()

function writeWbgtLog(entries: WbgtLogEntry[]): WbgtLogEntry[] {
  // Newest first; the cap drops the oldest rows.
  const capped = entries.slice(0, MAX_LOG_ENTRIES)
  if (canUseStorage()) {
    try {
      window.localStorage.setItem(WBGT_LOG_KEY, JSON.stringify(capped))
    } catch {
      // Quota exceeded or storage blocked — keep the in-memory list usable.
    }
  }
  for (const listener of listeners) listener(capped)
  return capped
}

function makeId(): string {
  const webCrypto = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined
  if (webCrypto && typeof webCrypto.randomUUID === 'function') return webCrypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function useWbgtLog() {
  // Starts empty and fills after mount: the first React render must match
  // the prerendered HTML, which never contains log markup.
  const [entries, setEntries] = useState<WbgtLogEntry[]>([])

  useEffect(() => {
    setEntries(readWbgtLog())
    const listener = (next: WbgtLogEntry[]) => setEntries(next)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  const addEntry = useCallback((entry: NewWbgtLogEntry) => {
    const saved: WbgtLogEntry = { ...entry, id: makeId(), timestamp: Date.now() }
    writeWbgtLog([saved, ...readWbgtLog()])
    return saved
  }, [])

  const removeEntry = useCallback((id: string) => {
    writeWbgtLog(readWbgtLog().filter((entry) => entry.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    writeWbgtLog([])
  }, [])

  return { entries, addEntry, removeEntry, clearAll }
}
