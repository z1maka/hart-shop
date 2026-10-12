import { Carrier, DeliveryKind } from '@/db/enums'

// Which ways of receiving a parcel each carrier offers. Configuration rather
// than logic, and it lives here because the checkout form needs it in the
// browser — importing a feature barrel from a client component drags the
// database in with it.
export const DELIVERY_KINDS_BY_CARRIER: Record<Carrier, readonly DeliveryKind[]> = {
  [Carrier.NovaPost]: [DeliveryKind.Branch, DeliveryKind.Locker, DeliveryKind.Courier],
}

// Display names for order pages, mail and the admin.
export const CARRIER_NAMES: Record<Carrier, string> = {
  [Carrier.NovaPost]: 'Нова Пошта',
}

export function deliveryKindsFor(carrier: Carrier): readonly DeliveryKind[] {
  return DELIVERY_KINDS_BY_CARRIER[carrier]
}

export function supportsDeliveryKind(carrier: Carrier, kind: DeliveryKind): boolean {
  return deliveryKindsFor(carrier).includes(kind)
}

export function defaultDeliveryKind(carrier: Carrier): DeliveryKind {
  const [first] = deliveryKindsFor(carrier)
  if (!first) throw new Error(`Carrier ${carrier} has no delivery kind`)

  return first
}

// A pick-up point needs no street: the carrier's own identifier is the address.
export function needsStreetAddress(kind: DeliveryKind): boolean {
  return kind === DeliveryKind.Courier
}

// The point a buyer typed by hand while the carrier's directory was down: a
// label, not an id the carrier knows, so its waybill is made in the cabinet.
export const MANUAL_PICKUP_POINT_REF = 'manual'

// What a waybill created from the admin accepts: one box, the carrier's own
// parcel ceiling, and the length of the contents line it prints.
export const WAYBILL_PARCEL_GRAMS = { min: 100, max: 30_000 } as const
export const WAYBILL_DESCRIPTION_MAX_LENGTH = 100

// What the product pages tell Google about delivery, kept to the Merchant
// Center shipping rule «2 days-paid»: 0–2 business days in total. The shop
// dispatches the same or the next day («Відправка щодня»).
export const DISPATCH_DAYS = { min: 0, max: 1 } as const
export const TRANSIT_DAYS = { min: 0, max: 1 } as const

// The same rule's cost by parcel weight, as entered in Merchant Center on
// 30.09.2026. The buyer pays the carrier on receipt, so these are Nova
// Poshta's branch-to-branch tariffs (in force from 10.09.2026) rounded up to
// cover the declared-value fee: Google accepts an overestimate, never less.
// The markup and Merchant Center must say the same — change both together.
export const SHIPPING_RATE_TIERS = [
  { maxGrams: 2_000, rateCents: 10_000 },
  { maxGrams: 10_000, rateCents: 15_000 },
] as const
export const SHIPPING_RATE_ABOVE_TIERS_CENTS = 22_000

// Kopecks; null for a product without a weight, which the rule cannot price.
export function shippingRateCentsFor(weightGrams: number): number | null {
  if (weightGrams <= 0) return null

  const tier = SHIPPING_RATE_TIERS.find((candidate) => weightGrams <= candidate.maxGrams)

  return tier ? tier.rateCents : SHIPPING_RATE_ABOVE_TIERS_CENTS
}

// The owner packs every order within two hours of it arriving (19.09.2026):
// after that the order shows as packed on its own, without the admin.
export const AUTO_PACK_AFTER_HOURS = 2

// A phone-only order nobody has called back within this time is put in
// front of the team in the orders chat, once.
export const QUICK_ORDER_CALL_REMINDER_AFTER_HOURS = 2
