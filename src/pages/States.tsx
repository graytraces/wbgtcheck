import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CircleCheck, MonitorX, CircleHelp } from 'lucide-react'
import SEO from '../components/SEO'
import { STATE_DIRECTORY, type MeasurementClass } from '../data/stateDirectory'
import { UIL_EFFECTIVE_DATE } from '../data/policyOracle'
import { cn } from '../lib/utils'

const MEASUREMENT_STYLE: Record<MeasurementClass, { icon: typeof CircleCheck; cls: string }> = {
  'apps-allowed': { icon: CircleCheck, cls: 'bg-tint-green text-ink' },
  'device-required': { icon: MonitorX, cls: 'bg-tint-red text-ink' },
  unverified: { icon: CircleHelp, cls: 'bg-tint-black text-ink' },
}

export default function States() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  return (
    <article className="mx-auto max-w-4xl space-y-8">
      <SEO pageKey="states" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">{t('states.pageTitle')}</h1>
        <p className="mt-3 max-w-3xl text-lg">{t('states.intro')}</p>
      </header>

      <section className="border-2 border-line bg-surface p-4 text-sm">
        <h2 className="mb-2 font-bold uppercase tracking-wide">{t('states.legendHeading')}</h2>
        <ul className="space-y-1">
          <li className="flex items-start gap-2">
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t('states.legendApps')}
          </li>
          <li className="flex items-start gap-2">
            <MonitorX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t('states.legendDevice')}
          </li>
          <li className="flex items-start gap-2">
            <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t('states.legendUnverified')}
          </li>
        </ul>
      </section>

      <section className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="py-2 pr-3 font-bold uppercase tracking-wide">{t('states.colState')}</th>
              <th className="py-2 pr-3 font-bold uppercase tracking-wide">{t('states.colBody')}</th>
              <th className="py-2 pr-3 font-bold uppercase tracking-wide">{t('states.colMandate')}</th>
              <th className="py-2 pr-3 font-bold uppercase tracking-wide">{t('states.colMeasurement')}</th>
              <th className="py-2 font-bold uppercase tracking-wide">{t('states.colNote')}</th>
            </tr>
          </thead>
          <tbody>
            {STATE_DIRECTORY.map((row) => {
              const style = MEASUREMENT_STYLE[row.measurement]
              const Icon = style.icon
              return (
                <tr key={row.abbr} className="border-b border-line align-top">
                  <td className="display-num py-2 pr-3 text-xl">{row.abbr}</td>
                  <td className="py-2 pr-3">{row.body}</td>
                  <td className="py-2 pr-3">{t(`states.mandate.${row.mandate}`)}</td>
                  <td className="py-2 pr-3">
                    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold uppercase', style.cls)}>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {t(`states.measurement.${row.measurement}`)}
                    </span>
                  </td>
                  <td className="py-2 text-ink-muted">
                    {t(`states.notes.${row.noteKey}`, { effectiveDate: UIL_EFFECTIVE_DATE })}
                    <span className="mt-0.5 block text-xs">
                      {row.verified === 'primary' ? t('states.verifiedBadge') : t('states.researchBadge')}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <p className="max-w-3xl text-sm text-ink-muted">{t('states.caveat')}</p>

      <p className="text-sm">
        <Link to={`/${lang}/texas`} className="mr-4 font-semibold underline">
          {t('states.texasLink')}
        </Link>
        <Link to={`/${lang}/georgia`} className="font-semibold underline">
          {t('states.georgiaLink')}
        </Link>
      </p>
    </article>
  )
}
