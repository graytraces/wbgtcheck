import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { LocateFixed, Search, X } from 'lucide-react'

interface LocationSetupProps {
  onZip: (zip: string) => void
  onGeolocate: () => void
  busy: boolean
  errorKey: string | null
  compact?: boolean
  /**
   * Closes the editor without changing anything. Its absence was the bug:
   * `changingLocation` cleared only on a SUCCESSFUL lookup, so a reader who
   * mis-tapped the dotted-underline link beside the city name — which sits
   * immediately after it, at the top of the verdict — had opened a panel with
   * no way out but entering a ZIP they did not want.
   */
  onCancel?: () => void
}

export default function LocationSetup({
  onZip,
  onGeolocate,
  busy,
  errorKey,
  compact,
  onCancel,
}: LocationSetupProps) {
  const { t } = useTranslation()
  const [zip, setZip] = useState('')

  // Escape closes it, which is what every reader tries first. On the document
  // rather than the panel: focus starts in the ZIP field but does not stay
  // there, and a keydown handler on the wrapper only hears its own subtree.
  useEffect(() => {
    if (!onCancel) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  function submit(e: FormEvent) {
    e.preventDefault()
    onZip(zip)
  }

  return (
    <div className={compact ? '' : 'border-2 border-ink bg-surface p-5 sm:p-8'}>
      {/* The compact variant dropped this heading, which left the panel
          unlabeled: an unexplained ZIP field and a location button appearing
          under the verdict, with nothing saying what they are for. */}
      <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
        <h2
          className={
            compact
              ? 'display-num text-xl uppercase'
              : 'display-num text-2xl uppercase sm:text-3xl'
          }
        >
          {t('location.heading')}
        </h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label={t('location.cancelEdit')}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center text-ink-muted hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <button
          type="button"
          onClick={onGeolocate}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 bg-ink px-5 py-3 text-base font-bold uppercase tracking-wide text-bg hover:opacity-90 disabled:opacity-50"
        >
          <LocateFixed className="h-5 w-5" aria-hidden="true" />
          {t('location.geoButton')}
        </button>
        <form onSubmit={submit} className="flex flex-1 gap-0">
          <label className="sr-only" htmlFor="zip-input">
            {t('location.zipPlaceholder')}
          </label>
          <input
            id="zip-input"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            placeholder={t('location.zipPlaceholder')}
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))}
            className="w-full min-w-0 border-2 border-ink bg-bg px-4 py-3 text-lg font-semibold tabular-nums placeholder:text-ink-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          />
          <button
            type="submit"
            disabled={busy || zip.length !== 5}
            className="inline-flex items-center gap-2 border-2 border-l-0 border-ink bg-surface px-4 py-3 font-bold uppercase hover:bg-tint-black disabled:opacity-50"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">{t('location.zipButton')}</span>
          </button>
        </form>
      </div>
      {errorKey && <p className="mt-2 text-sm font-semibold text-flag-red">{t(errorKey)}</p>}
    </div>
  )
}
