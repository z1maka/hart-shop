'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { cn } from '@/lib/utils'

export type NavigateOption = {
  readonly value: string
  readonly label: string
  // Where choosing this option leads — built on the server with the other
  // filters kept.
  readonly href: string
}

type NavigateSelectProps = {
  readonly label: string
  readonly value: string
  readonly options: readonly NavigateOption[]
}

// A dropdown that changes the list's address: sorting and page size. The
// page keeps its scroll, as with every other filter.
export function NavigateSelect({ label, value, options }: NavigateSelectProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function choose(next: string) {
    const option = options.find((entry) => entry.value === next)
    if (!option) return
    startTransition(() => router.push(option.href, { scroll: false }))
  }

  return (
    <label className="inline-flex items-center gap-2 text-[12.5px] text-muted">
      <span className="whitespace-nowrap">{label}</span>
      <select
        value={value}
        onChange={(event) => choose(event.target.value)}
        disabled={isPending}
        className={cn(
          'min-h-10 rounded-control border border-strong bg-surface px-3 text-[13px] font-semibold text-ink',
          'disabled:opacity-60',
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
