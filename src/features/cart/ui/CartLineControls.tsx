'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { removeCartItemAction, updateCartItemAction } from '@/features/cart/actions/cart-actions'
import { useTranslations } from 'next-intl'

type CartLineControlsProps = {
  readonly itemId: string
  readonly quantity: number
}

// Clicks land far faster than a round trip, so the number moves at once and the
// server hears one update after the buyer stops pressing. Waiting for the
// server on every press made the control feel broken.
const SYNC_DELAY_MS = 400
const MAX_QUANTITY = 99

export function CartLineControls({ itemId, quantity }: CartLineControlsProps) {
  const t = useTranslations('addToCart')
  const removeT = useTranslations('miniCart')
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [draft, setDraft] = useState<{ base: number; value: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Clicks arrive faster than React re-renders, so the running total lives in a
  // ref: reading it from the rendered value would lose every press but the first.
  const pending = useRef<number | null>(null)

  // The draft is dropped as soon as the server reports the quantity it was
  // based on has changed — no effect needed to resynchronise.
  const shown = draft && draft.base === quantity ? draft.value : quantity

  function step(delta: number) {
    apply((pending.current ?? shown) + delta)
  }

  function apply(nextQuantity: number) {
    const clamped = Math.min(MAX_QUANTITY, Math.max(0, nextQuantity))
    pending.current = clamped
    setDraft({ base: quantity, value: clamped })

    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      startTransition(async () => {
        if (clamped < 1) {
          await removeCartItemAction({ itemId })
        } else {
          await updateCartItemAction({ itemId, quantity: clamped })
        }

        pending.current = null
        router.refresh()
      })
    }, SYNC_DELAY_MS)
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex overflow-hidden rounded-control border-[1.5px] border-strong bg-raised">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label={t('decrease')}
          className="min-h-10 min-w-10 text-[15px] font-bold text-ink hover:bg-hover"
        >
          −
        </button>
        <span className="flex min-w-9 items-center justify-center px-1 text-center text-[13.5px] font-bold text-ink">
          {shown}
        </span>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={shown >= MAX_QUANTITY}
          aria-label={t('increase')}
          className="min-h-10 min-w-10 text-[15px] font-bold text-ink hover:bg-hover disabled:opacity-40"
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={() => apply(0)}
        className="text-[12.5px] font-bold text-muted hover:text-alert"
      >
        {removeT('remove')}
      </button>
    </div>
  )
}
