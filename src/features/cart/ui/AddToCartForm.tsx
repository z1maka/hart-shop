'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { ColorSwatch } from '@/components/ui/ColorSwatch'
import { SizeGuideDialog } from '@/components/ui/SizeGuideDialog'
import { sizeGuideRowsFor } from '@/config/size-guide'
import { Button } from '@/components/ui/Button'
import { useSelectedColor } from '@/components/ui/SelectedColor'
import { addToCartAction } from '@/features/cart/actions/cart-actions'
import { trackEvent, type AnalyticsItem } from '@/features/analytics'
import { CART_UPDATED_EVENT } from '@/features/cart/ui/MiniCart'
import { cn } from '@/lib/utils'

export type PurchasableVariant = {
  readonly id: string
  readonly color: string
  readonly size: string | null
  readonly label: string
  readonly stockQty: number
  readonly isAvailable: boolean
}

// The volume tier, priced by the server: money is formatted there only,
// because the browser's ICU spells the hryvnia differently from Node's.
export type WholesaleOffer = {
  readonly minQuantity: number
  readonly priceLabel: string
}

type AddToCartFormProps = {
  readonly variants: readonly PurchasableVariant[]
  // What one unit costs today, sale included, and the volume tier if any:
  // the button and the line under the counter follow the quantity chosen.
  readonly priceLabel: string
  readonly wholesale: WholesaleOffer | null
  // Units of this product already in the cart: the tier is earned by the
  // product as a whole, so the counter starts from them.
  readonly inCartQuantity: number
  readonly initialColor: string | null
  readonly analyticsItem?: AnalyticsItem
}

const DEFAULT_VARIANT_LABEL = 'Standard'

// A basket big enough for a unit's order, never more than the shelf holds.
const MAX_QUANTITY = 99

const KNOWN_ERROR_CODES = new Set([
  'OUT_OF_STOCK',
  'VARIANT_NOT_FOUND',
  'CART_NOT_FOUND',
  'VALIDATION_FAILED',
])

