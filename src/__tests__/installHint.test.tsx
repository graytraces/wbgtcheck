import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import i18n from '../i18n'
import en from '../locales/en.json'
import InstallHint from '../components/InstallHint'
import { clearDeferredInstallPrompt } from '../utils/installPrompt'

/** One-time add-to-home-screen hint: shows on iOS, dismisses permanently. */

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

function setUserAgent(ua: string) {
  Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: ua })
}

let store: Map<string, string>

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  store = installMemoryStorage()
  vi.restoreAllMocks()
  clearDeferredInstallPrompt()
})

afterEach(() => {
  clearDeferredInstallPrompt()
})

describe('InstallHint', () => {
  it('shows the Share-menu walkthrough on iOS', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')
    render(<InstallHint />)
    expect(screen.getByText(en.installHint.ios)).toBeInTheDocument()
  })

  it('dismiss is permanent: sets the flag and never renders again', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')
    const first = render(<InstallHint />)
    fireEvent.click(screen.getByRole('button', { name: en.installHint.dismiss }))
    expect(screen.queryByText(en.installHint.ios)).not.toBeInTheDocument()
    expect(store.get('wbgt-a2hs-dismissed')).toBe('1')
    first.unmount()
    render(<InstallHint />)
    expect(screen.queryByText(en.installHint.ios)).not.toBeInTheDocument()
  })

  it('renders nothing on non-iOS without an installability signal', () => {
    // jsdom default UA, no matchMedia coarse-pointer, no beforeinstallprompt.
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
    const { container } = render(<InstallHint />)
    expect(container.firstChild).toBeNull()
  })

  /**
   * The event is now captured at module scope so a late mount cannot miss it,
   * which means the component reads a signal that outlives the page. Desktop
   * Chrome fires `beforeinstallprompt` too, and a desktop install hint is
   * noise this component has always declined to show — the touch check has to
   * gate the seeded event as well as the live one, not just the live one.
   */
  it('does not seed a desktop hint from an event captured earlier in the page', () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
    fireEvent(window, new Event('beforeinstallprompt'))
    // jsdom's matchMedia reports no coarse pointer: a mouse and a keyboard.
    const { container } = render(<InstallHint />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing in standalone (already installed) mode even on iOS', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')
    Object.defineProperty(window.navigator, 'standalone', { configurable: true, value: true })
    const { container } = render(<InstallHint />)
    expect(container.firstChild).toBeNull()
    Object.defineProperty(window.navigator, 'standalone', { configurable: true, value: undefined })
  })
})
