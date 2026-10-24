'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Select, type SelectOption } from '@/components/ui/Select'
import type { CatalogSort } from '@/features/catalog/repository/product-repository'

type SortSelectProps = {
  readonly value: CatalogSort
  // Beside the filter toggle on a phone: no «Сортування:» prefix, the toggle's
  // height. The trigger keeps the label for screen readers.
  readonly isCompact?: boolean
  readonly className?: string
}

const SORT_KEYS = [
  { value: 'recommended', key: 'recommended' },
  { value: 'price-asc', key: 'priceAsc' },
  { value: 'price-desc', key: 'priceDesc' },
] as const

export function SortSelect({ value, isCompact = false, className }: SortSelectProps) {
  const t = useTranslations('filters')
  const options: readonly SelectOption[] = SORT_KEYS.map((entry) => ({
    value: entry.value,
    label: t(entry.key),
  }))
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', next)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Select
      value={value}
      onValueChange={handleChange}
      options={options}
      label={t('sortLabel')}
      prefix={isCompact ? undefined : t('sortLabel')}
      size={isCompact ? 'md' : 'sm'}
      className={className}
    />
  )
}
