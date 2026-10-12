'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Select, type SelectOption } from '@/components/ui/Select'
import type { CatalogSort } from '@/features/catalog/repository/product-repository'

type SortSelectProps = {
  readonly value: CatalogSort
}

const SORT_KEYS = [
  { value: 'recommended', key: 'recommended' },
  { value: 'price-asc', key: 'priceAsc' },
  { value: 'price-desc', key: 'priceDesc' },
] as const

export function SortSelect({ value }: SortSelectProps) {
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
      prefix={t('sortLabel')}
      size="sm"
    />
  )
}
