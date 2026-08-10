import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  type BeforeInstallPromptEvent,
} from '../utils/installPrompt'

const DISMISS_KEY = 'wbgt-a2hs-dismissed'

function isStandalone(): boolean {
  try {
    return (
      (window.matchMedia?.('(display-mode: standalone)')?.matches ?? false) ||
      (navigator as { standalone?: boolean }).standalone === true
    )
  } catch {
    return false
  }
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    // Storage blocked: show nothing rather than a hint that returns forever.
    return true
  }
}

/** A touch device — the only place a non-iOS install hint is not noise. */
function isTouch(): boolean {
  return window.matchMedia?.('(pointer: coarse)')?.matches ?? false
}

/**
 * One-time add-to-home-screen hint. iOS gets the Share-menu walkthrough
 * (no install API exists there); other mobile browsers show only when the
 * browser itself offers installability (beforeinstallprompt). Desktop and
 * already-installed contexts never see it, and dismissing is permanent
 * (localStorage). Deliberately no reminders, no re-prompts.
 */
export default function InstallHint() {
  const { t } = useTranslation()
  const ios = isIos()
  /**
   * Seeded from what was captured at module scope, not awaited.
   *
   * Chrome fires `beforeinstallprompt` once, shortly after load. This
   * component does not mount until a verdict has rendered — two NWS round
   * trips — so its own listener below is installed far too late to hear it,
   * and on Android that meant the hint could never appear at all. The
   * subscription stays for the case where the event has not fired yet;
   * `installPrompt.ts` covers the case where it already has.
   */
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(() =>
    !ios && !isStandalone() && !isDismissed() && isTouch() ? getDeferredInstallPrompt() : null,
  )
  const [visible, setVisible] = useState(() => deferred !== null)

  useEffect(() => {
    if (isStandalone() || isDismissed()) return
    if (ios) {
      setVisible(true)
      return
    }
    // Non-iOS: only where the browser signals installability, and only on
    // touch devices — a desktop install hint is noise.
    if (!isTouch()) return
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [ios])

  if (!visible) return null

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // non-fatal — the hint just returns next session
    }
    setVisible(false)
  }

  return (
    <div className="flex items-start justify-between gap-3 border-2 border-line bg-surface p-4 text-sm">
      <p>
        {t(ios ? 'installHint.ios' : 'installHint.android')}
        {!ios && deferred && (
          <button
            type="button"
            className="ml-2 font-bold underline"
            onClick={() => {
              void deferred.prompt()
              // The browser honours a given beforeinstallprompt once; a stored
              // dead handle would offer a second "Add" that does nothing.
              clearDeferredInstallPrompt()
              dismiss()
            }}
          >
            {t('installHint.cta')}
          </button>
        )}
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('installHint.dismiss')}
        className="min-h-11 min-w-11 shrink-0 p-1 text-ink-muted hover:text-ink"
      >
        <X className="mx-auto h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