export function AddToCartForm({
  variants,
  priceLabel,
  wholesale,
  inCartQuantity,
  initialColor,
  analyticsItem,
}: AddToCartFormProps) {
  const t = useTranslations('addToCart')
  const pdpT = useTranslations('pdp')
  const colorsT = useTranslations('colors')
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const colors = [...new Set(variants.map((variant) => variant.color))]
  const [color, setColor] = useState(
    initialColor && colors.includes(initialColor) ? initialColor : (colors[0] ?? ''),
  )

  // The gallery follows the colour on screen, from the first paint on.
  const { setColor: showColor } = useSelectedColor()
  useEffect(() => {
    showColor(color)
  }, [color, showColor])

  const sizes = variants
    .filter((variant) => variant.color === color && variant.size !== null)
    .map((variant) => variant.size as string)
  const [size, setSize] = useState<string | null>(sizes[0] ?? null)
  const sizeGuideRows = sizeGuideRowsFor(sizes)
  const [quantity, setQuantity] = useState(1)

  const activeSize = size && sizes.includes(size) ? size : (sizes[0] ?? null)
  const selected = variants.find(
    (variant) => variant.color === color && variant.size === activeSize,
  )

  function handleColorChange(next: string) {
    setColor(next)
    setSize(null)
    setError(null)
  }

  function handleAdd() {
    if (!selected) return

    setError(null)
    startTransition(async () => {
      const result = await addToCartAction({ variantId: selected.id, quantity: orderedQuantity })

      if (!result.ok) {
        setError(
          KNOWN_ERROR_CODES.has(result.error.code)
            ? t(`errors.${result.error.code}`)
            : result.error.message,
        )
        return
      }

      if (analyticsItem) {
        trackEvent({ name: 'add_to_cart', item: { ...analyticsItem, quantity: orderedQuantity } })
      }
      router.refresh()
      window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT))
    })
  }

  // The colour on screen sets the ceiling: offering more than its stock only
  // buys the shopper an error after the click.
  const maxQuantity = Math.max(1, Math.min(MAX_QUANTITY, selected?.stockQty ?? 1))
  const orderedQuantity = Math.min(quantity, maxQuantity)
  const isAddable = Boolean(selected?.isAvailable) && !isPending
  const productQuantity = orderedQuantity + inCartQuantity
  const reachedTier = wholesale && productQuantity >= wholesale.minQuantity ? wholesale : null
  const isWholesaleReached = reachedTier !== null
  const liveUnitPriceLabel = reachedTier?.priceLabel ?? priceLabel
  const buttonLabel = selected?.isAvailable
    ? t('addWithPrice', { price: liveUnitPriceLabel })
    : t('outOfStock')

  // A single unnamed variant is the donor saying "one finish"; a picker with one
  // dead option is worse than no picker.
  const hasPatternChoice = colors.length > 1 || colors[0] !== DEFAULT_VARIANT_LABEL

  return (
    <div className="flex flex-col gap-5">
      {hasPatternChoice ? (
        <div>
          <p className="mb-2.5 text-[13px] font-bold text-ink">
            {t('pattern', { color: colorsT.has(color) ? colorsT(color) : color })}
          </p>
          {/* Colour tiles, as the Гарт design draws them; the name is read
              out and shown on hover, and the line above names the choice. */}
          <div className="flex flex-wrap gap-2">
            {colors.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => handleColorChange(entry)}
                aria-pressed={entry === color}
                aria-label={colorsT.has(entry) ? colorsT(entry) : entry}
                title={colorsT.has(entry) ? colorsT(entry) : entry}
                className={cn(
                  'flex size-11 items-center justify-center rounded-control p-[3px] transition-colors',
                  entry === color ? 'border-2 border-ink' : 'border border-strong hover:border-ink',
                )}
              >
                <ColorSwatch name={entry} className="size-full rounded-[2px] border-0" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {sizes.length > 0 ? (
        <div>
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-bold text-ink">{t('size')}</p>
            {sizeGuideRows.length > 0 ? <SizeGuideDialog rows={sizeGuideRows} /> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((entry) => {
              const variant = variants.find(
                (candidate) => candidate.color === color && candidate.size === entry,
              )
              const isDisabled = !variant?.isAvailable

              return (
                <button
                  key={entry}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setSize(entry)}
                  aria-pressed={entry === activeSize}
                  className={cn(
                    'min-h-11.5 rounded-control border-[1.5px] px-4.5 text-[13.5px] font-bold transition-colors',
                    entry === activeSize
                      ? 'border-ink bg-ink text-on-dark'
                      : 'border-strong bg-raised text-ink hover:border-ink',
                    isDisabled &&
                      'cursor-not-allowed border-subtle bg-surface text-strong line-through',
                  )}
                >
                  {entry}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <div className="flex overflow-hidden rounded-control border-[1.5px] border-strong bg-raised">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, orderedQuantity - 1))}
            disabled={orderedQuantity <= 1}
            aria-label={t('decrease')}
            className="min-h-[52px] min-w-12 px-4 text-[17px] font-bold text-ink hover:bg-hover disabled:cursor-not-allowed disabled:text-faint"
          >
            −
          </button>
          <span className="flex min-w-11 items-center justify-center px-2 text-center text-[15px] font-bold text-ink">
            {orderedQuantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
            disabled={orderedQuantity >= maxQuantity}
            aria-label={t('increase')}
            className="min-h-[52px] min-w-12 px-4 text-[17px] font-bold text-ink hover:bg-hover disabled:cursor-not-allowed disabled:text-faint"
          >
            +
          </button>
        </div>

        <Button
          size="lg"
          className="min-h-[54px] min-w-55 flex-[1_1_220px] text-[16px]"
          onClick={handleAdd}
          disabled={!isAddable}
        >
          {buttonLabel}
        </Button>
      </div>

      {/* The price block above names the tier; this line counts down to it
          and turns into the applied price once the counter gets there. */}
      {wholesale ? (
        <p
          className={cn(
            'text-[13px] leading-relaxed font-medium',
            isWholesaleReached ? 'font-semibold text-khaki-ink' : 'text-muted',
          )}
        >
          {isWholesaleReached
            ? t('wholesaleApplied', { price: wholesale.priceLabel })
            : t('wholesaleAhead', { missing: wholesale.minQuantity - productQuantity })}
        </p>
      ) : null}

      {error ? <p className="text-[13px] font-medium text-alert">{error}</p> : null}

      {/* Everything is made to order, so the page never counts units or warns
          that a colour is running out (owner's decision, 25.09.2026). */}
      {selected?.isAvailable ? (
        <p className="text-[13px] leading-relaxed font-medium text-muted">{pdpT('inStock')}</p>
      ) : null}
    </div>
  )
}
