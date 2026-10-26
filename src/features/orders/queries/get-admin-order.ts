import { CARRIER_NAMES } from '@/config/delivery'
import { MANUAL_PICKUP_POINT_REF } from '@/config/delivery'
import { parseRequisitesSnapshot } from '@/config/requisites'
import {
  Carrier,
  DeliveryKind,
  PaymentRoute,
  type NotificationKind,
  type NotificationStatus,
  type OrderStatus,
} from '@/db/enums'
import { accountShortLabel, bankAccountService } from '@/features/billing'
import {
  canIssueWaybill,
  canRemoveWaybill,
  codCents,
  isCourierOrder,
  isSettledByRecipient,
  nameParts,
  parcelWeightGrams,
  recipientDraft,
  settlementOfLabel,
  type RecipientDraft,
  suggestedCargoDescription,
  waybillBlocker,
  WaybillBlocker,
} from '@/features/orders/model/shipment'
import { TRACKED_ORDER_STATUSES } from '@/features/orders/model/parcel-progress'
import { allowedNextStatuses } from '@/features/orders/model/status-flow'
import {
  orderRepository,
  type OrderItemRow,
  type OrderRow,
  type OrderTraffic,
  type ShippingAddress,
} from '@/features/orders/repository/order-repository'
import {
  carrierAccountRepository,
  carrierAccounts,
  isParcelStage,
  pickupDirectoryFor,
  waybillServiceFor,
  type CarrierAccount,
  type ParcelStage,
} from '@/features/shipping'
import { contactView, type ContactView } from '@/features/orders/model/contact-preference'
import { toUkrainianMsisdn } from '@/features/orders/model/phone'
import { isQuickOrder, QUICK_ORDER_POINT_REF } from '@/features/orders/model/quick-order'
import { notificationRepository } from '@/features/orders/repository/notification-repository'
import { formatDateTime } from '@/lib/datetime'
import { createMoney, Currency, formatMoney } from '@/lib/money'

export type AdminOrderLine = {
  readonly id: string
  readonly title: string
  readonly variantLabel: string
  readonly sku: string
  readonly quantity: number
  readonly unitPriceLabel: string
  readonly linePriceLabel: string
}

// A branch or locker as the recipient form shows it once chosen.
export type RecipientPoint = {
  readonly kind: typeof DeliveryKind.Branch | typeof DeliveryKind.Locker
  readonly pointRef: string
  readonly pointName: string
  readonly settlementName: string
}

// The recipient of this phone's previous order, offered on a quick order so
// a returning buyer is not asked for the same branch twice.
export type PreviousRecipient = RecipientPoint & {
  readonly orderNumber: string
  readonly firstName: string
  readonly lastName: string
}

// Where the parcel is, in the carrier's own words, as the hourly tracking
// last saw it.
export type AdminParcelView = {
  readonly stage: ParcelStage
  readonly statusText: string
  readonly updatedAt: string | null
}

// A cabinet a waybill is written from, as the admin tells them apart.
export type WaybillSenderView = {
  readonly id: string
  readonly name: string
  readonly senderName: string
  readonly isDefault: boolean
}

type SenderChoices = {
  // Cabinets a new waybill can be written from, the default first; empty
  // while the shop runs on the single cabinet from the environment.
  readonly senders: readonly WaybillSenderView[]
  // The branch every cabinet sends from, as the admin picked it.
  readonly senderBranchLabel: string | null
  // Who the existing waybill was written from: printing, tracking and
  // deleting go through that cabinet's key.
  readonly issuedFrom: WaybillSenderView | null
}

// The money on the waybill: the order total is declared, and a
// cash-on-delivery order has the carrier collect it less the prepayment.
export type WaybillPaymentView = {
  readonly paymentRoute: PaymentRoute
  readonly totalCents: number
  readonly prepaidCents: number
  // A cash-on-delivery order not yet sent or cancelled: its prepayment can
  // still change, on the issue form or under the written waybill.
  readonly isPrepaymentOpen: boolean
}

