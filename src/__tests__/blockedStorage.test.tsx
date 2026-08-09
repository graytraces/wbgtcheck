import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, renderHook, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import i18n from '../i18n'
import en from '../locales/en.json'
import Layout from '../components/Layout'
import { useTheme } from '../hooks/useTheme'

/**
 * Storage that THROWS, not storage that is empty.
 *
 * Safari's "block all cookies" and some managed-device profiles turn every
 * localStorage access into a SecurityError — reads included. useTheme called
 * getItem and setItem bare, and it runs inside Layout, which wraps every page
 * on the site. One throw there replaced the whole site with the route error
 * fallback, whose advice ("this is fixed in an update, reload the page") was
 * both wrong and permanent for those users: reloading reproduces it exactly.
 */

function installThrowingStorage() {
  const boom = () => {
    throw new DOMException('The operation is insecure.', 'SecurityError')
  }
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      return { getItem: boom, setItem: boom, removeItem: boom, clear: boom }
    },
  })
}

const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia')

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  installThrowingStorage()
})

afterEach(() => {
  if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia)
})

describe('blocked localStorage', () => {
  it('useTheme still resolves a theme instead of throwing', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
    // Toggling writes to storage — the write must not take the page down.
    act(() => {
      result.current.toggle()
    })
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    act(() => {
      result.current.toggle()
    })
  })

  it('a throwing matchMedia also falls back to light rather than throwing', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => {
        throw new Error('blocked')
      },
    })
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
  })

  it('the whole site still renders — Layout wraps every page', () => {
    render(
      <MemoryRouter initialEntries={['/en']}>
        <Routes>
          <Route path="/:lang" element={<Layout />}>
            <Route index element={<p>page body</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('page body')).toBeInTheDocument()
    // The nav is proof the chrome mounted rather than the error fallback.
    expect(screen.getAllByRole('link', { name: en.common.nav.states }).length).toBeGreaterThan(0)
  })
})
