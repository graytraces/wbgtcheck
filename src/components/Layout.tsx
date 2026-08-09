import { useEffect } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Moon, Sun, Flag } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import { supportedLanguages, type SupportedLanguage } from '../i18n'
import { feedbackMailto } from '../utils/feedback'

export default function Layout() {
  const { lang } = useParams()
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { theme, toggle } = useTheme()

  useEffect(() => {
    if (lang && lang in supportedLanguages && i18n.language !== lang) {
      i18n.changeLanguage(lang)
    }
  }, [lang, i18n])

  const currentLang = (lang && lang in supportedLanguages ? lang : 'en') as SupportedLanguage
  const otherLang: SupportedLanguage = currentLang === 'en' ? 'es' : 'en'
  const pathAfterLang = location.pathname.replace(new RegExp(`^/${currentLang}`), '') || ''

  // "All states" is the hub for the six guides with no nav entry of their own
  // (SC, TN, IA, NC, NY, VA), so it comes second. At 390px the nav scroller
  // shows about three items and this sat fifth, at x=572 — off-screen, with
  // nothing to suggest it was there.
  const nav = [
    { to: `/${currentLang}`, label: t('common.nav.home') },
    { to: `/${currentLang}/states`, label: t('common.nav.states') },
    { to: `/${currentLang}/texas`, label: t('common.nav.texas') },
    { to: `/${currentLang}/georgia`, label: t('common.nav.georgia') },
    { to: `/${currentLang}/wbgt-vs-heat-index`, label: t('common.nav.wbgtVsHeatIndex') },
    { to: `/${currentLang}/washington-air-quality`, label: t('common.nav.washingtonAir') },
    { to: `/${currentLang}/oregon-air-quality`, label: t('common.nav.oregonAir') },
    { to: `/${currentLang}/california-air-quality`, label: t('common.nav.californiaAir') },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex items-center justify-between py-3">
            <Link to={`/${currentLang}`} className="flex items-center gap-2" aria-label={t('common.siteName')}>
              <span className="flex h-8 w-8 items-center justify-center bg-flag-orange text-on-flag-orange" aria-hidden="true">
                <Flag className="h-5 w-5" strokeWidth={2.5} />
              </span>
              <span className="display-num text-2xl tracking-tight uppercase">WBGT Check</span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                to={`/${otherLang}${pathAfterLang}`}
                className="flex h-11 min-w-11 items-center justify-center px-2 text-sm font-semibold text-ink-muted hover:text-ink"
                aria-label={t('common.languageLabel')}
                lang={otherLang}
              >
                {otherLang.toUpperCase()}
              </Link>
              <button
                type="button"
                onClick={toggle}
                className="flex h-11 w-11 items-center justify-center text-ink-muted hover:text-ink"
                aria-label={t('common.themeToggle')}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 text-sm font-semibold" aria-label="Main">
            {nav.map((item) => {
              const active =
                item.to === `/${currentLang}`
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`inline-flex min-h-11 items-center whitespace-nowrap rounded px-3 ${
                    active ? 'bg-ink text-bg' : 'text-ink-muted hover:bg-tint-black hover:text-ink'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-surface text-sm text-ink-muted">
        <div className="mx-auto max-w-5xl space-y-3 px-4 py-6">
          <p className="max-w-3xl">{t('common.footer.safetySummary')}</p>
          <p className="max-w-3xl">{t('common.footer.affiliation')}</p>
          <p>{t('common.footer.dataCredit')}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <a href={feedbackMailto('wbgtcheck feedback')} className="underline hover:text-ink">
              {t('common.footer.feedback')}
            </a>
            <Link to={`/${currentLang}/disclaimer`} className="underline hover:text-ink">
              {t('common.footer.disclaimer')}
            </Link>
            <Link to={`/${currentLang}/privacy`} className="underline hover:text-ink">
              {t('common.footer.privacy')}
            </Link>
            <span>{t('common.footer.rights', { year: new Date().getFullYear() })}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