export type AdminWaybillView = SenderChoices & {
  readonly documentRef: string | null
  readonly blocker: WaybillBlocker | null
  // The admin has to settle who collects and where before a waybill: a
  // quick order after the call, a branch typed by hand or no longer known,
  // a name the carrier would not print.
  readonly mustSettleRecipient: boolean
  readonly recipient: RecipientDraft
  readonly previousRecipient: PreviousRecipient | null
  // Where the parcel goes now: correcting only the name keeps it chosen
  // instead of sending the admin back to the city and branch search.
  readonly currentPoint: RecipientPoint | null
  // What the buyer chose or typed, to find the same point by.
  readonly buyerPointLabel: string | null
  // A courier order issues its waybill to a door picked on the form.
  readonly isCourier: boolean
  // The street as the buyer typed it at checkout, for a courier order.
  readonly buyerAddress: string | null
  readonly canRemove: boolean
  // The lines' total; zero when the products carry no weight yet.
  readonly weightGrams: number
  readonly description: string
  readonly payment: WaybillPaymentView
}

export type TransferAccountView = {
  readonly label: string
  // False for an order placed before accounts were kept on the order: the
  // buyer then sees whichever account is active.
  readonly isFixed: boolean
}

export type AdminNotificationView = {
  readonly id: string
  readonly kind: NotificationKind
  readonly status: NotificationStatus
  readonly detail: string | null
  readonly at: string
}

export type AdminOrderView = {
  readonly id: string
  readonly orderNumber: string
  readonly placedAt: string
  readonly status: OrderStatus
  readonly allowedNextStatuses: readonly OrderStatus[]
  readonly email: string | null
  readonly paymentRoute: PaymentRoute
  readonly paymentProvider: string | null
  readonly paymentRef: string | null
  readonly paidAt: string | null
  readonly buyerCompany: string | null
  readonly invoiceNumber: string | null
  readonly customerNote: string | null
  // How the buyer wants the order confirmed, in the team's words, and a chat
  // with them when they asked for a messenger.
  readonly contact: ContactView
  // The channel the buyer came from; null when unknown (tracking refused,
  // or placed before the shop recorded it).
  readonly traffic: OrderTraffic | null
  // Which account the buyer was told to pay to: the one to watch for the
  // money, whichever account is active now.
  readonly transferAccount: TransferAccountView | null
  readonly carrier: Carrier | null
  readonly carrierName: string | null
  readonly trackingNumber: string | null
  readonly trackingUrl: string | null
  readonly parcel: AdminParcelView | null
  // The hourly tracking follows this order's number, so a status is coming
  // even if none has been seen yet.
  readonly isParcelTracked: boolean
  readonly deliveryKind: DeliveryKind
  readonly pickupPointLabel: string | null
  readonly address: ShippingAddress
  readonly subtotalLabel: string
  readonly shippingLabel: string
  readonly totalLabel: string
  // Shown only when the buyer sent part of a cash-on-delivery order ahead:
  // what came in and what the carrier collects.
  readonly prepaidLabel: string | null
  readonly codLabel: string | null
  readonly lines: readonly AdminOrderLine[]
  // Newest first: what the shop sent about this order and how it went.
  readonly notifications: readonly AdminNotificationView[]
  readonly waybill: AdminWaybillView
}

export async function getAdminOrder(orderId: string): Promise<AdminOrderView | null> {
  const order = await orderRepository.findById(orderId)
  if (!order) return null

  const items = await orderRepository.findItems(order.id)
  const [transferAccount, waybill, notifications] = await Promise.all([
    transferAccountOf(order),
    waybillViewOf(order, items),
    notificationRepository.listForOrder(order.id),
  ])
  const paymentRoute = order.paymentRoute as PaymentRoute

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    placedAt: formatDateTime(order.createdAt),
    status: order.status,
    allowedNextStatuses: allowedNextStatuses(order.status, paymentRoute),
    email: order.email,
    paymentRoute,
    paymentProvider: order.paymentProvider,
    paymentRef: order.paymentRef,
    paidAt: order.paidAt ? formatDateTime(order.paidAt) : null,
    buyerCompany: order.buyerCompany,
    invoiceNumber: order.invoiceNumber,
    customerNote: order.customerNote,
    contact: contactView(order.contactPreference, order.shippingAddress.phone),
    traffic: order.trafficSource
      ? { source: order.trafficSource, detail: order.trafficDetail }
      : null,
    transferAccount,
    carrier: order.carrier,
    carrierName: order.carrier ? CARRIER_NAMES[order.carrier] : null,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    parcel: parcelOf(order),
    isParcelTracked: isParcelTracked(order),
    deliveryKind: order.deliveryKind as DeliveryKind,
    pickupPointLabel: order.pickupPointLabel,
    address: order.shippingAddress,
    subtotalLabel: moneyLabel(order.subtotalCents),
    shippingLabel:
      order.shippingCents === 0 ? 'за тарифами перевізника' : moneyLabel(order.shippingCents),
    totalLabel: moneyLabel(order.totalCents),
    prepaidLabel: order.prepaidCents > 0 ? moneyLabel(order.prepaidCents) : null,
    codLabel: order.prepaidCents > 0 ? moneyLabel(codCents(order)) : null,
    lines: items.map(lineView),
    notifications: notifications.map((row) => ({
      id: row.id,
      kind: row.kind,
      status: row.status,
      detail: row.detail,
      at: formatDateTime(row.createdAt),
    })),
    waybill,
  }
}

