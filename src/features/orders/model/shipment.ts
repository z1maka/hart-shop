import { MANUAL_PICKUP_POINT_REF, WAYBILL_DESCRIPTION_MAX_LENGTH } from '@/config/delivery'
import { DeliveryKind, OrderStatus, PaymentRoute } from '@/db/enums'
import { toUkrainianMsisdn } from '@/features/orders/model/phone'
import { isQuickOrder } from '@/features/orders/model/quick-order'
import type { WaybillRecipient, WaybillRequest } from '@/features/shipping'

// Why the admin cannot issue the waybill from the order page.
export const WaybillBlocker = {
  QuickOrder: 'quick_order',
  ManualPoint: 'manual_point',
  // The order names a point the directory does not know: placed before the
  // directory moved to the carrier's own ids, or the point has since closed.
  UnknownPoint: 'unknown_point',
  Recipient: 'recipient',
  Status: 'status',
  NotConfigured: 'not_configured',
} as const

export type WaybillBlocker = (typeof WaybillBlocker)[keyof typeof WaybillBlocker]

// A waybill belongs to a parcel still in the shop: once handed to the
// carrier it is theirs to move, and a cancelled order never leaves.
export const WAYBILL_ISSUABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.Pending,
  OrderStatus.Paid,
  OrderStatus.Packed,
]

const ISSUABLE_STATUSES: ReadonlySet<string> = new Set(WAYBILL_ISSUABLE_STATUSES)

// Cancelling an unsent waybill is how a cancelled order is cleaned up in the
// cabinet; after the handover only the carrier can stop the parcel.
const REMOVABLE_STATUSES: ReadonlySet<string> = new Set([
  OrderStatus.Pending,
  OrderStatus.Paid,
  OrderStatus.Packed,
  OrderStatus.Cancelled,
])

// What the admin clears on the order page by settling the recipient after
// the call; a courier order takes its recipient and street on the form of
// its own waybill instead.
const SETTLED_BY_RECIPIENT: ReadonlySet<WaybillBlocker | null> = new Set([
  WaybillBlocker.QuickOrder,
  WaybillBlocker.ManualPoint,
  WaybillBlocker.UnknownPoint,
  WaybillBlocker.Recipient,
])

// A name part without a single letter — the quick order's "—" — is a
// placeholder, not a name to offer back.
const LETTER = /\p{L}/u

const POINT_LABEL_SEPARATOR = ' · '

export type RecipientDraft = {
  readonly firstName: string
  readonly lastName: string
  readonly phone: string
}

export type ShippableOrder = {
  readonly orderNumber: string
  readonly status: string
  readonly deliveryKind: string
  readonly pickupPointRef: string | null
  readonly paymentRoute: string
  readonly totalCents: number
  readonly shippingAddress: { readonly fullName: string; readonly phone?: string }
}

export type ShippableItem = {
  readonly productTitle: string
  readonly quantity: number
  readonly weightGrams: number
}

export type ParcelInput = {
  readonly weightGrams: number
  readonly description: string
}

// A courier order's door, picked in the admin from the carrier's street
// directory; the recipient is confirmed on the same form.
export type DoorDelivery = {
  readonly firstName: string
  readonly lastName: string
  readonly phone: string
  readonly cityRef: string
  readonly streetRef: string
  readonly house: string
  readonly flat: string | null
}

export type DoorNames = {
  readonly cityName: string
  readonly streetName: string
}

export type DoorAddressLines = {
  readonly fullName: string
  readonly phone: string
  readonly line1: string
  readonly line2: string
  readonly city: string
}

export function canIssueWaybill(status: string): boolean {
  return ISSUABLE_STATUSES.has(status)
}

export function canRemoveWaybill(status: string): boolean {
  return REMOVABLE_STATUSES.has(status)
}

// The status comes first: a sent or cancelled order needs no waybill, so
// asking to settle its recipient or branch would be work for nothing.
export function waybillBlocker(order: ShippableOrder): WaybillBlocker | null {
  if (!canIssueWaybill(order.status)) return WaybillBlocker.Status
  return isCourierOrder(order) ? null : pickupBlocker(order)
}

// Whether the daily round can issue this order's waybill without opening it:
// a courier order needs its door picked on the form, and no carrier prices a
// parcel of unknown weight.
export const WaybillReadiness = {
  Ready: 'ready',
  Issued: 'issued',
  NoWeight: 'no_weight',
  // The order names a branch the carrier's directory does not know: an
  // address from the old shop, or a point that has since closed.
  UnknownPoint: 'unknown_point',
  Blocked: 'blocked',
} as const

export type WaybillReadiness = (typeof WaybillReadiness)[keyof typeof WaybillReadiness]

export function waybillReadiness(
  order: ShippableOrder & { readonly carrierDocumentRef: string | null },
  parcelWeightGrams: number,
): WaybillReadiness {
  if (order.carrierDocumentRef) return WaybillReadiness.Issued
  if (isCourierOrder(order) || waybillBlocker(order) !== null) return WaybillReadiness.Blocked
  if (parcelWeightGrams <= 0) return WaybillReadiness.NoWeight
  return WaybillReadiness.Ready
}

// The pure rules cannot see the directory, so the list asks it once for the
// whole page and refines what it found here.
export function readinessWithPoint(
  readiness: WaybillReadiness,
  isPointKnown: boolean,
): WaybillReadiness {
  return readiness === WaybillReadiness.Ready && !isPointKnown
    ? WaybillReadiness.UnknownPoint
    : readiness
}

export function isCourierOrder(order: ShippableOrder): boolean {
  return order.deliveryKind === DeliveryKind.Courier
}

