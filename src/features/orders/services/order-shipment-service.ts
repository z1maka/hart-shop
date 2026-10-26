import { after } from 'next/server'
import { Carrier, OrderStatus, type DeliveryKind } from '@/db/enums'
import {
  buildDoorWaybillRequest,
  buildWaybillRequest,
  canIssueWaybill,
  codCents,
  parcelWeightGrams,
  prepaymentProblem,
  suggestedCargoDescription,
  waybillReadiness,
  WaybillReadiness,
  canRemoveWaybill,
  doorAddressLines,
  isChosenCabinetUsable,
  pickupPointLabel,
  WAYBILL_ISSUABLE_STATUSES,
  waybillBlocker,
  WaybillBlocker,
  type DoorDelivery,
  type DoorNames,
  type ParcelInput,
} from '@/features/orders/model/shipment'
import { toPackingItem } from '@/features/orders/model/notification-format'
import { orderTelegram } from '@/features/orders/services/order-telegram'
import { canTransition } from '@/features/orders/model/status-flow'
import {
  orderRepository,
  type OrderRow,
  type PrepaidChange,
  type ShippingAddress,
} from '@/features/orders/repository/order-repository'
import {
  cabinetServiceFor,
  pickupDirectoryFor,
  waybillServiceFor,
  type Waybill,
  type WaybillRequest,
  type WaybillService,
} from '@/features/shipping'
import { env } from '@/lib/env'
import {
  AppError,
  CarrierAccountUnavailableError,
  OrderNotFoundError,
  PickupPointNotFoundError,
  PrepaymentChangedError,
  PrepaymentNotAllowedError,
  WaybillAlreadyIssuedError,
  WaybillLockedError,
  WaybillMissingError,
  WaybillNotIssuableError,
  WaybillOrderClosedError,
} from '@/lib/errors'
import { logger } from '@/lib/logger'

export type IssuedWaybill = {
  readonly number: string
  // Whether issuing it also moved the order to Packed.
  readonly packed: boolean
}

// Settled with the buyer over the phone: who collects the parcel and where.
export type RecipientSettlement = {
  readonly firstName: string
  readonly lastName: string
  readonly phone: string
  readonly kind: typeof DeliveryKind.Branch | typeof DeliveryKind.Locker
  readonly pointRef: string
  readonly settlementName: string
}

// A courier order's door as picked in the admin, with the names to show.
export type CourierDoor = DoorDelivery & DoorNames

// Who issues, from which cabinet (none takes the default one) and, for a
// cash-on-delivery order, the prepayment typed on the form; none typed keeps
// the saved one.
export type WaybillIssueRequest = {
  readonly issuedBy: string
  readonly accountId?: string | null
  readonly prepaidCents?: number
}

// One order's share of the daily round. The three endings are told apart by
// `kind`, so the panel never has to guess whether a code names a gap in the
// order or a refusal from the carrier.
export type WaybillBatchOutcome = { readonly orderNumber: string } & (
  | { readonly kind: 'issued'; readonly waybillNumber: string }
  | { readonly kind: 'not-ready'; readonly readiness: WaybillReadiness }
  | { readonly kind: 'failed'; readonly errorCode: string }
)

// Whatever went wrong had no domain code of its own.
const UNKNOWN_ERROR_CODE = 'UNKNOWN'

export type WaybillLabel = {
  readonly number: string
  readonly pdf: ArrayBuffer
}

