import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CircleCheck, MonitorX, CircleHelp } from 'lucide-react'
import SEO from '../components/SEO'
import { STATE_DIRECTORY, type MeasurementClass } from '../data/stateDirectory'
import { UIL_EFFECTIVE_DATE } from '../data/policyOracle'
import { cn } from '../lib/utils'

/** Slug ↔ label for every state that has its own guide page. */
const STATE_GUIDES = [
  { slug: 'texas', labelKey: 'states.texasLink' },
  { slug: 'georgia', labelKey: 'states.georgiaLink' },
  { slug: 'south-carolina', labelKey: 'states.southCarolinaLink' },
  { slug: 'tennessee', labelKey: 'states.tennesseeLink' },
  { slug: 'iowa', labelKey: 'states.iowaLink' },
  { slug: 'north-carolina', labelKey: 'states.northCarolinaLink' },
  { slug: 'new-york', labelKey: 'states.newYorkLink' },
  { slug: 'virginia', labelKey: 'states.virginiaLink' },
] as const

/** State guides that exist on this site — rendered as a per-row link. */
const GUIDE_SLUGS: Record<string, string> = {
  TX: 'texas',
  GA: 'georgia',
  SC: 'south-carolina',
  TN: 'tennessee',
  IA: 'iowa',
  NC: 'north-carolina',
  NY: 'new-york',
  VA: 'virginia',
  MA: 'massachusetts',
}

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

      {/* The one table allowed to scroll internally on phones: five columns
          of prose cannot fit 320px legibly. scroll-x-fade paints edge
          shadows so the clipping is visible (and marks the sweep exception). */}
      <section className="scroll-x-fade">
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
                  {/* Row header, not a plain cell: in a five-column prose
                      table a screen reader otherwise reads the mandate and the
                      note without ever saying which state they belong to. */}
                  <th scope="row" className="display-num py-2 pr-3 text-left text-xl font-normal">
                    {row.abbr}
                  </th>
                  <td className="py-2 pr-3">{row.body}</td>
                  <td className="py-2 pr-3">{t(`states.mandate.${row.mandate}`)}</td>
                  <td className="py-2 pr-3">
                    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold uppercase', style.cls)}>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {t(`states.measurement.${row.measurement}`)}
                    </span>
                  </td>
                  <td className="py-2 text-ink-muted">
                    {t(`states.notes.${row.noteKey}`, { effectiveDate: UIL_EFFECTIVE_DATE })}{' '}
                    {GUIDE_SLUGS[row.abbr] && (
                      <Link
                        to={`/${lang}/${GUIDE_SLUGS[row.abbr]}`}
                        className="font-semibold underline"
                      >
                        {t('states.rowGuideLink')}
                      </Link>
                    )}
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
      <p className="max-w-3xl text-xs text-ink-muted">{t('common.footer.affiliation')}</p>

      <section>
        <h2 className="mb-2 font-bold uppercase tracking-wide">{t('states.guidesHeading')}</h2>
        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {STATE_GUIDES.map(({ slug, labelKey }) => (
            <li key={slug}>
              <Link to={`/${lang}/${slug}`} className="font-semibold underline">
                {t(labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}
