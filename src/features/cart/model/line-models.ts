import { isSizeAxisProminent, sizeAxisOf } from '@/config/variant-size'

export type LineModelOption = {
  readonly variantId: string
  readonly size: string
  readonly isAvailable: boolean
}

// The models a cart line can switch between — a cover's Starlink dishes —
// offered only for a prominent axis with a real choice; a clothing size is
// changed on the product page. A model is open when its stock covers the
// line's whole quantity, as the switch itself requires.
export function lineModelOptionsOf(
  options: readonly { readonly variantId: string; readonly size: string; readonly stockQty: number }[],
  quantity: number,
): LineModelOption[] {
  const sizes = options.map((option) => option.size)
  if (sizes.length < 2 || !isSizeAxisProminent(sizeAxisOf(sizes))) return []

  return options.map((option) => ({
    variantId: option.variantId,
    size: option.size,
    isAvailable: option.stockQty >= quantity,
  }))
}