async function waybillViewOf(
  order: OrderRow,
  items: readonly OrderItemRow[],
): Promise<AdminWaybillView> {
  const carrier = order.carrier ?? Carrier.NovaPost
  const [blocker, senderChoices, currentPoint] = await Promise.all([
    waybillBlockerOf(order, carrier),
    senderChoicesOf(order, carrier),
    order.carrierDocumentRef ? null : currentPointOf(order, carrier),
  ])
  const mustSettleRecipient = isSettledByRecipient(blocker)

  return {
    ...senderChoices,
    documentRef: order.carrierDocumentRef,
    blocker,
    canRemove: order.carrierDocumentRef !== null && canRemoveWaybill(order.status),
    weightGrams: parcelWeightGrams(items),
    description: suggestedCargoDescription(items),
    payment: {
      paymentRoute: order.paymentRoute as PaymentRoute,
      totalCents: order.totalCents,
      prepaidCents: order.prepaidCents,
      isPrepaymentOpen:
        order.paymentRoute === PaymentRoute.CashOnDelivery && canIssueWaybill(order.status),
    },
    mustSettleRecipient,
    recipient: recipientDraft(order),
    previousRecipient: mustSettleRecipient ? await previousRecipientOf(order, carrier) : null,
    currentPoint,
    buyerPointLabel: isQuickOrder(order.pickupPointRef) ? null : order.pickupPointLabel,
    isCourier: isCourierOrder(order),
    buyerAddress: isCourierOrder(order) ? typedAddress(order.shippingAddress) : null,
  }
}

// The account the buyer was told to pay to. An order placed before accounts
// were kept on it shows the active one — the same account the buyer's page
// falls back to — marked as such.
async function transferAccountOf(order: OrderRow): Promise<TransferAccountView | null> {
  if (order.paymentRoute !== PaymentRoute.BankTransfer) return null

  const fixed = parseRequisitesSnapshot(order.bankRequisites)
  if (fixed) return { label: accountShortLabel(fixed), isFixed: true }

  const active = await bankAccountService.active()
  return active ? { label: accountShortLabel(active), isFixed: false } : null
}

function lineView(item: OrderItemRow): AdminOrderLine {
  return {
    id: item.id,
    title: item.productTitle,
    variantLabel: item.variantLabel,
    sku: item.sku,
    quantity: item.quantity,
    unitPriceLabel: moneyLabel(item.unitPriceCents),
    linePriceLabel: moneyLabel(item.unitPriceCents * item.quantity),
  }
}

function moneyLabel(cents: number): string {
  return formatMoney(createMoney(cents, Currency.Uah))
}

// Cabinets are listed only for an order that can still take a new waybill;
// one that has a waybill needs only the cabinet it was written from.
async function senderChoicesOf(order: OrderRow, carrier: Carrier): Promise<SenderChoices> {
  const canTakeWaybill = !order.carrierDocumentRef && canIssueWaybill(order.status)
  const [accounts, warehouse, issuer] = await Promise.all([
    canTakeWaybill ? carrierAccounts.listActive(carrier) : [],
    carrierAccounts.readWarehouse(),
    order.carrierAccountId ? carrierAccountRepository.findById(order.carrierAccountId) : null,
  ])

  return {
    senders: accounts.map(senderView),
    senderBranchLabel: warehouse?.label ?? null,
    issuedFrom: issuer ? senderView(issuer) : null,
  }
}