export const orderShipmentService = {
  async issueWaybill(
    orderId: string,
    parcel: ParcelInput,
    issuing: WaybillIssueRequest,
  ): Promise<IssuedWaybill> {
    const order = withPrepayment(await findOrder(orderId), issuing.prepaidCents)
    const request = buildWaybillRequest(order, parcel)
    return issue(order, {
      request,
      issuedBy: issuing.issuedBy,
      accountId: issuing.accountId ?? null,
      shippingAddress: null,
    })
  },

  async issueCourierWaybill(
    orderId: string,
    parcel: ParcelInput,
    delivery: WaybillIssueRequest & { readonly door: CourierDoor },
  ): Promise<IssuedWaybill> {
    const order = withPrepayment(await findOrder(orderId), delivery.prepaidCents)
    const request = buildDoorWaybillRequest(order, parcel, delivery.door)
    const shippingAddress = { ...order.shippingAddress, ...doorAddressLines(delivery.door) }
    return issue(order, {
      request,
      issuedBy: delivery.issuedBy,
      accountId: delivery.accountId ?? null,
      shippingAddress,
    })
  },

  // The daily round: one waybill after another, each with the weight and the
  // description the order's own form would have offered. A refusal stops that
  // order alone.
  async issueWaybillBatch(
    orderIds: readonly string[],
    issuedBy: string,
  ): Promise<WaybillBatchOutcome[]> {
    const outcomes: WaybillBatchOutcome[] = []
    for (const orderId of orderIds) {
      outcomes.push(await issueOne(orderId, issuedBy))
    }
    return outcomes
  },

  async settleRecipient(orderId: string, recipient: RecipientSettlement): Promise<void> {
    const order = await findOrder(orderId)
    if (order.carrierDocumentRef) throw new WaybillAlreadyIssuedError(orderId)
    if (!canIssueWaybill(order.status)) throw new WaybillOrderClosedError(orderId, order.status)

    const carrier = order.carrier ?? Carrier.NovaPost
    const point = await pickupDirectoryFor(carrier).findPickupPoint(recipient.pointRef)
    if (!point || point.kind !== recipient.kind) {
      throw new PickupPointNotFoundError(recipient.pointRef)
    }

    const label = pickupPointLabel(point.name, recipient.settlementName)
    const isSettled = await orderRepository.settleRecipient(
      orderId,
      {
        carrier,
        shippingAddress: {
          ...order.shippingAddress,
          fullName: `${recipient.firstName} ${recipient.lastName}`,
          phone: recipient.phone,
          line1: '',
          city: label,
        },
        deliveryKind: recipient.kind,
        pickupPointRef: point.ref,
        pickupPointLabel: label,
      },
      WAYBILL_ISSUABLE_STATUSES,
    )
    if (!isSettled) throw await refusalOf(orderId)
    logger.info('Order recipient settled', { orderId, pointRef: point.ref })
  },

  async removeWaybill(orderId: string): Promise<void> {
    const order = await findOrder(orderId)
    const ref = order.carrierDocumentRef
    if (!order.carrier || !ref) throw new WaybillMissingError(orderId)
    if (!canRemoveWaybill(order.status)) throw new WaybillLockedError(orderId, order.status)

    logger.info('Removing waybill', { orderId, carrier: order.carrier, ref })
    const { service } = await cabinetServiceFor(order.carrier, order.carrierAccountId)
    await service.remove(ref)
    try {
      await orderRepository.detachWaybill(orderId, ref)
    } catch (error) {
      logger.error('Waybill deleted in the cabinet but still on the order', {
        orderId,
        ref,
        error,
      })
      throw error
    }
  },

  // Money a cash-on-delivery buyer sent ahead after the waybill was written:
  // the carrier collects only the rest, so the waybill takes the new amount
  // first. Before the waybill the prepayment is typed on the issue form.
  async setPrepayment(orderId: string, prepaidCents: number): Promise<void> {
    const order = await findOrder(orderId)
    const ref = order.carrierDocumentRef
    if (!order.carrier || !ref) throw new WaybillMissingError(orderId)
    const problem = prepaymentProblem(order, prepaidCents)
    if (problem) throw new PrepaymentNotAllowedError(orderId, problem)
    if (!canIssueWaybill(order.status)) throw new WaybillOrderClosedError(orderId, order.status)
    if (prepaidCents === order.prepaidCents) return

    const { service } = await cabinetServiceFor(order.carrier, order.carrierAccountId)
    await service.updateCod(ref, codCents({ ...order, prepaidCents }), order.createdAt)
    await savePrepaidAfterCarrier(orderId, {
      prepaidCents,
      previousPrepaidCents: order.prepaidCents,
      carrierDocumentRef: ref,
    })
    logger.info('Order prepayment saved', { orderId, prepaidCents, ref })
  },

  async labelPdf(orderId: string): Promise<WaybillLabel> {
    const order = await findOrder(orderId)
    if (!order.carrier || !order.carrierDocumentRef || !order.trackingNumber) {
      throw new WaybillMissingError(orderId)
    }

    const { service } = await cabinetServiceFor(order.carrier, order.carrierAccountId)
    const pdf = await service.labelPdf(order.trackingNumber)
    return { number: order.trackingNumber, pdf }
  },
}

