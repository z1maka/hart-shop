import { OrderStatus, type Carrier, type PaymentRoute } from '@/db/enums'
import {
  orderShippedNotice,
  type ShippedNoticeOutcome,
} from '@/features/orders/services/order-shipped-notice'
import { canTransition, recordsPayment } from '@/features/orders/model/status-flow'
import { orderRepository } from '@/features/orders/repository/order-repository'
import {
  OrderNotFoundError,
  OrderTransitionError,
  ReturnNotOpenError,
  TrackingFromWaybillError,
} from '@/lib/errors'
import { waybillServiceFor } from '@/features/shipping'
import { logger } from '@/lib/logger'

// Both null when no message applies to the transition.
export type StatusChangeOutcome = ShippedNoticeOutcome

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
    await orderRepository.updateStatus(orderId, next, paidAt)
    logger.info('Order status changed by admin', { orderId, from: order.status, to: next })

    if (next !== OrderStatus.Shipped) return { mailSent: null, smsSent: null }

    return orderShippedNotice.send({ ...order, status: next })
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

  async saveInvoiceNumber(orderId: string, invoiceNumber: string | null): Promise<void> {
    const order = await orderRepository.findById(orderId)
    if (!order) throw new OrderNotFoundError(orderId)

    await orderRepository.setInvoiceNumber(orderId, invoiceNumber)
    logger.info('Order invoice number saved', { orderId })
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
