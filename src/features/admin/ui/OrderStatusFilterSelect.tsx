'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import type { OrderStatusFilter } from '@/features/orders/model/status-filter'
import { cn } from '@/lib/utils'

export type StatusFilterOption = {
  readonly value: OrderStatusFilter
  readonly label: string
  readonly count: number
}

type OrderStatusFilterSelectProps = {
  readonly basePath: string
  readonly options: readonly StatusFilterOption[]
  readonly current: OrderStatusFilter | null
  // The list's other filters, kept when the status changes: the shelf and the
  // search. The page is not — a narrower list starts from its first page.
  readonly keptParams: Readonly<Record<string, string>>
}

const ALL_STATUSES = ''

// The «Статус» column header as a filter: each option is a chip the rows can
// show, with how many orders of the open tab carry it.
export function OrderStatusFilterSelect({
  basePath,
  options,
  current,
  keptParams,
}: OrderStatusFilterSelectProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function select(value: string) {
    const params = new URLSearchParams({ ...keptParams, ...(value ? { status: value } : {}) })
    const query = params.toString()
    startTransition(() => router.push(query ? `${basePath}?${query}` : basePath))
  }

  return (
    <select
      value={current ?? ALL_STATUSES}
      onChange={(event) => select(event.target.value)}
      disabled={isPending}
      aria-label="Фильтр по статусу"
      className={cn(
        '-my-1 max-w-[190px] cursor-pointer rounded-control border bg-surface py-1 pr-1 pl-2 text-[12px] font-semibold',
        current ? 'border-strong text-ink' : 'border-subtle text-muted',
      )}
    >
      <option value={ALL_STATUSES}>Статус: все</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label} · {option.count}
        </option>
      ))}
    </select>
  )
}