async function issueOne(orderId: string, issuedBy: string): Promise<WaybillBatchOutcome> {
  const order = await findOrder(orderId)
  const items = await orderRepository.findItems(orderId)
  const parcel = {
    weightGrams: parcelWeightGrams(items),
    description: suggestedCargoDescription(items),
  }
  const readiness = waybillReadiness(order, parcel.weightGrams)
  if (readiness !== WaybillReadiness.Ready) {
    return { orderNumber: order.orderNumber, kind: 'not-ready', readiness }
  }

  try {
    const issued = await orderShipmentService.issueWaybill(orderId, parcel, { issuedBy })
    return { orderNumber: order.orderNumber, kind: 'issued', waybillNumber: issued.number }
  } catch (error) {
    logger.error('Waybill in the daily round failed', { orderId, error })
    return {
      orderNumber: order.orderNumber,
      kind: 'failed',
      errorCode: error instanceof AppError ? error.code : UNKNOWN_ERROR_CODE,
    }
  }
}

async function findOrder(orderId: string): Promise<OrderRow> {
  const order = await orderRepository.findById(orderId)
  if (!order) throw new OrderNotFoundError(orderId)
  return order
}

// Why a conditional write matched nothing: someone else issued the waybill,
// or the order was sent or cancelled while this click was on its way.
async function refusalOf(orderId: string): Promise<Error> {
  const current = await findOrder(orderId)
  if (current.carrierDocumentRef) return new WaybillAlreadyIssuedError(orderId)
  return new WaybillOrderClosedError(orderId, current.status)
}

// The prepayment typed on the issue form goes into the waybill's cash on
// delivery and is saved with the waybill; none typed keeps the saved one.
function withPrepayment(order: OrderRow, prepaidCents: number | undefined): OrderRow {
  if (prepaidCents === undefined || prepaidCents === order.prepaidCents) return order
  const problem = prepaymentProblem(order, prepaidCents)
  if (problem) throw new PrepaymentNotAllowedError(order.id, problem)
  return { ...order, prepaidCents }
}

// The carrier already holds the new amount, so an order that did not take
// it is logged as the mismatch it is, for the admin to settle.
async function savePrepaidAfterCarrier(orderId: string, change: PrepaidChange): Promise<void> {
  try {
    if (await orderRepository.setPrepaid(orderId, change)) return
    throw await prepaymentRefusalOf(orderId, change.carrierDocumentRef)
  } catch (error) {
    logger.error('Waybill took the new cash-on-delivery amount, the order did not', {
      orderId,
      ...change,
      error,
    })
    throw error
  }
}

// Why the order did not take the change: its waybill is another one or
// gone, or another save changed the prepayment first.
async function prepaymentRefusalOf(orderId: string, ref: string): Promise<Error> {
  const current = await findOrder(orderId)
  if (current.carrierDocumentRef === ref) return new PrepaymentChangedError(orderId)
  if (current.carrierDocumentRef) return new WaybillAlreadyIssuedError(orderId)
  return new WaybillMissingError(orderId)
}

type Issue = {
  readonly request: WaybillRequest | null
  readonly issuedBy: string
  // Which cabinet to issue from; null takes the default one.
  readonly accountId: string | null
  // A courier order's door replaces the typed address once the waybill exists.
  readonly shippingAddress: ShippingAddress | null
}

