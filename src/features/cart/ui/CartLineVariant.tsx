import { isSizeAxisProminent, sizeAxisOf, type SizeAxis } from '@/config/variant-size'
import { cn } from '@/lib/utils'

export type CartLineDensity = 'regular' | 'compact'

type CartLineVariantProps = {
  readonly variantLabel: string
  readonly color: string | null
  readonly size: string | null
  readonly axisLabel: (axis: SizeAxis) => string
  // Said after the variant: the quantity in the checkout summary.
  readonly extra?: string
  readonly density?: CartLineDensity
}

export const CART_LINE_TEXT_CLASSES: Record<CartLineDensity, string> = {
  regular: 'text-[12.5px] text-muted',
  compact: 'text-[12px] text-faint',
}

export const CART_LINE_GAP_CLASSES: Record<CartLineDensity, string> = {
  regular: 'mt-1.5',
  compact: 'mt-1',
}

// A cart line's variant as read-only text. A model the buyer must get right —
// the dish a Starlink cover is cut to — is a small tag ahead of the colour
// (owner, 21.10.2026); any other variant stays the label it was bought under.
export function CartLineVariant({
  variantLabel,
  color,
  size,
  axisLabel,
  extra,
  density = 'regular',
}: CartLineVariantProps) {
  const axis = size === null ? null : sizeAxisOf([size])

  if (size === null || axis === null || !isSizeAxisProminent(axis)) {
    const text = [variantLabel, extra].filter(Boolean).join(' · ')
    return text ? (
      <span className={cn('block', CART_LINE_GAP_CLASSES[density], CART_LINE_TEXT_CLASSES[density])}>
        {text}
      </span>
    ) : null
  }

  const rest = [color, extra].filter(Boolean).join(' · ')

  return (
    <span className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', CART_LINE_GAP_CLASSES[density])}>
      <span className="inline-flex h-5.5 items-center rounded-control border border-accent-mid bg-accent-tint px-1.5 text-[11.5px] font-bold whitespace-nowrap text-accent">
        <span className="sr-only">{axisLabel(axis)}: </span>
        {size}
      </span>
      {rest ? <span className={CART_LINE_TEXT_CLASSES[density]}>{rest}</span> : null}
    </span>
  )
}
