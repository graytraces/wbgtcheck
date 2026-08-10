import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CircleCheck, MonitorX, CircleHelp } from 'lucide-react'
import SEO from '../components/SEO'
import { STATE_DIRECTORY, type MeasurementClass } from '../data/stateDirectory'
import { STATE_GUIDES, AIR_GUIDES, TOPIC_GUIDES, GUIDE_SLUG_BY_ABBR } from '../data/guideRegistry'
import { UIL_EFFECTIVE_DATE } from '../data/policyOracle'
import { cn } from '../lib/utils'

/** Slug ↔ label for every state that has its own guide page. */
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


      {/* The hub list IS this page's job, so it goes above the table rather
          than 86% of the way down it. */}
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
        {/* The two cross-state guides. Neither has a nav entry — the scroller
            is full at five items — so this hub is their only route in. */}
        <h2 className="mb-2 mt-4 font-bold uppercase tracking-wide">
          {t('states.topicGuidesHeading')}
        </h2>
        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {TOPIC_GUIDES.map(({ slug, labelKey }) => (
            <li key={slug}>
              <Link to={`/${lang}/${slug}`} className="font-semibold underline">
                {t(labelKey)}
              </Link>
            </li>
          ))}
        </ul>
        <h2 className="mb-2 mt-4 font-bold uppercase tracking-wide">
          {t('states.airGuidesHeading')}
        </h2>
        <p className="mb-1 text-sm text-ink-muted">{t('states.airGuidesIntro')}</p>
        <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {AIR_GUIDES.map(({ slug, labelKey }) => (
            <li key={slug}>
              <Link to={`/${lang}/${slug}`} className="font-semibold underline">
                {t(labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* The legend used to define the Measurement values only, leaving the
          reader to guess at "Conditional / preferred" — the value carrying the
          most nuance in the table. Both judgement columns are named now. */}
      <section className="border-2 border-line bg-surface p-4 text-sm">
        <h2 className="mb-2 font-bold uppercase tracking-wide">{t('states.legendHeading')}</h2>
        <h3 className="mb-1 font-bold">{t('states.legendMeasurementHeading')}</h3>
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
        <h3 className="mb-1 mt-3 font-bold">{t('states.legendMandateHeading')}</h3>
        <ul className="space-y-1">
          <li>{t('states.legendMandateRequired')}</li>
          <li>{t('states.legendMandateConditional')}</li>
          <li>{t('states.legendMandateHeatIndex')}</li>
        </ul>
      </section>

      {/* The one table allowed to scroll internally on phones: five columns
          of prose cannot fit 320px legibly. scroll-x-fade paints edge
          shadows so the clipping is visible (and marks the sweep exception).
          role+tabIndex make the scroll container focusable, which is the only
          way a keyboard user can reach the columns that start off-screen. */}
      <h2 className="sr-only" id="states-table-heading">
        {t('states.tableLabel')}
      </h2>
      <section
        className="scroll-x-fade"
        role="region"
        aria-labelledby="states-table-heading"
        tabIndex={0}
      >
        {/* Arrow keys are the route in for a keyboard user and nonsense to a
            touch one, who was being told to press keys they do not have. */}
        <p className="sr-only hidden [@media(pointer:fine)]:block">
          {t('states.tableScrollHint')}
        </p>
        <table
          className="w-full min-w-[26rem] border-collapse text-sm sm:min-w-[44rem]"
          aria-labelledby="states-table-heading"
        >
          <thead>
            <tr className="border-b-2 border-ink text-left">
              <th className="py-2 pr-3 font-bold uppercase tracking-wide">{t('states.colState')}</th>
              {/* Measurement sits second on purpose: it is the column this
                  page is titled after, and at 390px it previously started at
                  x=363 — past the edge, behind a horizontal scroll. */}
              <th className="py-2 pr-3 font-bold uppercase tracking-wide">{t('states.colMeasurement')}</th>
              {/* Mandate ahead of Governing body: the body column is 202px of
                  the least decision-relevant text on the page, and it pushed
                  the mandate to x=413 at 390px — past the edge. */}
              <th className="py-2 pr-3 font-bold uppercase tracking-wide">{t('states.colMandate')}</th>
              <th className="py-2 pr-3 font-bold uppercase tracking-wide">{t('states.colBody')}</th>
              {/* Hidden on phones like the cells under it. Left visible, it
                  held open a 50px column with a heading and nothing beneath
                  it — the notes are in their own row down there. */}
              <th className="hidden py-2 font-bold uppercase tracking-wide sm:table-cell">
                {t('states.colNote')}
              </th>
            </tr>
          </thead>
          <tbody>
            {STATE_DIRECTORY.map((row) => {
              const style = MEASUREMENT_STYLE[row.measurement]
              const Icon = style.icon
              const note = (
                <>
                  {t(`states.notes.${row.noteKey}`, { effectiveDate: UIL_EFFECTIVE_DATE })}{' '}
                  {GUIDE_SLUG_BY_ABBR[row.abbr] && (
                    <Link
                      to={`/${lang}/${GUIDE_SLUG_BY_ABBR[row.abbr]}`}
                      className="font-semibold underline"
                    >
                      {t('states.rowGuideLink')}
                    </Link>
                  )}
                  <span className="mt-0.5 block text-xs">
                    {row.verified === 'primary' ? t('states.verifiedBadge') : t('states.researchBadge')}
                  </span>
                </>
              )
              const mainRow = (
                <tr key={row.abbr} className="border-b border-line align-top sm:border-b">
                  {/* Row header, not a plain cell: in a five-column prose
                      table a screen reader otherwise reads the mandate and the
                      note without ever saying which state they belong to. The
                      id is what the phone-only note row below points at. */}
                  <th
                    scope="row"
                    id={`state-row-${row.abbr}`}
                    className="display-num py-2 pr-3 text-left text-xl font-normal"
                  >
                    {row.abbr}
                  </th>
                  <td className="py-2 pr-3">
                    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold uppercase', style.cls)}>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {t(`states.measurement.${row.measurement}`)}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{t(`states.mandate.${row.mandate}`)}</td>
                  <td className="py-2 pr-3">{row.body}</td>
                  {/* Hidden on phones and repeated full-width below: this
                      column is prose, it starts off-screen, and it set the
                      height of every row — 375px for Kentucky, of which the
                      visible columns used a fraction. */}
                  <td className="hidden py-2 text-ink-muted sm:table-cell">{note}</td>
                </tr>
              )
              return [
                mainRow,
                <tr key={`${row.abbr}-note`} className="border-b border-line sm:hidden">
                  {/* Moving the note to its own row stopped the PAGE from
                      scrolling sideways and did nothing about the note, which
                      still laid out inside the table's own overflow container:
                      measured at 390px, region 358 wide against a 478px cell,
                      so ~25% of every note sat off-screen — "covering practice
                      AND comp…", "outdoor activity st…". The Notes column is
                      the reason this page exists.

                      So the width comes from the SCROLL CONTAINER, not from
                      the table's columns: one page column wide (the layout is
                      px-4 either side), pinned to the container's left edge so
                      it stays put when the table is scrolled across.

                      `headers` rather than a second `<th scope="row">` in this
                      row: without an association a screen reader in table mode
                      reads a paragraph of policy with nothing saying which
                      state it belongs to, but an sr-only th is
                      position:absolute, and Chromium still assigns it the
                      first column — measured, it pushed this cell 58px in and
                      clipped that much off every note again. Pointing at the
                      row header that already exists costs no width. */}
                  <td colSpan={4} headers={`state-row-${row.abbr}`} className="p-0">
                    {/* data-phone-note is the handle the browser sweep needs:
                        this is a geometry claim, and jsdom has no layout to
                        make it against. */}
                    <div
                      data-phone-note
                      className="sticky left-0 w-[calc(100vw-2rem)] pb-2 text-sm text-ink-muted"
                    >
                      {note}
                    </div>
                  </td>
                </tr>,
              ]
            })}
          </tbody>
        </table>
      </section>

      <p className="max-w-3xl text-sm text-ink-muted">{t('states.caveat')}</p>
      <p className="max-w-3xl text-xs text-ink-muted">{t('common.footer.affiliation')}</p>

    </article>
  )
}