async function issue(order: OrderRow, details: Issue): Promise<IssuedWaybill> {
  if (order.carrierDocumentRef) throw new WaybillAlreadyIssuedError(order.id)

  const carrier = order.carrier ?? Carrier.NovaPost
  // A cabinet chosen for this order, or the default one; after this the
  // document belongs to it for printing, tracking and deletion.
  const { service, account } = await cabinetServiceFor(carrier, details.accountId)
  if (details.accountId && !isChosenCabinetUsable(details.accountId, account)) {
    throw new CarrierAccountUnavailableError(details.accountId)
  }
  if (!service.isConfigured()) {
    throw new WaybillNotIssuableError(order.id, WaybillBlocker.NotConfigured)
  }
  if (!details.request) {
    const blocker = waybillBlocker(order)
    if (blocker === WaybillBlocker.Status) throw new WaybillOrderClosedError(order.id, order.status)
    throw new WaybillNotIssuableError(order.id, blocker ?? 'unknown')
  }

  const waybill = await service.create(details.request)
  // Logged before anything else can fail: this is the only trace of a
  // document that now exists in the cabinet.
  logger.info('Waybill created', {
    orderId: order.id,
    carrier,
    ref: waybill.ref,
    issuedBy: details.issuedBy,
  })

  // A waybill exists once the box is closed, so the order is packed —
  // unless it is already past that and only getting a fresh label.
  const packed = canTransition(order.status, OrderStatus.Packed)
  const shippingAddress = details.shippingAddress
  await attachOrUndo(order, {
    carrier,
    carrierAccountId: account?.id ?? null,
    service,
    waybill,
    packed,
    shippingAddress,
  })
  announce(order, waybill)
  return { number: waybill.number, packed }
}

type Attachment = {
  readonly carrier: Carrier
  readonly carrierAccountId: string | null
  readonly service: WaybillService
  readonly waybill: Waybill
  readonly packed: boolean
  readonly shippingAddress: ShippingAddress | null
}

// A document the order does not point at would sit in the cabinet with the
// buyer's cash-on-delivery amount on it, so it is withdrawn when the order
// cannot take it — another click was first, or the database failed.
async function attachOrUndo(order: OrderRow, attachment: Attachment): Promise<void> {
  const { carrier, carrierAccountId, service, waybill, packed, shippingAddress } = attachment
  try {
    const isAttached = await orderRepository.attachWaybill(
      order.id,
      {
        carrier,
        carrierAccountId,
        trackingNumber: waybill.number,
        trackingUrl: waybill.trackingUrl,
        carrierDocumentRef: waybill.ref,
        prepaidCents: order.prepaidCents,
        status: packed ? OrderStatus.Packed : null,
        shippingAddress,
      },
      WAYBILL_ISSUABLE_STATUSES,
    )
    if (!isAttached) throw await refusalOf(order.id)
  } catch (error) {
    logger.error('Waybill could not be attached; withdrawing it', {
      orderId: order.id,
      ref: waybill.ref,
      error,
    })
    await withdraw(service, waybill.ref, order.id)
    throw error
  }
}

async function withdraw(service: WaybillService, ref: string, orderId: string): Promise<void> {
  try {
    await service.remove(ref)
  } catch (error) {
    logger.error('Orphan waybill left in the cabinet — delete it by hand', {
      orderId,
      ref,
      error,
    })
  }
}

// The packing chat hears about the waybill after the admin has the answer:
// Telegram being slow must not hold the button.
function announce(order: OrderRow, waybill: Waybill): void {
  const tell = async () => {
    await sendCard(order, waybill)
    await sendLabel(order, waybill)
  }

  try {
    // Inside a request the packing chat is told after the admin has their
    // answer; a cron or a script has no request to come after, and there the
    // work simply runs.
    after(tell)
  } catch {
    void tell()
  }
}

// A failed card must not cost the packer the label that follows it.
async function sendCard(order: OrderRow, waybill: Waybill): Promise<void> {
  try {
    const sources = await orderRepository.findPackingSources(order.id)
    await orderTelegram.sendWaybillIssued({
      orderId: order.id,
      orderNumber: order.orderNumber,
      waybillNumber: waybill.number,
      items: sources.map(toPackingItem),
    })
  } catch (error) {
    logger.error('Waybill card for the packing chat failed', {
      orderId: order.id,
      number: waybill.number,
      error,
    })
  }
}

// The label goes to the packing chat right after the card; a chat without a
// label still has the card and the admin's print button.
async function sendLabel(order: OrderRow, waybill: Waybill): Promise<void> {
  if (!env.TELEGRAM_WAYBILL_CHAT_ID) return

  try {
    const pdf = await waybillServiceFor(order.carrier ?? Carrier.NovaPost).labelPdf(waybill.number)
    await orderTelegram.sendWaybillLabel({
      orderId: order.id,
      orderNumber: order.orderNumber,
      waybillNumber: waybill.number,
      pdf,
    })
  } catch (error) {
    logger.error('Waybill label for the packing chat failed', {
      orderId: order.id,
      number: waybill.number,
      error,
    })
  }
}
