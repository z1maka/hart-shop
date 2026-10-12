import { wholesaleTierOf, wholesaleUnitPriceAt } from '@/features/catalog/model/pricing'

// What a cart line knows about its product's tier: the tier with the
// variant's own delta already folded into the price.
export type WholesaleLineInput = {
  readonly regularUnitPriceCents: number
  readonly wholesaleMinQty: number | null
  readonly wholesaleUnitPriceCents: number | null
}

export type WholesaleAhead = {
  readonly minQuantity: number
  readonly unitPriceCents: number
  readonly missing: number
}

function pricedOf(line: WholesaleLineInput) {
  return {
    priceCents: line.regularUnitPriceCents,
    salePriceCents: null,
    wholesale: wholesaleTierOf(line.wholesaleMinQty, line.wholesaleUnitPriceCents),
  }
}

// The line is at the wholesale price because the product's units in the
// cart, across its colours, have reached the tier.
export function isWholesaleLine(line: WholesaleLineInput, productQuantity: number): boolean {
  return wholesaleUnitPriceAt(pricedOf(line), productQuantity) !== null
}

// The tier still ahead of the cart, or null once reached or absent.
export function wholesaleAhead(line: WholesaleLineInput, productQuantity: number): WholesaleAhead | null {
  const tier = wholesaleTierOf(line.wholesaleMinQty, line.wholesaleUnitPriceCents)
  if (!tier || tier.priceCents >= line.regularUnitPriceCents) return null
  if (productQuantity >= tier.minQuantity) return null

  return {
    minQuantity: tier.minQuantity,
    unitPriceCents: tier.priceCents,
    missing: tier.minQuantity - productQuantity,
  }
}
