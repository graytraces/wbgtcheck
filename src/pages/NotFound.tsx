import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFound() {
  const { t, i18n } = useTranslation()
  return (
    <div className="mx-auto max-w-xl space-y-4 py-12 text-center">
      <h1 className="display-num text-5xl uppercase">404</h1>
      <p className="text-lg font-semibold">{t('notFound.title')}</p>
      <p className="text-ink-muted">{t('notFound.body')}</p>
      <Link
        to={`/${i18n.language}`}
        className="inline-block bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('notFound.cta')}
      </Link>
    </div>
  )
}
