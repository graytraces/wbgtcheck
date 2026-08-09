import { useTranslation } from 'react-i18next'
import { feedbackMailto } from '../utils/feedback'

/**
 * One-line correction invitation for the guide pages, next to the source
 * block: associations revise rules, reports welcome. `topic` lands in the
 * mail subject ("wbgtcheck correction: texas") so reports arrive routable.
 */
export default function CorrectionNote({ topic }: { topic: string }) {
  const { t, i18n } = useTranslation()
  return (
    <>
      {/* Quotations stay in the association's own English on every locale —
          a translated sentence inside quotation marks attributes words the
          association never wrote. Saying so once per guide page is what makes
          the untranslated blocks read as deliberate. Redundant in English. */}
      {i18n.language !== 'en' && (
        <p className="mt-2 text-xs text-ink-muted">{t('common.quotesInEnglish')}</p>
      )}
      <p className="mt-2 text-xs text-ink-muted">
        {t('common.correctionNote')}{' '}
        <a href={feedbackMailto(`wbgtcheck correction: ${topic}`)} className="underline hover:text-ink">
          {t('common.correctionCta')}
        </a>
      </p>
    </>
  )
}
