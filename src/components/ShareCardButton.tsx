import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Share2 } from 'lucide-react'
import type { DaySummary } from '../utils/verdict'
import type { HeatPolicy } from '../data/policyOracle'
import { buildShareCardModel, drawShareCard, SHARE_CARD_SIZE } from '../utils/shareCard'
import { trackShareCard } from '../utils/analytics'
import {
  requiresOnSiteReading,
  REMOTE_UNDERESTIMATE_MIN_C,
  REMOTE_UNDERESTIMATE_MAX_C,
} from '../data/policyOracle'

interface ShareCardButtonProps {
  day: DaySummary
  policy: HeatPolicy
  locationLabel: string
}

async function renderBlob(model: NonNullable<ReturnType<typeof buildShareCardModel>>): Promise<Blob | null> {
  // Ensure the display font is available to the canvas before drawing.
  if (document.fonts?.ready) await document.fonts.ready
  const canvas = document.createElement('canvas')
  canvas.width = SHARE_CARD_SIZE
  canvas.height = SHARE_CARD_SIZE
  drawShareCard(canvas, model)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

export default function ShareCardButton({ day, policy, locationLabel }: ShareCardButtonProps) {
  const { t, i18n } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  function model() {
    if (!day.peak) return null
    return buildShareCardModel(day, {
      locationLabel,
      policyName: t(`policies.${policy.id}`),
      peakFlagLabel: t(`flags.${day.peak.flag}.label`),
      peakCaption: t('share.wbgtPeakLabel'),
      estLabel: t('share.estShort'),
      // The card is the only artifact that leaves the site — the conservative
      // bias + verify-on-site notice always travels with it.
      safetyNote: `${t('verdict.conservativeNotice', {
        min: REMOTE_UNDERESTIMATE_MIN_C,
        max: REMOTE_UNDERESTIMATE_MAX_C,
      })} ${t('verdict.verifyOnsite')}`,
      complianceNote: requiresOnSiteReading(policy)
        ? t(
            policy.remoteEstimatesAllowed === 'device-required'
              ? 'verdict.deviceOnlyNotice'
              : 'verdict.deviceRecommendedNotice',
            { body: policy.source.name.split(' ')[0] },
          )
        : null,
      title: t('share.todayFlags'),
      estimatedNote: t('verdict.estimatedBadge'),
      lang: i18n.language,
    })
  }

  async function download() {
    const m = model()
    if (!m) return
    setBusy(true)
    try {
      const blob = await renderBlob(m)
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wbgt-${day.date}.png`
      a.click()
      URL.revokeObjectURL(url)
      trackShareCard('download')
    } finally {
      setBusy(false)
    }
  }

  async function share() {
    const m = model()
    if (!m) return
    setBusy(true)
    setNote(null)
    try {
      const blob = await renderBlob(m)
      if (!blob) return
      const file = new File([blob], `wbgt-${day.date}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: m.title })
        trackShareCard('share')
      } else {
        // Fall back to a plain download when the Web Share API is unavailable.
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
        setNote(t('share.shareFailed'))
        trackShareCard('download')
      }
    } catch {
      // User canceled the share sheet — not an error.
    } finally {
      setBusy(false)
    }
  }

  if (!day.peak) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className="inline-flex items-center gap-2 bg-ink px-4 py-2.5 font-bold uppercase tracking-wide text-bg hover:opacity-90 disabled:opacity-50"
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        {t('verdict.shareButton')}
      </button>
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="inline-flex items-center gap-2 border-2 border-ink px-4 py-2 font-bold uppercase tracking-wide hover:bg-tint-black disabled:opacity-50"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {t('share.download')}
      </button>
      {note && <span className="text-sm text-ink-muted">{note}</span>}
    </div>
  )
}
