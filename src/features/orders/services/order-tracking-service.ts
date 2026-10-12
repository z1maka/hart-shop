import { Carrier, OrderStatus } from '@/db/enums'
import { codCents } from '@/features/orders/model/shipment'
import {
  parcelStep,
  TRACKED_ORDER_STATUSES,
  type ParcelStep,
} from '@/features/orders/model/parcel-progress'
import { recordsPayment } from '@/features/orders/model/status-flow'
import {
  orderRepository,
  type TrackedOrderRow,
} from '@/features/orders/repository/order-repository'
import { orderShippedNotice } from '@/features/orders/services/order-shipped-notice'
import { orderTelegram } from '@/features/orders/services/order-telegram'
import { waybillServiceFor, type ParcelStatus } from '@/features/shipping'
import { logger } from '@/lib/logger'
import { adminUrl } from '@/lib/urls'

// An hourly run sees the parcels still on their way — dozens, not hundreds.
const TRACK_BATCH_SIZE = 500
const TRACKED_CARRIER = Carrier.NovaPost

export type TrackingReport = {
  readonly checked: number
  readonly shipped: readonly string[]
  readonly delivered: readonly string[]
  readonly refused: readonly string[]
}

type Advance = {
  readonly orderNumber: string
  readonly step: ParcelStep
}

// The carrier knows where every parcel is; the order follows: accepted at
// the branch — shipped, collected — delivered and off to the archive.
export const orderTrackingService = {
  async trackParcels(now: Date): Promise<TrackingReport> {
    const tracked = await orderRepository.findTracked(
      TRACKED_CARRIER,
      TRACKED_ORDER_STATUSES,
      TRACK_BATCH_SIZE,
    )
    if (tracked.length === 0) return { checked: 0, shipped: [], delivered: [], refused: [] }

    const parcels = await waybillServiceFor(TRACKED_CARRIER).track(
      tracked.map((order) => order.trackingNumber),
    )
    const parcelByNumber = new Map(parcels.map((parcel) => [parcel.number, parcel]))

    // One order at a time: a step may send the buyer a mail, and a slow mail
    // server must not have a hundred of them open at once.
    const advances: Advance[] = []
    for (const order of tracked) {
      const parcel = parcelByNumber.get(order.trackingNumber)
      const advance = parcel ? await advanceOrder(order, parcel, now) : null
      if (advance) advances.push(advance)
    }
    return reportOf(tracked.length, advances)
  },
}

async function advanceOrder(
  order: TrackedOrderRow,
  parcel: ParcelStatus,
  now: Date,
): Promise<Advance | null> {
  const step = parcelStep(order, parcel.stage)
  const isParcelChanged =
    parcel.stage !== order.parcelStage || parcel.statusText !== order.parcelStatus
  if (!isParcelChanged && step.status === null) return null

  const expected = { status: order.status, trackingNumber: order.trackingNumber }
  const isRecorded = await orderRepository.recordParcel(order.id, expected, {
    parcelStage: parcel.stage,
    parcelStatus: parcel.statusText,
    parcelUpdatedAt: isParcelChanged ? now : null,
    status: step.status,
    paidAt: stampsPayment(order, step) ? now : null,
  })
  if (!isRecorded) return null

  if (step.status) {
    logger.info('Order moved by parcel tracking', {
      orderNumber: order.orderNumber,
      from: order.status,
      to: step.status,
      parcel: parcel.statusText,
    })
  }
  if (step.announcesShipment) await announceShipment(order.id)
  if (step.reportsRefusal) await reportRefusal(order.id, parcel)
  return { orderNumber: order.orderNumber, step }
}

// Cash on delivery is paid at the branch: reaching Delivered is the payment,
// as when the admin moves it by hand.
function stampsPayment(order: TrackedOrderRow, step: ParcelStep): boolean {
  if (!step.status || order.paidAt) return false
  return recordsPayment(order.paymentRoute, step.status)
}

// The same "on its way" mail and SMS the admin's own move to Shipped
// sends. The status is saved already: a failure is logged, not rolled back.
async function announceShipment(orderId: string): Promise<void> {
  try {
    const order = await orderRepository.findById(orderId)
    if (!order) return
    await orderShippedNotice.send(order)
  } catch (error) {
    logger.error('Shipped notice from parcel tracking failed', { orderId, error })
  }
}

async function reportRefusal(orderId: string, parcel: ParcelStatus): Promise<void> {
  try {
    const order = await orderRepository.findById(orderId)
    if (!order) return
    await orderTelegram.sendParcelRefused({
      orderId: order.id,
      orderNumber: order.orderNumber,
      waybillNumber: parcel.number,
      statusText: parcel.statusText,
      recipient: order.shippingAddress.fullName,
      phone: order.shippingAddress.phone ?? null,
      codCents: codCents(order),
      adminOrderUrl: adminUrl(`/admin/orders/${order.id}/`),
    })
  } catch (error) {
    logger.error('Parcel refusal report failed', { orderId, error })
  }
}

function reportOf(checked: number, advances: readonly Advance[]): TrackingReport {
  const numbersWhere = (isMatch: (step: ParcelStep) => boolean) =>
    advances.filter((advance) => isMatch(advance.step)).map((advance) => advance.orderNumber)

  return {
    checked,
    shipped: numbersWhere((step) => step.status === OrderStatus.Shipped),
    delivered: numbersWhere((step) => step.status === OrderStatus.Delivered),
    refused: numbersWhere((step) => step.reportsRefusal),
  }
}
