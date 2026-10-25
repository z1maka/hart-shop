import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// The stats charts' hover card: the day on top, then one row per number,
// the value strong and the name quiet. A short colour key ties a row to its
// bars; the text itself never takes the series colour.
export function ChartTooltip({
  title,
  children,
}: {
  readonly title: string
  readonly children: ReactNode
}) {
  return (
    <div className="min-w-44 rounded-control border border-subtle bg-raised px-3 py-2.5 shadow-card">
      <p className="mb-1.5 text-[12px] font-semibold text-muted first-letter:uppercase">{title}</p>
      <dl className="grid gap-1">{children}</dl>
    </div>
  )
}

export function TooltipRow({
  label,
  value,
  swatchClassName,
}: {
  readonly label: string
  readonly value: string
  readonly swatchClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-[12.5px]">
      <dt className="flex items-center gap-1.5 text-muted">
        {swatchClassName ? (
          <span aria-hidden className={cn('h-0.5 w-3 rounded-full', swatchClassName)} />
        ) : null}
        {label}
      </dt>
      <dd className="font-semibold text-ink tabular-nums">{value}</dd>
    </div>
  )
}
