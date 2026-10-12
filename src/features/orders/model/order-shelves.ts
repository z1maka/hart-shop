import { OrderStatus } from '@/db/enums'

// The orders list on four shelves: the day's work, the phone-only orders
// waiting for a call, parcels coming back, and everything finished.
export const OrderShelf = {
  Active: 'active',
  Quick: 'quick',
  Returns: 'returns',
  Archive: 'archive',
} as const

export type OrderShelf = (typeof OrderShelf)[keyof typeof OrderShelf]

// Finished by their status alone. A return is finished only when the admin
// closes it: until then it waits on its own shelf.
export const FINISHED_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.Delivered,
  OrderStatus.Cancelled,
]

export const RETURN_ORDER_STATUS = OrderStatus.Refunded

const SHELVES: ReadonlySet<string> = new Set(Object.values(OrderShelf))

function isOrderShelf(value: unknown): value is OrderShelf {
  return typeof value === 'string' && SHELVES.has(value)
}

// From the address: anything unknown opens the day's work.
export function parseOrderShelf(value: unknown): OrderShelf {
  return isOrderShelf(value) ? value : OrderShelf.Active
}
