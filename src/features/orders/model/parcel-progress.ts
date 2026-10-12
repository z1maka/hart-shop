import { OrderStatus } from '@/db/enums'
import { ParcelStage } from '@/features/shipping/model/parcel-tracking'

// Orders the hourly tracking follows: the parcel has a waybill and has not
// reached the buyer yet.
export const TRACKED_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.Packed,
  OrderStatus.Shipped,
]

export type ParcelStep = {
  // The order's next status; null keeps the one it has.
  readonly status: OrderStatus | null
  // The buyer hears "on its way" only while it still is.
  readonly announcesShipment: boolean
  // The shop hears of a parcel coming back once, when it turns.
  readonly reportsRefusal: boolean
}

type TrackedOrder = {
  readonly status: string
}

const SENT_STAGES: ReadonlySet<ParcelStage> = new Set([ParcelStage.InTransit, ParcelStage.Arrived])

const NO_STEP: ParcelStep = { status: null, announcesShipment: false, reportsRefusal: false }

// The carrier's word outranks the order's: a collected parcel is delivered
// even if nobody saw it leave, and a refused or unclaimed one becomes a
// return — the returns tab holds it until the admin closes it.
export function parcelStep(order: TrackedOrder, stage: ParcelStage): ParcelStep {
  if (stage === ParcelStage.Received) {
    return { ...NO_STEP, status: OrderStatus.Delivered }
  }
  if (stage === ParcelStage.Refused) {
    return { ...NO_STEP, status: OrderStatus.Refunded, reportsRefusal: true }
  }
  if (SENT_STAGES.has(stage) && order.status === OrderStatus.Packed) {
    return { ...NO_STEP, status: OrderStatus.Shipped, announcesShipment: true }
  }
  return NO_STEP
}