function senderView(account: CarrierAccount): WaybillSenderView {
  return {
    id: account.id,
    name: account.name,
    senderName: account.senderName,
    isDefault: account.isDefault,
  }
}

// The pure rules first; then the directory, so an order pointing at a point
// it no longer knows asks for a new choice here rather than failing on the
// waybill button.
async function waybillBlockerOf(order: OrderRow, carrier: Carrier): Promise<WaybillBlocker | null> {
  if (!waybillServiceFor(carrier).isConfigured()) return WaybillBlocker.NotConfigured

  const blocker = waybillBlocker(order)
  if (blocker !== null || order.carrierDocumentRef || !order.pickupPointRef) return blocker

  const point = await pickupDirectoryFor(carrier).findPickupPoint(order.pickupPointRef)
  return point && point.kind === order.deliveryKind ? null : WaybillBlocker.UnknownPoint
}

function parcelOf(order: OrderRow): AdminParcelView | null {
  if (!isParcelStage(order.parcelStage)) return null
  return {
    stage: order.parcelStage,
    statusText: order.parcelStatus ?? '',
    updatedAt: order.parcelUpdatedAt ? formatDateTime(order.parcelUpdatedAt) : null,
  }
}

function isParcelTracked(order: OrderRow): boolean {
  return (
    order.carrier === Carrier.NovaPost &&
    order.trackingNumber !== null &&
    TRACKED_ORDER_STATUSES.includes(order.status)
  )
}

function typedAddress(address: ShippingAddress): string {
  return [address.line1, address.line2, address.city].filter(Boolean).join(', ')
}

// A returning buyer's last few orders are enough to find a branch that is
// still open.
const PREVIOUS_ORDERS_CHECKED = 5

// The order's own branch or locker while the carrier still knows it; a quick
// order's placeholder or a point typed by hand has nothing to offer.
async function currentPointOf(order: OrderRow, carrier: Carrier): Promise<RecipientPoint | null> {
  const ref = order.pickupPointRef
  if (!ref || ref === QUICK_ORDER_POINT_REF || ref === MANUAL_PICKUP_POINT_REF) return null

  const settlementName = settlementOfLabel(order.pickupPointLabel)
  const point = await pickupDirectoryFor(carrier).findPickupPoint(ref)
  if (!point || point.kind === DeliveryKind.Courier || !settlementName) return null

  return { kind: point.kind, pointRef: point.ref, pointName: point.name, settlementName }
}

async function previousRecipientOf(
  order: OrderRow,
  carrier: Carrier,
): Promise<PreviousRecipient | null> {
  const phone = toUkrainianMsisdn(order.shippingAddress.phone ?? '')
  if (!phone) return null

  const candidates = await orderRepository.findEarlierPointOrdersByPhone(phone, {
    placedBefore: order.createdAt,
    excludeOrderId: order.id,
    placeholderRefs: [QUICK_ORDER_POINT_REF, MANUAL_PICKUP_POINT_REF],
    limit: PREVIOUS_ORDERS_CHECKED,
  })
  const refs = [...new Set(candidates.flatMap((candidate) => candidate.pickupPointRef ?? []))]
  const points = await pickupDirectoryFor(carrier).findPickupPointsByRefs(refs)
  const pointByRef = new Map(points.map((point) => [point.ref, point]))

  // The newest order whose branch is still open: an offer the carrier would
  // refuse is worse than none.
  for (const candidate of candidates) {
    const point = pointByRef.get(candidate.pickupPointRef ?? '')
    const settlementName = settlementOfLabel(candidate.pickupPointLabel)
    if (!point || point.kind === DeliveryKind.Courier || !settlementName) continue

    return {
      orderNumber: candidate.orderNumber,
      ...nameParts(candidate.fullName),
      kind: point.kind,
      pointRef: point.ref,
      pointName: point.name,
      settlementName,
    }
  }
  return null
}
