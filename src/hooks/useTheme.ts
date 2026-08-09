import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'wbgt-theme'

type Theme = 'light' | 'dark'

/**
 * Storage access is wrapped because it can THROW, not merely return null:
 * Safari with "block all cookies" and some MDM profiles make even reading
 * localStorage a SecurityError. This hook runs inside Layout, which wraps
 * every page, so an unguarded call replaced the entire site with the route
 * error fallback — whose advice ("this is fixed in an update, reload") would
 * have been both wrong and permanent for those users. Every other storage
 * call in this repo is already guarded; this one was the hole.
 */
function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage blocked — fall through to the OS preference
  }
  // Light is the default identity (morning outdoor readability); only follow
  // the OS when it explicitly prefers dark.
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // storage blocked — the theme still applies for this session
    }
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((cur) => (cur === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle }
}
