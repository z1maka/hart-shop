'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { switchCartItemVariantAction } from '@/features/cart/actions/cart-actions'
import { cartErrorText } from '@/features/cart/model/cart-errors'
import type { LineModelOption } from '@/features/cart/model/line-models'
import {
  CART_LINE_GAP_CLASSES,
  CART_LINE_TEXT_CLASSES,
  type CartLineDensity,
} from '@/features/cart/ui/CartLineVariant'
import { cn } from '@/lib/utils'

type CartLineModelSwitchProps = {
  readonly itemId: string
  readonly activeVariantId: string
  readonly options: readonly LineModelOption[]
  readonly color: string | null
  readonly label: string
  readonly density?: CartLineDensity
  readonly onSwitched?: () => void
}

// The line's model as small tags, one per model: the buyer who picked the
// wrong dish switches it here instead of removing the line and starting
// over (owner, 21.10.2026). Each tag reaches past its outline vertically, so
// a finger finds it on a phone while the row stays small.
export function CartLineModelSwitch({
  itemId,
  activeVariantId,
  options,
  color,
  label,
  density = 'regular',
  onSwitched,
}: CartLineModelSwitchProps) {
  const t = useTranslations('addToCart')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [requestedId, setRequestedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const shownId = isPending && requestedId ? requestedId : activeVariantId

  function choose(variantId: string) {
    if (variantId === activeVariantId || isPending) return

    setError(null)
    setRequestedId(variantId)
    startTransition(async () => {
      const result = await switchCartItemVariantAction({ itemId, variantId })
      if (!result.ok) {
        setError(cartErrorText(result.error, (code) => t(`errors.${code}`)))
        return
      }
      router.refresh()
      onSwitched?.()
    })
  }

  return (
    <span className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', CART_LINE_GAP_CLASSES[density])}>
      <span
        role="group"
        aria-label={label}
        className={cn('inline-flex flex-wrap gap-1 transition-opacity', isPending && 'opacity-60')}
      >
        {options.map((option) => {
          const isActive = option.variantId === shownId

          return (
            <button
              key={option.variantId}
              type="button"
              aria-pressed={isActive}
              disabled={!option.isAvailable}
              onClick={() => choose(option.variantId)}
              className={cn(
                'relative inline-flex h-5.5 items-center rounded-control border px-1.5 text-[11.5px] font-bold whitespace-nowrap transition-colors after:absolute after:inset-x-0 after:-inset-y-2.5 after:content-[""]',
                isActive
                  ? 'border-ink bg-ink text-on-dark'
                  : 'border-strong bg-raised text-muted hover:border-ink hover:text-ink',
                !option.isAvailable && 'cursor-not-allowed line-through opacity-50',
              )}
            >
              {option.size}
            </button>
          )
        })}
      </span>
      {color ? <span className={CART_LINE_TEXT_CLASSES[density]}>{color}</span> : null}
      {error ? (
        <span role="alert" className="basis-full text-[12px] font-medium text-alert">
          {error}
        </span>
      ) : null}
    </span>
  )
}
