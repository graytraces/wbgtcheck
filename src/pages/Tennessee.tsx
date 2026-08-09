import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SEO from '../components/SEO'
import PolicyBandsTable from '../components/PolicyBandsTable'
import {
  TSSAA,
  TSSAA_APP_QUOTE,
  TSSAA_COLD_TUB_QUOTE,
  TSSAA_EITHER_QUOTE,
  TSSAA_HEAT_INDEX_BANDS,
  TSSAA_REVISION,
  TSSAA_WBGT_FIRST_CHOICE_QUOTE,
} from '../data/policyOracle'

export default function Tennessee() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SEO pageKey="tennessee" />

      <header>
        <h1 className="display-num text-3xl uppercase sm:text-4xl">{t('tennessee.pageTitle')}</h1>
        <p className="mt-3 text-lg">{t('tennessee.intro')}</p>
      </header>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('tennessee.choiceHeading')}</h2>
        <p>
          {t('tennessee.choiceBody', {
            either: TSSAA_EITHER_QUOTE,
            firstChoice: TSSAA_WBGT_FIRST_CHOICE_QUOTE,
          })}
        </p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('tennessee.tableHeading')}</h2>
        <PolicyBandsTable policy={TSSAA} showSource={false} />
        <p className="mt-3 text-sm text-ink-muted">{t('tennessee.lowBandNote')}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('tennessee.coldTubHeading')}</h2>
        <p>{t('tennessee.coldTubBody', { quote: TSSAA_COLD_TUB_QUOTE })}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('tennessee.hiTableHeading')}</h2>
        <p className="mb-3 text-sm">{t('tennessee.hiTableNote')}</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="py-2 pr-3 font-bold uppercase tracking-wide">
                  {t('tennessee.hiColHeatIndex')}
                </th>
                <th className="py-2 font-bold uppercase tracking-wide">
                  {t('tennessee.hiColWbgt')}
                </th>
              </tr>
            </thead>
            <tbody>
              {TSSAA_HEAT_INDEX_BANDS.map((band) => (
                <tr key={band.sourceLabel} className="border-b border-line align-top">
                  <td className="display-num whitespace-nowrap py-2 pr-3 text-base sm:text-lg">{band.sourceLabel}</td>
                  <td className="display-num whitespace-nowrap py-2 text-base sm:text-lg">{band.pairsWithWbgt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('tennessee.appsHeading')}</h2>
        <p>{t('tennessee.appsBody', { apps: TSSAA_APP_QUOTE })}</p>
      </section>

      <section>
        <h2 className="display-num mb-2 text-2xl uppercase">{t('tennessee.scopeHeading')}</h2>
        <p>{t('tennessee.scopeBody')}</p>
      </section>

      <section className="text-sm text-ink-muted">
        <h2 className="font-bold uppercase tracking-wide">{t('tennessee.sourceHeading')}</h2>
        <p className="mt-1">
          {t('tennessee.sourceBody', {
            revision: TSSAA_REVISION,
            verifiedOn: TSSAA.source.verifiedOn,
          })}{' '}
          <a href={TSSAA.source.url} target="_blank" rel="noopener noreferrer" className="underline">
            {TSSAA.source.name}
          </a>
        </p>
        <p className="mt-2 text-xs">{t('common.footer.affiliation')}</p>
      </section>

      <Link
        to={`/${lang}`}
        className="inline-block bg-ink px-5 py-3 font-bold uppercase tracking-wide text-bg hover:opacity-90"
      >
        {t('tennessee.ctaButton')}
      </Link>
    </article>
  )
}
