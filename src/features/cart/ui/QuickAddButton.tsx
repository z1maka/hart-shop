'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addToCartAction } from '@/features/cart/actions/cart-actions'
import { trackEvent, type AnalyticsItem } from '@/features/analytics'
import { CART_UPDATED_EVENT } from '@/features/cart/ui/MiniCart'
import { cn } from '@/lib/utils'

type QuickAddButtonProps = {
  readonly variantId: string
  readonly productTitle: string
  readonly analyticsItem?: AnalyticsItem
  readonly label?: string
  readonly className?: string
}

type Status = 'idle' | 'added' | 'failed'

const RESET_DELAY_MS = 2200

const RESULT_KEYS = {
  added: 'added',
  failed: 'outOfStock',
} as const

export function QuickAddButton({
  variantId,
  productTitle,
  analyticsItem,
  label,
  className,
}: QuickAddButtonProps) {
  const t = useTranslations('product')
  const router = useRouter()
  const [status, setStatus] = useState<Status>('idle')
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await addToCartAction({ variantId, quantity: 1 })

      setStatus(result.ok ? 'added' : 'failed')

      if (result.ok) {
        if (analyticsItem) trackEvent({ name: 'add_to_cart', item: analyticsItem })
        router.refresh()
        window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT))
      }

      setTimeout(() => setStatus('idle'), RESET_DELAY_MS)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={`${label ?? t('addToCart')} — ${productTitle}`}
      className={cn(
        'min-h-11 rounded-control border px-4 text-[13px] font-semibold transition-colors',
        status === 'added'
          ? 'border-accent bg-accent text-accent-fg'
          : 'border-strong bg-surface text-ink hover:border-accent hover:bg-accent hover:text-accent-fg',
        status === 'failed' && 'border-alert text-alert',
        className,
      )}
    >
      {status === 'idle' ? (label ?? t('addToCart')) : t(RESULT_KEYS[status])}
    </button>
  )
}
