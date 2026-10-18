'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, useTransition } from 'react'
import { setProductCatalogPositionAction } from '@/features/admin/actions/product-actions'
import { MAX_CATALOG_POSITION } from '@/features/admin/model/product-form'
import { errorText } from '@/features/admin/ui/messages'
import { cn } from '@/lib/utils'

type CatalogPositionCellProps = {
  readonly slug: string
  readonly title: string
  // The place under «Рекомендовані» as text; empty for an unplaced product.
  readonly positionInput: string
}

const POSITION_MAX_LENGTH = String(MAX_CATALOG_POSITION).length

// The shop lists products under «Рекомендовані» by this number, so the owner
// arranges the shelf right here, row by row. Clearing the cell puts the
// product back after the numbered ones.
export function CatalogPositionCell({ slug, title, positionInput }: CatalogPositionCellProps) {
  const router = useRouter()
  const errorId = useId()
  const [value, setValue] = useState(positionInput)
  const [shown, setShown] = useState(positionInput)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // The list is re-read from the server after every save and filter change;
  // whatever comes back wins over what the cell was holding.
  if (shown !== positionInput) {
    setShown(positionInput)
    setValue(positionInput)
    setError(null)
  }

  function save() {
    const next = value.trim()
    if (next === positionInput) return

    setError(null)
    startTransition(async () => {
      const result = await setProductCatalogPositionAction({ slug, position: next }).catch(
        () => null,
      )
      if (!result?.ok) {
        setValue(positionInput)
        setError(
          result && result.error.code !== 'VALIDATION_FAILED'
            ? errorText(result.error)
            : `Целое число от 1 до ${MAX_CATALOG_POSITION}`,
        )
        return
      }
      router.refresh()
    })
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') setValue(positionInput)
        }}
        inputMode="numeric"
        maxLength={POSITION_MAX_LENGTH}
        disabled={isPending}
        placeholder="—"
        aria-label={`Позиция «${title}» в каталоге`}
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'min-h-9 w-16 rounded-control border border-subtle bg-surface px-2.5 text-right text-[13px] text-ink',
          'focus-visible:border-accent disabled:opacity-60',
        )}
      />
      {error ? (
        <span id={errorId} className="max-w-[22ch] text-[11.5px] text-alert">
          {error}
        </span>
      ) : null}
    </span>
  )
}
