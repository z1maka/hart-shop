'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { ColorSwatch } from '@/components/ui/ColorSwatch'
import { sizeAxisOf } from '@/config/variant-size'
import { trackEvent, type AnalyticsItem } from '@/features/analytics'
import { addToCartAction } from '@/features/cart/actions/cart-actions'
import { cartErrorText } from '@/features/cart/model/cart-errors'
import {
  colorsOf,
  initialPickOf,
  pickWithColor,
  sizesOf,
  variantOf,
  type ChoosableVariant,
  type VariantPick,
} from '@/features/cart/model/variant-choice'
import { CART_UPDATED_EVENT } from '@/features/cart/ui/MiniCart'
import { QUICK_ADD_BASE_CLASS, QUICK_ADD_IDLE_CLASS } from '@/features/cart/ui/QuickAddButton'
import { SizePicker } from '@/features/cart/ui/SizePicker'
import { cn } from '@/lib/utils'

type QuickChoiceDialogProps = {
  readonly productTitle: string
  readonly productHref: string
  readonly image: { readonly url: string; readonly alt: string } | null
  // Formatted on the server: the browser's ICU spells the hryvnia differently.
  readonly priceLabel: string
  readonly variants: readonly ChoosableVariant[]
  readonly preferredColor: string | null
  readonly analyticsItem?: AnalyticsItem
  readonly triggerLabel: string
  readonly triggerClassName?: string
}

const TILE_CLASS = 'flex size-11 items-center justify-center rounded-control p-[3px] transition-colors'

// The card's «До кошика» for a product sold in several variants: the buyer
// picks colour and model here, in the page's own pickers, instead of the
// first variant being added for them (owner, 21.10.2026). A phone gets a
// sheet from the bottom edge, a wider screen a dialog in the middle.
export function QuickChoiceDialog({
  productTitle,
  productHref,
  image,
  priceLabel,
  variants,
  preferredColor,
  analyticsItem,
  triggerLabel,
  triggerClassName,
}: QuickChoiceDialogProps) {
  const t = useTranslations('addToCart')
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [pick, setPick] = useState<VariantPick>(() => initialPickOf(variants, preferredColor))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const colors = colorsOf(variants)
  const sizes = sizesOf(variants, pick.color)
  const chosen = variantOf(variants, pick)

  function buttonLabel(): string {
    if (chosen === null) return t(`choose.${sizeAxisOf(sizes)}`)
    if (!chosen.isAvailable) return t('outOfStock')
    return t('addWithPrice', { price: priceLabel })
  }

  function handleOpenChange(next: boolean) {
    setIsOpen(next)
    if (!next) return
    setPick(initialPickOf(variants, preferredColor))
    setError(null)
  }

  function handleAdd() {
    if (!chosen?.isAvailable) return

    startTransition(async () => {
      const result = await addToCartAction({ variantId: chosen.id, quantity: 1 })
      if (!result.ok) {
        setError(cartErrorText(result.error, (code) => t(`errors.${code}`)))
        return
      }

      // The dialog steps aside for the mini cart, which opens on the event
      // and shows the line just added, model and all.
      setIsOpen(false)
      if (analyticsItem) trackEvent({ name: 'add_to_cart', item: analyticsItem })
      router.refresh()
      window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT))
    })
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Trigger
        aria-label={`${triggerLabel} — ${productTitle}`}
        className={cn(QUICK_ADD_BASE_CLASS, QUICK_ADD_IDLE_CLASS, triggerClassName)}
      >
        {triggerLabel}
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/45 motion-safe:data-[state=closed]:animate-fade-out motion-safe:data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-card bg-surface shadow-[0_-12px_40px_rgb(35_36_29_/_0.25)] motion-safe:data-[state=closed]:animate-sheet-out motion-safe:data-[state=open]:animate-sheet-in sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[min(520px,92vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card sm:shadow-[0_24px_60px_rgb(35_36_29_/_0.28)] sm:motion-safe:data-[state=closed]:animate-fade-out sm:motion-safe:data-[state=open]:animate-fade-in"
        >
          <span aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-pill bg-strong sm:hidden" />

          <ChoiceHeader
            productTitle={productTitle}
            image={image}
            priceLabel={priceLabel}
            closeLabel={t('close')}
          />

          <div className="flex flex-col gap-5 overflow-y-auto px-5 py-5">
            {colors.length > 1 ? (
              <ColorChoice
                colors={colors}
                activeColor={pick.color}
                onSelect={(color) => setPick(pickWithColor(variants, pick, color))}
              />
            ) : null}

            {sizes.length > 0 ? (
              <SizePicker
                options={sizes.map((size) => ({
                  size,
                  isAvailable: Boolean(variantOf(variants, { color: pick.color, size })?.isAvailable),
                }))}
                activeSize={pick.size}
                onSelect={(size) => setPick({ color: pick.color, size })}
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-subtle px-5 pt-4 pb-5">
            <Button
              size="lg"
              onClick={handleAdd}
              disabled={!chosen?.isAvailable || isPending}
              className="w-full"
            >
              {buttonLabel()}
            </Button>
            {error ? (
              <p role="alert" className="text-[13px] font-medium text-alert">
                {error}
              </p>
            ) : null}
            <Link
              href={productHref}
              className="self-center text-[12.5px] font-semibold text-accent underline-offset-4 hover:underline"
            >
              {t('productPage')}
            </Link>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function ChoiceHeader({
  productTitle,
  image,
  priceLabel,
  closeLabel,
}: {
  readonly productTitle: string
  readonly image: QuickChoiceDialogProps['image']
  readonly priceLabel: string
  readonly closeLabel: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-subtle px-5 py-4">
      <div className="flex min-w-0 items-center gap-3.5">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt}
            width={56}
            height={56}
            sizes="56px"
            className="size-14 shrink-0 rounded-control object-cover"
          />
        ) : null}
        <div className="min-w-0">
          <DialogPrimitive.Title className="font-display text-[17px] leading-tight font-bold text-ink">
            {productTitle}
          </DialogPrimitive.Title>
          <p className="mt-1 text-[13px] font-semibold text-muted">{priceLabel}</p>
        </div>
      </div>
      <DialogPrimitive.Close className="min-h-10 shrink-0 rounded-control border border-subtle px-3 text-[12.5px] font-semibold text-ink hover:border-faint">
        {closeLabel}
      </DialogPrimitive.Close>
    </div>
  )
}

function ColorChoice({
  colors,
  activeColor,
  onSelect,
}: {
  readonly colors: readonly string[]
  readonly activeColor: string | null
  readonly onSelect: (color: string) => void
}) {
  const t = useTranslations('addToCart')
  const colorsT = useTranslations('colors')
  const colorName = (color: string) => (colorsT.has(color) ? colorsT(color) : color)

  return (
    <div>
      <p className="mb-2.5 text-[13px] font-bold text-ink">
        {t('pattern', { color: activeColor ? colorName(activeColor) : '' })}
      </p>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onSelect(color)}
            aria-pressed={color === activeColor}
            aria-label={colorName(color)}
            title={colorName(color)}
            className={cn(
              TILE_CLASS,
              color === activeColor ? 'border-2 border-ink' : 'border border-strong hover:border-ink',
            )}
          >
            <ColorSwatch name={color} className="size-full rounded-[2px] border-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