export function isSettledByRecipient(blocker: WaybillBlocker | null): boolean {
  return SETTLED_BY_RECIPIENT.has(blocker)
}

export function recipientDraft(order: ShippableOrder): RecipientDraft {
  return { ...nameParts(order.shippingAddress.fullName), phone: order.shippingAddress.phone ?? '' }
}

export function nameParts(fullName: string): { firstName: string; lastName: string } {
  const [firstName = '', ...rest] = fullName
    .trim()
    .split(/\s+/)
    .filter((part) => LETTER.test(part))
  return { firstName, lastName: rest.join(' ') }
}

// The same label the checkout writes: the carrier's own name of the point
// already spells the street, the city makes it complete.
export function pickupPointLabel(pointName: string, settlementName: string): string {
  return `${pointName}${POINT_LABEL_SEPARATOR}${settlementName}`
}

// The city is the part after the last separator of a checkout label; older
// labels without one give nothing to offer back.
export function settlementOfLabel(label: string | null): string | null {
  if (!label) return null
  const separator = label.lastIndexOf(POINT_LABEL_SEPARATOR)
  return separator === -1 ? null : label.slice(separator + POINT_LABEL_SEPARATOR.length).trim()
}

export function parcelWeightGrams(items: readonly ShippableItem[]): number {
  return items.reduce((total, item) => total + item.weightGrams * item.quantity, 0)
}

// Typographic quotes and dashes come with the imported WordPress titles;
// Nova Poshta answers «Description is not valid» to a cargo description that
// carries them, and the whole waybill is refused.
const QUOTES = /[“”„«»"']/g
const DASHES = /[–—]/g
const NOT_ALLOWED = /[^\p{L}\p{N} .,+\-/№()]+/gu

// What the carrier prints as the contents: the first product's name, the
// way the owner has always typed it in the cabinet by hand.
export function suggestedCargoDescription(items: readonly ShippableItem[]): string {
  const title = (items[0]?.productTitle ?? '')
    .replace(QUOTES, '')
    .replace(DASHES, '-')
    .replace(NOT_ALLOWED, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return title.slice(0, WAYBILL_DESCRIPTION_MAX_LENGTH).trim()
}

// Cash on delivery is collected by the carrier and passed to the shop; a
// prepaid order carries no amount.
export function codCents(order: ShippableOrder): number {
  return order.paymentRoute === PaymentRoute.CashOnDelivery ? order.totalCents : 0
}

export function buildWaybillRequest(
  order: ShippableOrder,
  parcel: ParcelInput,
): WaybillRequest | null {
  const recipient = recipientOf(order)
  const pointRef = order.pickupPointRef
  if (!recipient || !pointRef || isCourierOrder(order) || waybillBlocker(order) !== null) {
    return null
  }

  return {
    ...parcelFields(order, parcel),
    recipient,
    destination: { kind: 'point', pointRef },
  }
}

export function buildDoorWaybillRequest(
  order: ShippableOrder,
  parcel: ParcelInput,
  door: DoorDelivery,
): WaybillRequest | null {
  const phone = toUkrainianMsisdn(door.phone)
  if (!phone || !isCourierOrder(order) || waybillBlocker(order) !== null) return null

  return {
    ...parcelFields(order, parcel),
    recipient: { firstName: door.firstName, lastName: door.lastName, phone },
    destination: {
      kind: 'door',
      cityRef: door.cityRef,
      streetRef: door.streetRef,
      house: door.house,
      flat: door.flat,
    },
  }
}

// What the order shows once the door is settled: the carrier's spelling of
// the street and the city in place of whatever the buyer typed.
export function doorAddressLines(door: DoorDelivery & DoorNames): DoorAddressLines {
  const flat = door.flat ? `, кв. ${door.flat}` : ''
  return {
    fullName: `${door.firstName} ${door.lastName}`,
    phone: door.phone,
    line1: `${door.streetName}, ${door.house}${flat}`,
    line2: '',
    city: door.cityName,
  }
}

function parcelFields(order: ShippableOrder, parcel: ParcelInput) {
  return {
    orderNumber: order.orderNumber,
    weightGrams: parcel.weightGrams,
    declaredValueCents: order.totalCents,
    codCents: codCents(order),
    description: parcel.description,
  }
}

function pickupBlocker(order: ShippableOrder): WaybillBlocker | null {
  if (!order.pickupPointRef || isQuickOrder(order.pickupPointRef)) {
    return WaybillBlocker.QuickOrder
  }
  if (order.pickupPointRef === MANUAL_PICKUP_POINT_REF) return WaybillBlocker.ManualPoint
  if (!recipientOf(order)) return WaybillBlocker.Recipient
  return null
}

// The checkout stores "First Last" as one line; the carrier wants them apart,
// and a lone word or a dash — the quick order's "—" — is not a name it will
// print. Read the same way as the editor's draft, so a name the editor would
// ask for never reaches the carrier.
function recipientOf(order: ShippableOrder): WaybillRecipient | null {
  const { firstName, lastName } = nameParts(order.shippingAddress.fullName)
  const phone = toUkrainianMsisdn(order.shippingAddress.phone ?? '')
  if (!firstName || !lastName || !phone) return null

  return { firstName, lastName, phone }
}

// A cabinet picked on the form must be the one that writes the waybill:
// falling back to another, or to one switched off since the page loaded,
// would put a different sender on the label. No pick takes the default.
export function isChosenCabinetUsable(
  chosenId: string | null,
  resolved: { readonly id: string; readonly isActive: boolean } | null,
): boolean {
  if (!chosenId) return true

  return resolved !== null && resolved.id === chosenId && resolved.isActive
}
