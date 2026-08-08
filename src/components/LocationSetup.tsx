import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { LocateFixed, Search } from 'lucide-react'

interface LocationSetupProps {
  onZip: (zip: string) => void
  onGeolocate: () => void
  busy: boolean
  errorKey: string | null
  compact?: boolean
}

export default function LocationSetup({ onZip, onGeolocate, busy, errorKey, compact }: LocationSetupProps) {
  const { t } = useTranslation()
  const [zip, setZip] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    onZip(zip)
  }

  return (
    <div className={compact ? '' : 'border-2 border-ink bg-surface p-5 sm:p-8'}>
      {!compact && (
        <h2 className="display-num mb-4 text-2xl uppercase sm:text-3xl">{t('location.heading')}</h2>
      )}
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
            className="w-full min-w-0 border-2 border-ink bg-bg px-4 py-3 text-lg font-semibold tabular-nums placeholder:text-ink-muted focus:outline-none"
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
