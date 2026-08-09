import { useEffect, useState } from 'react'
import { useRouteError } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { isStaleChunkError, reloadOnceForStaleAssets } from '../utils/staleRecovery'

/**
 * Replaces react-router's default error page. Stale-chunk failures (deploy
 * removed the hashed file this tab's HTML points at) self-heal with one
 * guarded reload; anything else — or a reload that already ran and did not
 * help — gets a visible retry UI instead of a blank page.
 */
export default function RouteErrorFallback() {
  const error = useRouteError()
  const { t } = useTranslation()
  const [reloading, setReloading] = useState(false)

  useEffect(() => {
    if (isStaleChunkError(error) && reloadOnceForStaleAssets()) setReloading(true)
  }, [error])

  if (reloading) return null

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="display-num text-2xl uppercase">{t('common.error')}</h1>
      <p className="text-ink-muted">{t('common.errorReloadHint')}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('common.retry')}
      </button>
    </div>
  )
}
