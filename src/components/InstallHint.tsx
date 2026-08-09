import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

const DISMISS_KEY = 'wbgt-a2hs-dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

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

/**
 * One-time add-to-home-screen hint. iOS gets the Share-menu walkthrough
 * (no install API exists there); other mobile browsers show only when the
 * browser itself offers installability (beforeinstallprompt). Desktop and
 * already-installed contexts never see it, and dismissing is permanent
 * (localStorage). Deliberately no reminders, no re-prompts.
 */
export default function InstallHint() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const ios = isIos()

  useEffect(() => {
    if (isStandalone() || isDismissed()) return
    if (ios) {
      setVisible(true)
      return
    }
    // Non-iOS: only where the browser signals installability, and only on
    // touch devices — a desktop install hint is noise.
    if (!(window.matchMedia?.('(pointer: coarse)')?.matches ?? false)) return
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
