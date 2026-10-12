import { OrderStatus } from '@/db/enums'

// What the admin filters the orders list by: the chips the table shows, not
// the raw statuses. An unpaid cash-on-delivery order reads «Новый», an unpaid
// card or transfer order «Ожидает оплаты», though both are `pending`.
export const OrderStatusFilter = {
  New: 'new',
  AwaitingPayment: 'awaiting-payment',
  Paid: 'paid',
  Packed: 'packed',
  Shipped: 'shipped',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
  Refunded: 'refunded',
} as const

export type OrderStatusFilter = (typeof OrderStatusFilter)[keyof typeof OrderStatusFilter]

// The order the dropdown lists them in: the way an order moves.
export const ORDER_STATUS_FILTERS: readonly OrderStatusFilter[] = Object.values(OrderStatusFilter)

const FILTERS: ReadonlySet<string> = new Set(ORDER_STATUS_FILTERS)

const FILTER_OF_SETTLED_STATUS: Readonly<
  Record<Exclude<OrderStatus, 'pending'>, OrderStatusFilter>
> = {
  [OrderStatus.Paid]: OrderStatusFilter.Paid,
  [OrderStatus.Packed]: OrderStatusFilter.Packed,
  [OrderStatus.Shipped]: OrderStatusFilter.Shipped,
  [OrderStatus.Delivered]: OrderStatusFilter.Delivered,
  [OrderStatus.Cancelled]: OrderStatusFilter.Cancelled,
  [OrderStatus.Refunded]: OrderStatusFilter.Refunded,
}

function isOrderStatusFilter(value: unknown): value is OrderStatusFilter {
  return typeof value === 'string' && FILTERS.has(value)
}

// From the address: anything unknown means no filter.
export function parseOrderStatusFilter(value: unknown): OrderStatusFilter | null {
  return isOrderStatusFilter(value) ? value : null
}

// The chip an order shows: a pending order splits on whether the carrier
// collects the money.
export function statusFilterOf(status: OrderStatus, isCashOnDelivery: boolean): OrderStatusFilter {
  if (status !== OrderStatus.Pending) return FILTER_OF_SETTLED_STATUS[status]

  return isCashOnDelivery ? OrderStatusFilter.New : OrderStatusFilter.AwaitingPayment
}

type StatusCountRow = {
  readonly status: OrderStatus
  readonly isCashOnDelivery: boolean
  readonly count: number
}

export type StatusFilterCounts = Readonly<Record<OrderStatusFilter, number>>

// Per-status totals, as the database groups them, folded into the chips.
export function countByStatusFilter(rows: readonly StatusCountRow[]): StatusFilterCounts {
  const totalOf = (filter: OrderStatusFilter): number =>
    rows.reduce(
      (sum, row) =>
        statusFilterOf(row.status, row.isCashOnDelivery) === filter ? sum + row.count : sum,
      0,
    )

  return {
    [OrderStatusFilter.New]: totalOf(OrderStatusFilter.New),
    [OrderStatusFilter.AwaitingPayment]: totalOf(OrderStatusFilter.AwaitingPayment),
    [OrderStatusFilter.Paid]: totalOf(OrderStatusFilter.Paid),
    [OrderStatusFilter.Packed]: totalOf(OrderStatusFilter.Packed),
    [OrderStatusFilter.Shipped]: totalOf(OrderStatusFilter.Shipped),
    [OrderStatusFilter.Delivered]: totalOf(OrderStatusFilter.Delivered),
    [OrderStatusFilter.Cancelled]: totalOf(OrderStatusFilter.Cancelled),
    [OrderStatusFilter.Refunded]: totalOf(OrderStatusFilter.Refunded),
  }
}

// The status rows must have to pass the filter, and for a pending one which
// side of cash on delivery they sit on.
export function statusMatchOf(filter: OrderStatusFilter): {
  readonly status: OrderStatus
  readonly isCashOnDelivery: boolean | null
} {
  if (filter === OrderStatusFilter.New) {
    return { status: OrderStatus.Pending, isCashOnDelivery: true }
  }
  if (filter === OrderStatusFilter.AwaitingPayment) {
    return { status: OrderStatus.Pending, isCashOnDelivery: false }
  }

  return { status: filter, isCashOnDelivery: null }
}
