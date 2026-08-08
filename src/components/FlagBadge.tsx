import { useTranslation } from 'react-i18next'
import type { FlagColor } from '../data/policyOracle'
import { FLAG_ICON, FLAG_SOLID } from '../utils/flagStyles'
import { cn } from '../lib/utils'

interface FlagBadgeProps {
  flag: FlagColor
  size?: 'sm' | 'lg'
  className?: string
}

/** Color + icon + text label, always together (color-vision safety). */
export default function FlagBadge({ flag, size = 'sm', className }: FlagBadgeProps) {
  const { t } = useTranslation()
  const Icon = FLAG_ICON[flag]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-bold uppercase tracking-wide',
        FLAG_SOLID[flag],
        size === 'lg' ? 'px-3 py-1.5 text-base' : 'px-2 py-0.5 text-xs',
        className,
      )}
    >
      <Icon className={size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5'} aria-hidden="true" />
      {t(`flags.${flag}.label`)}
    </span>
  )
}
