import { dropUnitPriceCents } from '@/features/catalog/model/pricing'

// A partner's order, placed by the admin: the partner buys at the drop price
// and resells under their own name (owner, 05.11.2026).

const KOPIYKY_PER_HRYVNIA = 100

// A price agreed apart from the card (a special deal) is typed in whole
// hryvnias, as the owner quotes it.
export function isWholeHryvniaPrice(priceCents: number): boolean {
  return Number.isInteger(priceCents) && priceCents > 0 && priceCents % KOPIYKY_PER_HRYVNIA === 0
}

export type PartnerPricedVariant = {
  readonly dropPriceCents: number | null
  readonly priceDeltaCents: number
}

// What the partner pays for one unit: the agreed price when the admin typed
// one, else the card's drop price with the variant's surcharge; null when
// there is neither.
export function partnerUnitPriceCents(
  variant: PartnerPricedVariant,
  agreedPriceCents: number | null,
): number | null {
  if (agreedPriceCents !== null) return agreedPriceCents
  if (variant.dropPriceCents === null) return null
  return dropUnitPriceCents(variant.dropPriceCents, variant.priceDeltaCents)
}
