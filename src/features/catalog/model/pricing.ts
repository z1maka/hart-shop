// What one unit costs depends on how many of the product are bought: the
// shop sells to units and volunteers, and from a certain quantity the price
// drops to the wholesale one, as the WordPress shop did (one tier, set per
// product in the admin).

export type WholesaleTier = {
  readonly minQuantity: number
  readonly priceCents: number
}

export type PricedProduct = {
  readonly priceCents: number
  readonly salePriceCents: number | null
  readonly wholesale: WholesaleTier | null
}

// One is retail by definition; a tier that starts at one unit is a price cut.
export const MIN_WHOLESALE_QUANTITY = 2
const PERCENT = 100

export function wholesaleTierOf(
  minQuantity: number | null,
  priceCents: number | null,
): WholesaleTier | null {
  return minQuantity !== null && priceCents !== null ? { minQuantity, priceCents } : null
}

export function singleUnitPriceCents(
  product: Pick<PricedProduct, 'priceCents' | 'salePriceCents'>,
): number {
  return product.salePriceCents ?? product.priceCents
}

// The unit price when `quantity` of the product is bought together, whatever
// its variants: the sale price while a sale runs, the wholesale price from
// the tier's quantity up, and never more than one unit costs on its own.
export function unitPriceCentsFor(product: PricedProduct, quantity: number): number {
  const single = singleUnitPriceCents(product)
  const tier = product.wholesale

  if (tier && quantity >= tier.minQuantity && tier.priceCents < single) return tier.priceCents

  return single
}

// A tier has to start above one unit and undercut the single-unit price,
// sale included; anything else would be a price cut in disguise or a tier
// that never applies.
export function isValidWholesale(
  priceCents: number,
  salePriceCents: number | null,
  tier: WholesaleTier | null,
): boolean {
  if (tier === null) return true

  return (
    Number.isInteger(tier.minQuantity) &&
    tier.minQuantity >= MIN_WHOLESALE_QUANTITY &&
    Number.isInteger(tier.priceCents) &&
    tier.priceCents > 0 &&
    tier.priceCents < (salePriceCents ?? priceCents)
  )
}

export type AnnouncedWholesale = WholesaleTier & {
  // Rounded to whole percent; 0 for a cut under half a percent, which the
  // page then says without a percentage.
  readonly discountPercent: number
}

// The tier the storefront announces: exactly the one the cart applies (it
// undercuts the single-unit price, sale included), with the cut against
// that price. One rule, so a page never hides a tier the cart charges.
export function announcedWholesale(product: PricedProduct): AnnouncedWholesale | null {
  const tier = product.wholesale
  const single = singleUnitPriceCents(product)
  if (!tier || tier.priceCents >= single) return null

  return { ...tier, discountPercent: Math.round((1 - tier.priceCents / single) * PERCENT) }
}

// The wholesale unit price when `quantity` of the product are together in
// the cart, else null: how the cart tags a line and what the product page
// says with the cart's units counted in.
export function wholesaleUnitPriceAt(product: PricedProduct, quantity: number): number | null {
  const tier = announcedWholesale(product)
  return tier && quantity >= tier.minQuantity ? tier.priceCents : null
}
