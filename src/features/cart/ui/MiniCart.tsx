'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { removeCartItemAction, updateCartItemAction } from '@/features/cart/actions/cart-actions'
import { getCartAction } from '@/features/cart/actions/get-cart-action'
import type { CartView } from '@/features/cart/queries/get-cart'

export const CART_UPDATED_EVENT = 'fox:cart-updated'

const SYNC_DELAY_MS = 400
const MAX_QUANTITY = 99

export function MiniCart() {
  const t = useTranslations('miniCart')
  const router = useRouter()
  const [cart, setCart] = useState<CartView | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [, startTransition] = useTransition()
  const [drafts, setDrafts] = useState<Record<string, { base: number; value: number }>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const pending = useRef<Record<string, number>>({})

  const load = useCallback(async () => {
    const result = await getCartAction()
    if (result.ok && result.data && result.data.lines.length > 0) {
      setCart(result.data)
      setIsOpen(true)
    }
  }, [])

  // Same rule as the cart page: the number moves on the click, the server hears
  // one update once the buyer stops pressing.
  function shownQuantity(itemId: string, quantity: number): number {
    const draft = drafts[itemId]
    return draft && draft.base === quantity ? draft.value : quantity
  }

  function stepLine(itemId: string, delta: number, base: number) {
    const from = pending.current[itemId] ?? shownQuantity(itemId, base)
    changeLine(itemId, from + delta, base)
  }

  function changeLine(itemId: string, quantity: number, base: number) {
    const clamped = Math.min(MAX_QUANTITY, Math.max(0, quantity))
    pending.current[itemId] = clamped
    setDrafts((current) => ({ ...current, [itemId]: { base, value: clamped } }))

    const existing = timers.current[itemId]
    if (existing) clearTimeout(existing)

    timers.current[itemId] = setTimeout(() => syncLine(itemId, clamped), SYNC_DELAY_MS)
  }

  function syncLine(itemId: string, quantity: number) {
    startTransition(async () => {
      const result =
        quantity < 1
          ? await removeCartItemAction({ itemId })
          : await updateCartItemAction({ itemId, quantity })

      delete pending.current[itemId]

      if (!result.ok) return

      const refreshed = await getCartAction()
      const next = refreshed.ok ? refreshed.data : null

      router.refresh()

      // An emptied cart has nothing left to show, so the drawer gets out of the way.
      if (!next || next.lines.length === 0) {
        setIsOpen(false)
        setCart(null)
        return
      }

      setCart(next)
    })
  }

  useEffect(() => {
    function handle() {
      void load()
    }

    window.addEventListener(CART_UPDATED_EVENT, handle)
    return () => window.removeEventListener(CART_UPDATED_EVENT, handle)
  }, [load])

  if (!cart) return null

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/45" />
        <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(400px,92vw)] flex-col bg-surface shadow-[-10px_0_40px_rgb(35_36_29_/_0.2)]">
          <div className="flex items-center justify-between border-b border-subtle p-5">
            <DialogPrimitive.Title className="font-display text-[17px] font-bold text-ink">
              {t('title')}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="min-h-10 rounded-control border border-subtle px-3 text-[12.5px] font-semibold text-ink hover:border-faint">
              {t('close')}
            </DialogPrimitive.Close>
          </div>

          <div className="grid flex-1 content-start gap-3.5 overflow-auto p-5">
            {cart.lines.map((line) => (
              <div key={line.id} className="flex items-start gap-3">
                <span className="relative size-15 shrink-0 overflow-hidden rounded-chip border border-subtle bg-raised">
                  {line.imageUrl ? (
                    <Image src={line.imageUrl} alt="" fill sizes="60px" className="object-cover" />
                  ) : null}
                </span>
                <span className="flex-1">
                  <span className="block text-[13.5px] leading-snug font-semibold text-ink">
                    {line.title}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-faint">{line.variantLabel}</span>
                  {line.isWholesalePrice ? (
                    <span className="mt-1 inline-block rounded-chip bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">
                      {t('wholesaleTag')}
                    </span>
                  ) : null}
                  {line.wholesaleHint ? (
                    <span className="mt-1 block text-[11.5px] leading-relaxed text-accent">
                      {t('wholesaleHint', {
                        min: line.wholesaleHint.minQuantity,
                        price: line.wholesaleHint.unitPriceLabel,
                        missing: line.wholesaleHint.missing,
                      })}
                    </span>
                  ) : null}

                  <span className="mt-2 flex items-center gap-2.5">
                    <span className="flex overflow-hidden rounded-chip border border-strong">
                      <button
                        type="button"
                        onClick={() => stepLine(line.id, -1, line.quantity)}
                        aria-label={t('fewer', { title: line.title })}
                        className="min-h-8 min-w-8 bg-surface text-[14px] font-semibold text-ink hover:bg-hover"
                      >
                        −
                      </button>
                      <span className="min-w-8 bg-raised px-1 py-1.5 text-center text-[12.5px] font-semibold text-ink">
                        {shownQuantity(line.id, line.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() => stepLine(line.id, 1, line.quantity)}
                        disabled={shownQuantity(line.id, line.quantity) >= MAX_QUANTITY}
                        aria-label={t('more', { title: line.title })}
                        className="min-h-8 min-w-8 bg-surface text-[14px] font-semibold text-ink hover:bg-hover"
                      >
                        +
                      </button>
                    </span>

                    <button
                      type="button"
                      onClick={() => changeLine(line.id, 0, line.quantity)}
                      className="text-[12px] font-semibold text-muted hover:text-alert"
                    >
                      {t('remove')}
                    </button>
                  </span>
                </span>
                <span className="text-[13.5px] font-semibold whitespace-nowrap text-ink">
                  {line.linePriceLabel}
                </span>
              </div>
            ))}
          </div>

          <div className="grid gap-3.5 border-t border-subtle p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-[14px] font-semibold text-ink">{t('subtotal')}</span>
              <span className="font-display text-[22px] font-bold text-ink">
                {cart.subtotalLabel}
              </span>
            </div>

            <div className="grid gap-2.5">
              <Button size="lg" asChild>
                <Link href="/checkout/" onClick={() => setIsOpen(false)}>
                  {t('checkout', { amount: cart.subtotalLabel })}
                </Link>
              </Button>
              {/* The phone-only path, offered at the moment the buyer has
                  just added something — not only on the cart page. */}
              <Button variant="secondary" asChild>
                <Link href="/cart/#quick" onClick={() => setIsOpen(false)}>
                  {t('quickOrder')}
                </Link>
              </Button>
              <Link
                href="/cart/"
                onClick={() => setIsOpen(false)}
                className="text-center text-[13px] font-semibold text-muted hover:text-ink"
              >
                {t('viewCart')}
              </Link>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
