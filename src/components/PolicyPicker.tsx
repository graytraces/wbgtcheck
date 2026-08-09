import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { PolicyId } from '../data/policyOracle'
import { POLICIES, UIL_REGION_MAP_URL } from '../data/policyOracle'
import { pageSEO, statePageKeyByPolicy } from '../seo'

interface PolicyPickerProps {
  value: PolicyId
  onChange: (id: PolicyId) => void
}

export default function PolicyPicker({ value, onChange }: PolicyPickerProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const isUil = value.startsWith('uil')
  // The guide for the policy in force. Every state in the picker except the
  // generic NATA fallback has one, and before this the tool linked the same
  // four pages no matter what was selected — choosing SCHSL surfaced its PDF
  // but never /south-carolina.
  const guideKey = statePageKeyByPolicy[value]
  const guideSlug = guideKey ? pageSEO[guideKey].path : null

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor="policy-picker"
        className="text-xs font-bold uppercase tracking-wide text-ink-muted"
      >
        {t('policies.pickerLabel')}
      </label>
      <select
        id="policy-picker"
        value={value}
        onChange={(e) => onChange(e.target.value as PolicyId)}
        className="h-11 border-2 border-ink bg-surface px-3 font-semibold"
      >
        {(Object.keys(POLICIES) as PolicyId[]).map((id) => (
          <option key={id} value={id}>
            {t(`policies.${id}`)}
          </option>
        ))}
      </select>
      <p className="text-xs text-ink-muted">
        {t('policies.pickerHelp')}{' '}
        {/* The Class 2 vs Class 3 note is a Texas fact; it used to render
            under GHSA, SCHSL, TSSAA, Iowa and NATA alike. */}
        {isUil && (
          <>
            {t('policies.pickerHelpTexas')}{' '}
            <a
              href={UIL_REGION_MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {t('policies.uilMapLink')}
            </a>
          </>
        )}
      </p>
      {guideSlug && (
        <p className="text-sm">
          <Link to={`/${lang}/${guideSlug}`} className="font-semibold underline">
            {t('policies.readGuide', { policy: t(`policies.${value}`) })}
          </Link>
        </p>
      )}
    </div>
  )
}
