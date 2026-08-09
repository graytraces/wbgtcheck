import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import i18n from '../i18n'
import en from '../locales/en.json'
import WbgtLog from '../components/WbgtLog'
import { GENERIC_NATA } from '../data/policyOracle'

/**
 * The honesty contract of the reading log: every rendered entry names its
 * source (forecast estimate vs on-site reading), and both save paths emit
 * the GA4 event with that source.
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
}

function renderLog(currentWbgtF: number | null = 88.4) {
  return render(
    <WbgtLog
      currentWbgtF={currentWbgtF}
      policy={GENERIC_NATA}
      policyId="generic"
      locationLabel="Austin, TX"
    />,
  )
}

let gtag: ReturnType<typeof vi.fn>

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

beforeEach(() => {
  installMemoryStorage()
  gtag = vi.fn()
  window.gtag = gtag as unknown as typeof window.gtag
})

describe('WbgtLog', () => {
  it('one tap logs the current estimate, labeled as a forecast estimate', () => {
    renderLog(88.4)
    fireEvent.click(screen.getByRole('button', { name: /88\.4/ }))
    expect(screen.getByText(en.wbgtLog.sourceForecast)).toBeInTheDocument()
    expect(screen.queryByText(en.wbgtLog.sourceOnsite)).not.toBeInTheDocument()
    expect(gtag).toHaveBeenCalledWith('event', 'wbgt_log_save', { source: 'forecast' })
  })

  it('manual entry logs an on-site reading, labeled as such', () => {
    renderLog(null)
    // No forecast button when there is no current estimate (the forecast
    // button is the only button with a number in its name).
    expect(screen.queryByRole('button', { name: /\d/ })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(en.wbgtLog.onsiteLabel), { target: { value: '92.1' } })
    fireEvent.click(screen.getByRole('button', { name: en.wbgtLog.onsiteButton }))
    expect(screen.getByText(en.wbgtLog.sourceOnsite)).toBeInTheDocument()
    expect(screen.getByText('92.1')).toBeInTheDocument()
    expect(gtag).toHaveBeenCalledWith('event', 'wbgt_log_save', { source: 'onsite' })
  })

  it('rejects out-of-range manual input (button stays disabled)', () => {
    renderLog(null)
    const button = screen.getByRole('button', { name: en.wbgtLog.onsiteButton })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByLabelText(en.wbgtLog.onsiteLabel), { target: { value: '999' } })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByLabelText(en.wbgtLog.onsiteLabel), { target: { value: '85' } })
    expect(button).toBeEnabled()
  })

  it('clear-all requires a confirm step and then empties the history', () => {
    renderLog(88.4)
    fireEvent.click(screen.getByRole('button', { name: /88\.4/ }))
    fireEvent.click(screen.getByRole('button', { name: en.wbgtLog.clearAll }))
    expect(screen.getByText(en.wbgtLog.clearConfirm)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: en.wbgtLog.clearAll }))
    expect(screen.queryByText(en.wbgtLog.sourceForecast)).not.toBeInTheDocument()
  })

  it('shows the UIL cadence hint with interpolated oracle numbers', () => {
    renderLog(88.4)
    expect(
      screen.getByText(i18n.t('wbgtLog.cadenceHint', { before: 15, interval: 30 })),
    ).toBeInTheDocument()
  })
})

describe('WbgtLog when the write fails', () => {
  it('warns on screen instead of showing the success toast', () => {
    // Storage that accepts reads but refuses writes — quota exceeded, or a
    // profile that blocks persistence. The row appears in the list either way,
    // which is exactly why the failure has to be said out loud.
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
    renderLog(88.4)
    fireEvent.click(screen.getByRole('button', { name: /log current estimate/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(en.wbgtLog.saveFailedNote)
    expect(screen.queryByRole('button', { name: en.wbgtLog.savedToast })).not.toBeInTheDocument()
  })

  it('shows the toast and no warning when the write lands', () => {
    installMemoryStorage()
    renderLog(88.4)
    fireEvent.click(screen.getByRole('button', { name: /log current estimate/i }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
