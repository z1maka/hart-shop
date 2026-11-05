import { randomBytes } from 'node:crypto'
import { OrderStatus, PaymentRoute, type Carrier, type DeliveryKind } from '@/db/enums'
import { bankAccountService, requisitesSnapshot } from '@/features/billing'
import { formatOrderNumber } from '@/features/orders/model/order-number'
import {
  dropshipOrderRepository,
  type PartnerLineRequest,
  type PlacedDropshipOrder,
} from '@/features/orders/repository/dropship-order-repository'
import {
  orderShippedNotice,
  type ShippedNoticeOutcome,
} from '@/features/orders/services/order-shipped-notice'
import {
  canTransition,
  recordsPayment,
  voidsLiveInvoice,
} from '@/features/orders/model/status-flow'
import { orderRepository } from '@/features/orders/repository/order-repository'
import {
  OrderNotFoundError,
  PaymentRouteUnavailableError,
  OrderTransitionError,
  ReturnNotOpenError,
  TrackingFromWaybillError,
} from '@/lib/errors'
import { waybillServiceFor } from '@/features/shipping'
import { logger } from '@/lib/logger'

// Both null when no message applies to the transition.
export type StatusChangeOutcome = ShippedNoticeOutcome

// A partner's order as the admin fills it in: who buys, who receives and
// where, and the lines.
export type DropshipOrderInput = {
  readonly resellerId: string
  readonly resellerOrderRef: string | null
  readonly recipient: { readonly fullName: string; readonly phone: string }
  readonly deliveryKind: DeliveryKind
  // A branch or locker; null for a courier, who goes by the address.
  readonly pickupPoint: {
    readonly ref: string
    readonly label: string
    readonly settlementName: string
  } | null
  readonly courierAddress: {
    readonly city: string
    readonly line1: string
    readonly line2: string | null
  } | null
  readonly lines: readonly PartnerLineRequest[]
}

const ACCESS_TOKEN_BYTES = 24
const COUNTRY = 'UA'

export const orderAdminService = {
  async changeStatus(orderId: string, next: OrderStatus): Promise<StatusChangeOutcome> {
    const order = await orderRepository.findById(orderId)
    if (!order) throw new OrderNotFoundError(orderId)

    if (!canTransition(order.status, next)) {
      throw new OrderTransitionError(order.status, next)
    }

    // A transfer order is marked paid by hand when the money arrives; a COD
    // order is paid the moment the carrier hands it over, so Delivered stamps
    // the payment on its own. An already-recorded date is never overwritten.
    const shouldStampPayment =
      recordsPayment(order.paymentRoute as PaymentRoute, next) && !order.paidAt
    const paidAt = shouldStampPayment ? new Date() : undefined
    if (voidsLiveInvoice(next, order.paidAt)) {
      await orderRepository.cancelVoidingInvoice(orderId)
    } else {
      await orderRepository.updateStatus(orderId, next, paidAt)
    }
    logger.info('Order status changed by admin', { orderId, from: order.status, to: next })

    if (next !== OrderStatus.Shipped) return { mailSent: null, smsSent: null }

    return orderShippedNotice.send({ ...order, status: next })
  },

  // Placed by the admin for a partner: paid by transfer against the active
  // account, numbered with the site's orders, and silent — the recipient is
  // the partner's customer, so no mail, SMS or ad conversion follows.
  async createDropshipOrder(
    input: DropshipOrderInput,
    createdBy: string,
  ): Promise<PlacedDropshipOrder> {
    const account = await bankAccountService.active()
    if (!account) throw new PaymentRouteUnavailableError(PaymentRoute.BankTransfer)

    const order = await dropshipOrderRepository.create({
      orderNumber: formatOrderNumber(
        new Date().getUTCFullYear(),
        await orderRepository.nextOrderSequence(),
      ),
      accessToken: randomBytes(ACCESS_TOKEN_BYTES).toString('base64url'),
      resellerId: input.resellerId,
      resellerOrderRef: input.resellerOrderRef,
      bankRequisites: requisitesSnapshot(account),
      shippingAddress: {
        fullName: input.recipient.fullName,
        phone: input.recipient.phone,
        country: COUNTRY,
        line1: input.courierAddress?.line1 ?? '',
        ...(input.courierAddress?.line2 ? { line2: input.courierAddress.line2 } : {}),
        city: input.courierAddress?.city ?? input.pickupPoint?.settlementName ?? '',
      },
      deliveryKind: input.deliveryKind,
      pickupPoint: input.pickupPoint
        ? { ref: input.pickupPoint.ref, label: input.pickupPoint.label }
        : null,
      lines: input.lines,
    })
    logger.info('Partner order placed by admin', {
      orderNumber: order.orderNumber,
      resellerId: input.resellerId,
      createdBy,
    })
    return order
  },

  // The parcel is back and the return handled: it leaves the returns tab.
  async archiveReturn(orderId: string, now: Date): Promise<void> {
    const isArchived = await orderRepository.archiveReturn(orderId, now)
    if (!isArchived) throw new ReturnNotOpenError(orderId)
    logger.info('Return archived by admin', { orderId })
  },

  async saveTracking(
    orderId: string,
    tracking: {
      readonly carrier: Carrier | null
      readonly trackingNumber: string | null
      readonly trackingUrl: string | null
    },
  ): Promise<void> {
    const order = await orderRepository.findById(orderId)
    if (!order) throw new OrderNotFoundError(orderId)
    // The number of a waybill issued here is its label and its cancellation
    // key; typing over it would orphan the document in the cabinet.
    if (order.carrierDocumentRef) throw new TrackingFromWaybillError(orderId)

    await orderRepository.setTracking(orderId, withTrackingUrl(withCompactNumber(tracking)))
    logger.info('Order tracking saved', { orderId, carrier: tracking.carrier })
  },
}

type Tracking = {
  readonly carrier: Carrier | null
  readonly trackingNumber: string | null
  readonly trackingUrl: string | null
}

// A number copied from the carrier's app comes grouped — "20 4515 3969 8513";
// the carrier answers tracking with it written together, and so is it kept.
function withCompactNumber(tracking: Tracking): Tracking {
  const trackingNumber = tracking.trackingNumber?.replace(/\s+/g, '') || null
  return { ...tracking, trackingNumber }
}

// A number typed from the cabinet gets the carrier's tracking link without
// the admin copying it; a link typed by hand is kept as it is.
function withTrackingUrl(tracking: Tracking): Tracking {
  if (tracking.trackingUrl || !tracking.carrier || !tracking.trackingNumber) return tracking
  const trackingUrl = waybillServiceFor(tracking.carrier).trackingUrl(tracking.trackingNumber)
  return { ...tracking, trackingUrl }
}
