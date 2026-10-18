import type { AdminProductState } from '@/features/admin/queries/get-admin-catalog'
import { cn } from '@/lib/utils'

// The state names as the admin reads them; out of stock stays visible on the
// product even though it is not a filter.
const STATE_LABELS: Record<AdminProductState, string> = {
  published: 'Опубликован',
  out_of_stock: 'Нет в наличии',
  draft: 'Черновик',
  category_hidden: 'Скрыт с категорией',
  archived: 'Архив',
}

const STATE_CLASSES: Record<AdminProductState, string> = {
  published: 'bg-accent-soft text-accent-hover',
  out_of_stock: 'bg-alert-soft text-alert',
  draft: 'bg-sunken text-muted',
  category_hidden: 'bg-sunken text-muted',
  archived: 'bg-sunken text-muted',
}

export function ProductStateBadge({
  state,
  className,
}: {
  readonly state: AdminProductState
  readonly className?: string
}) {
  return (
    <span
      className={cn(
        'inline-block rounded-pill px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap',
        STATE_CLASSES[state],
        className,
      )}
    >
      {STATE_LABELS[state]}
    </span>
  )
}
