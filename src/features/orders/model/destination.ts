import { MANUAL_PICKUP_POINT_REF } from '@/config/delivery'
import { DeliveryKind } from '@/db/enums'
import { isQuickOrder } from '@/features/orders/model/quick-order'

// Where the parcel is going, as the orders list prints it. A branch the
// carrier still knows needs no explanation; everything else is work waiting
// for the admin, and the list says which kind.
export const DestinationKind = {
  Branch: 'branch',
  Courier: 'courier',
  // Phone-only order: the branch is settled on the call.
  Quick: 'quick',
  // Typed into the order by hand, so the carrier cannot be asked about it.
  Manual: 'manual',
  // A branch the carrier's directory no longer knows: an address from the
  // old shop, or a point that has since closed.
  UnknownBranch: 'unknown_branch',
} as const

export type DestinationKind = (typeof DestinationKind)[keyof typeof DestinationKind]

export type OrderDestination = {
  readonly kind: DestinationKind
  // What a human reads beside the mark: the carrier's own name of the
  // branch, or the street of a courier order.
  readonly label: string | null
}

export type AddressedOrder = {
  readonly deliveryKind: string
  readonly pickupPointRef: string | null
  readonly pickupPointLabel: string | null
  readonly shippingAddress: { readonly city: string; readonly line1: string }
}

// «Відділення №30 (до 30 кг на одне місце): вул. Будівельників, 18/6» — the
// carrier writes the weight limit into the name of every branch, and in a
// table it costs the half of the line that says where the parcel goes.
const WEIGHT_NOTE = /\s*\([^)]*кг[^)]*\)/gi

export function shortenPointLabel(label: string | null): string | null {
  if (!label) return null
  const short = label.replace(WEIGHT_NOTE, '').replace(/\s+/g, ' ').trim()
  return short === '' ? null : short
}

export function orderDestination(order: AddressedOrder): OrderDestination {
  if (order.deliveryKind === DeliveryKind.Courier) {
    return { kind: DestinationKind.Courier, label: streetLabel(order) }
  }
  if (!order.pickupPointRef || isQuickOrder(order.pickupPointRef)) {
    return { kind: DestinationKind.Quick, label: null }
  }
  if (order.pickupPointRef === MANUAL_PICKUP_POINT_REF) {
    return { kind: DestinationKind.Manual, label: shortenPointLabel(order.pickupPointLabel) }
  }

  return { kind: DestinationKind.Branch, label: shortenPointLabel(order.pickupPointLabel) }
}

// The directory is not something a pure rule can read, so the list asks it
// once for the whole page and marks the branches it did not find.
export function destinationWithPoint(
  destination: OrderDestination,
  isPointKnown: boolean,
): OrderDestination {
  return destination.kind === DestinationKind.Branch && !isPointKnown
    ? { ...destination, kind: DestinationKind.UnknownBranch }
    : destination
}

function streetLabel(order: AddressedOrder): string | null {
  const parts = [order.shippingAddress.line1, order.shippingAddress.city].filter(
    (part) => part.trim() !== '',
  )
  return parts.length > 0 ? parts.join(', ') : null
}
