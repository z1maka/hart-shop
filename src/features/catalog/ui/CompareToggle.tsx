'use client'

import { useTranslations } from 'next-intl'
import { trackEvent } from '@/features/analytics'
import { useCompare } from '@/features/catalog/ui/use-compare'
import { cn } from '@/lib/utils'

type CompareToggleProps = {
  readonly slug: string
}

export function CompareToggle({ slug }: CompareToggleProps) {
  const t = useTranslations('product')
  const { slugs, isFull, toggle } = useCompare()
  const isSelected = slugs.includes(slug)
  const isDisabled = !isSelected && isFull

  return (
    <button
      type="button"
      onClick={() => {
        toggle(slug)
        trackEvent({ name: 'compare_toggle', productSlug: slug, isAdded: !isSelected })
      }}
      disabled={isDisabled}
      className={cn(
        'w-full py-1.5 text-[12px] font-semibold transition-colors',
        isSelected ? 'text-accent-hover' : 'text-muted hover:text-accent-hover',
        isDisabled && 'cursor-not-allowed text-faint hover:text-faint',
      )}
    >
      {isSelected ? t('comparing') : t('compare')}
    </button>
  )
}
