'use client'

import { useTranslations } from 'next-intl'
import { sizeAxisOf } from '@/config/variant-size'
import type { CartLineView } from '@/features/cart/queries/get-cart'
import { CartLineModelSwitch } from '@/features/cart/ui/CartLineModelSwitch'
import { CartLineVariant, type CartLineDensity } from '@/features/cart/ui/CartLineVariant'

type CartLineOptionsProps = {
  readonly line: Pick<
    CartLineView,
    'id' | 'variantId' | 'variantLabel' | 'color' | 'size' | 'modelOptions'
  >
  readonly density?: CartLineDensity
  readonly onSwitched?: () => void
}

// What a cart line says about its variant: a model switch where the line has
// models to choose between, the plain variant otherwise.
export function CartLineOptions({ line, density = 'regular', onSwitched }: CartLineOptionsProps) {
  const t = useTranslations('addToCart')

  if (line.modelOptions.length > 1) {
    return (
      <CartLineModelSwitch
        itemId={line.id}
        activeVariantId={line.variantId}
        options={line.modelOptions}
        color={line.color}
        label={t(sizeAxisOf(line.modelOptions.map((option) => option.size)))}
        density={density}
        onSwitched={onSwitched}
      />
    )
  }

  return (
    <CartLineVariant
      variantLabel={line.variantLabel}
      color={line.color}
      size={line.size}
      axisLabel={(axis) => t(axis)}
      density={density}
    />
  )
}
