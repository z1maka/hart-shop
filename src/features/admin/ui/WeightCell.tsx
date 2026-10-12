'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, useTransition } from 'react'
import { setProductWeightAction } from '@/features/admin/actions/product-actions'
import { MAX_PRODUCT_WEIGHT_KG } from '@/features/admin/model/product-form'
import { errorText } from '@/features/admin/ui/messages'
import { cn } from '@/lib/utils'

type WeightCellProps = {
  readonly slug: string
  readonly title: string
  // Kilograms as text; empty means nobody has weighed it yet.
  readonly weightKgInput: string
}

const WEIGHT_MAX_LENGTH = 6

// The carrier prices a parcel by weight, so a product without one blocks its
// waybill. Filling it here beats opening every product in turn.
export function WeightCell({ slug, title, weightKgInput }: WeightCellProps) {
  const router = useRouter()
  const errorId = useId()
  const [value, setValue] = useState(weightKgInput)
  const [shown, setShown] = useState(weightKgInput)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // The list can be re-read from the server while this cell lives on — after
  // a bulk action, or a weight changed in the product editor. Whatever comes
  // back wins over what the cell was holding.
  if (shown !== weightKgInput) {
    setShown(weightKgInput)
    setValue(weightKgInput)
    setError(null)
  }

  function save() {
    const next = value.trim()
    if (next === weightKgInput) return
    if (next === '') {
      setValue(weightKgInput)
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await setProductWeightAction({ slug, weightKg: next }).catch(() => null)
      if (!result?.ok) {
        setValue(weightKgInput)
        setError(
          result && result.error.code !== 'VALIDATION_FAILED'
            ? errorText(result.error)
            : `Вес в кг, до ${MAX_PRODUCT_WEIGHT_KG}: например 1,4`,
        )
        return
      }
      // The list and the «Без веса» count are rendered on the server.
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
          if (event.key === 'Escape') setValue(weightKgInput)
        }}
        inputMode="decimal"
        maxLength={WEIGHT_MAX_LENGTH}
        disabled={isPending}
        placeholder="—"
        aria-label={`Вес «${title}», кг`}
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'min-h-9 w-20 rounded-control border bg-surface px-2.5 text-right text-[13px] text-ink',
          'focus-visible:border-accent disabled:opacity-60',
          weightKgInput === '' ? 'border-alert-edge bg-alert-soft' : 'border-subtle',
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
