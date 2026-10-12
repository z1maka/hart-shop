import { OrderStatus } from '@/db/enums'

export type TimelineState = 'done' | 'current' | 'upcoming'

export type TimelineStepKey = 'paid' | 'packed' | 'shipped' | 'delivered'

export type TimelineStep = {
  readonly key: TimelineStepKey
  readonly state: TimelineState
}

const STEP_KEYS: readonly TimelineStepKey[] = ['paid', 'packed', 'shipped', 'delivered']

// How far the parcel has travelled, expressed as the number of completed steps.
const REACHED_BY_STATUS: Record<OrderStatus, number> = {
  [OrderStatus.Pending]: 0,
  [OrderStatus.Paid]: 1,
  [OrderStatus.Packed]: 2,
  [OrderStatus.Shipped]: 3,
  [OrderStatus.Delivered]: 4,
  [OrderStatus.Cancelled]: 0,
  [OrderStatus.Refunded]: 0,
}

export function buildOrderTimeline(status: OrderStatus): TimelineStep[] {
  const reached = REACHED_BY_STATUS[status]

  return STEP_KEYS.map((key, index) => ({
    key,
    state: timelineState(index, reached),
  }))
}

export function isTerminatedStatus(status: OrderStatus): boolean {
  return status === OrderStatus.Cancelled || status === OrderStatus.Refunded
}

function timelineState(index: number, reached: number): TimelineState {
  if (index < reached) return 'done'
  if (index === reached) return 'current'
  return 'upcoming'
}
