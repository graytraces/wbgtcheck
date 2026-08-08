import { useTranslation } from 'react-i18next'
import type { PolicyId } from '../data/policyOracle'
import { POLICIES } from '../data/policyOracle'

const UIL_MAP_URL = 'https://www.uiltexas.org/files/health/WBGTMap.jpg'

interface PolicyPickerProps {
  value: PolicyId
  onChange: (id: PolicyId) => void
}

export default function PolicyPicker({ value, onChange }: PolicyPickerProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="policy-picker" className="text-xs font-bold uppercase tracking-wide text-ink-muted">
        {t('policies.pickerLabel')}
      </label>
      <select
        id="policy-picker"
        value={value}
        onChange={(e) => onChange(e.target.value as PolicyId)}
        className="border-2 border-ink bg-surface px-3 py-2 font-semibold"
      >
        {(Object.keys(POLICIES) as PolicyId[]).map((id) => (
          <option key={id} value={id}>
            {t(`policies.${id}`)}
          </option>
        ))}
      </select>
      <p className="text-xs text-ink-muted">
        {t('policies.pickerHelp')}{' '}
        {value.startsWith('uil') && (
          <a href={UIL_MAP_URL} target="_blank" rel="noopener noreferrer" className="underline">
            {t('policies.uilMapLink')}
          </a>
        )}
      </p>
    </div>
  )
}
