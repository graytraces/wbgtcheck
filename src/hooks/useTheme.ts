import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'wbgt-theme'

type Theme = 'light' | 'dark'

function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  // Light is the default identity (morning outdoor readability); only follow
  // the OS when it explicitly prefers dark.
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((cur) => (cur === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle }
}
