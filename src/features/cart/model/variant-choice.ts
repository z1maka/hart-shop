// A product's variants as a buyer picks them: a colour, then a size or model
// within it. The product page and the catalogue card's choice dialog both
// resolve a pick to one variant this way.
export type ChoosableVariant = {
  readonly id: string
  readonly color: string | null
  readonly size: string | null
  readonly isAvailable: boolean
}

export type VariantPick = {
  readonly color: string | null
  readonly size: string | null
}

export function colorsOf(variants: readonly ChoosableVariant[]): string[] {
  return [
    ...new Set(variants.map((variant) => variant.color).filter((color) => color !== null)),
  ]
}

// The sizes sold in the chosen colour, in the variants' order.
export function sizesOf(variants: readonly ChoosableVariant[], color: string | null): string[] {
  return [
    ...new Set(
      variants
        .filter((variant) => variant.color === color)
        .map((variant) => variant.size)
        .filter((size) => size !== null),
    ),
  ]
}

// The variant a pick names, or null while the pick is incomplete: a product
// sold in several sizes waits for one — nothing is chosen for the buyer.
export function variantOf(
  variants: readonly ChoosableVariant[],
  pick: VariantPick,
): ChoosableVariant | null {
  const isSizeNeeded = sizesOf(variants, pick.color).length > 0
  if (isSizeNeeded && pick.size === null) return null

  return (
    variants.find(
      (variant) =>
        variant.color === pick.color && (isSizeNeeded ? variant.size === pick.size : true),
    ) ?? null
  )
}

// A new colour keeps the size already chosen when the colour sells it, so a
// buyer who picked the model first does not pick it again.
export function pickWithColor(
  variants: readonly ChoosableVariant[],
  pick: VariantPick,
  color: string,
): VariantPick {
  const sizes = sizesOf(variants, color)
  if (pick.size !== null && sizes.includes(pick.size)) return { color, size: pick.size }
  return { color, size: sizes.length === 1 ? (sizes[0] ?? null) : null }
}

// Where the dialog opens: the colour asked for (a card filtered to it), else
// the first one; the size only when the colour leaves no choice.
export function initialPickOf(
  variants: readonly ChoosableVariant[],
  preferredColor: string | null,
): VariantPick {
  const colors = colorsOf(variants)
  const color =
    preferredColor !== null && colors.includes(preferredColor) ? preferredColor : (colors[0] ?? null)
  const sizes = sizesOf(variants, color)

  return { color, size: sizes.length === 1 ? (sizes[0] ?? null) : null }
}
