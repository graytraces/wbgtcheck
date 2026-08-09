import { useTranslation } from 'react-i18next'
import { feedbackMailto } from '../utils/feedback'

/**
 * One-line correction invitation for the guide pages, next to the source
 * block: associations revise rules, reports welcome. `topic` lands in the
 * mail subject ("wbgtcheck correction: texas") so reports arrive routable.
 */
export default function CorrectionNote({ topic }: { topic: string }) {
  const { t } = useTranslation()
  return (
    <p className="mt-2 text-xs text-ink-muted">
      {t('common.correctionNote')}{' '}
      <a href={feedbackMailto(`wbgtcheck correction: ${topic}`)} className="underline hover:text-ink">
        {t('common.correctionCta')}
      </a>
    </p>
  )
}
