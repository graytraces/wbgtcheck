import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import i18n from '../i18n'
import en from '../locales/en.json'
import RouteErrorFallback from '../components/RouteErrorFallback'
import * as staleRecovery from '../utils/staleRecovery'

/**
 * The router-level net for stale deploys: a failed lazy chunk must reload
 * once, everything else (and a reload that already ran) must show the
 * branded retry UI instead of react-router's raw default error page.
 */

function Boom({ message }: { message: string }): never {
  throw new Error(message)
}

function renderWithError(message: string) {
  const router = createMemoryRouter([
    { path: '/', element: <Boom message={message} />, errorElement: <RouteErrorFallback /> },
  ])
  return render(<RouterProvider router={router} />)
}

let consoleError: ReturnType<typeof vi.spyOn>

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  window.sessionStorage.clear()
  // react-router logs the caught error; keep test output readable.
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleError.mockRestore()
  vi.restoreAllMocks()
})

describe('RouteErrorFallback', () => {
  it('shows the retry UI for a non-chunk error (no reload attempt)', () => {
    const reloadSpy = vi.spyOn(staleRecovery, 'reloadOnceForStaleAssets').mockReturnValue(true)
    renderWithError('boom')
    expect(screen.getByText(en.common.error)).toBeInTheDocument()
    expect(screen.getByText(en.common.errorReloadHint)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en.common.retry })).toBeInTheDocument()
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('auto-reloads once for a stale-chunk error and renders nothing meanwhile', () => {
    const reloadSpy = vi.spyOn(staleRecovery, 'reloadOnceForStaleAssets').mockReturnValue(true)
    renderWithError('Importing a module script failed.')
    expect(reloadSpy).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(en.common.error)).not.toBeInTheDocument()
  })

  it('falls back to the retry UI when the reload guard refuses (loop protection)', () => {
    vi.spyOn(staleRecovery, 'reloadOnceForStaleAssets').mockReturnValue(false)
    renderWithError('Failed to fetch dynamically imported module: /assets/Texas-abc.js')
    expect(screen.getByText(en.common.error)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en.common.retry })).toBeInTheDocument()
  })
})
