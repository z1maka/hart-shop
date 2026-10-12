import { OrderStatus } from '@/db/enums'

// The working shelf read top-down: rows that still need a waybill, rows
// whose waybill exists but the carrier has not taken the box yet, rows
// already on their way. The first group is the day's work; the other two
// are there to be glanced at.
export const OrderGroup = {
  NeedsWaybill: 'needs-waybill',
  AwaitingHandover: 'awaiting-handover',
  InTransit: 'in-transit',
} as const

export type OrderGroup = (typeof OrderGroup)[keyof typeof OrderGroup]

const GROUP_ORDER: readonly OrderGroup[] = [
  OrderGroup.NeedsWaybill,
  OrderGroup.AwaitingHandover,
  OrderGroup.InTransit,
]

type GroupableOrder = {
  readonly status: OrderStatus
  readonly trackingNumber: string | null
}

export function orderGroupOf(order: GroupableOrder): OrderGroup {
  if (order.status === OrderStatus.Shipped) return OrderGroup.InTransit
  return order.trackingNumber ? OrderGroup.AwaitingHandover : OrderGroup.NeedsWaybill
}

export type OrderGroupBlock<T> = {
  readonly group: OrderGroup
  readonly rows: readonly T[]
}

// Groups in reading order, rows in the order they came, empty groups gone.
export function groupOrders<T extends GroupableOrder>(
  rows: readonly T[],
): readonly OrderGroupBlock<T>[] {
  return GROUP_ORDER.map((group) => ({
    group,
    rows: rows.filter((row) => orderGroupOf(row) === group),
  })).filter((block) => block.rows.length > 0)
}

// Calendar days as YYYY-MM-DD in the admin's zone, fixed by the server so
// the dividers and the rows agree on where midnight was.
export type DayCalendar = {
  readonly today: string
  readonly yesterday: string
}

export const DayMark = {
  Today: 'today',
  Yesterday: 'yesterday',
  Other: 'other',
} as const

export type DayMark = (typeof DayMark)[keyof typeof DayMark]

export function dayMarkOf(dayKey: string, calendar: DayCalendar): DayMark {
  if (dayKey === calendar.today) return DayMark.Today
  if (dayKey === calendar.yesterday) return DayMark.Yesterday
  return DayMark.Other
}

export type DayRun<T> = {
  readonly dayKey: string
  readonly rows: readonly T[]
}

// Consecutive rows of one day, in the order given: the list is already
// newest first, so a day never appears twice.
export function splitByDay<T extends { readonly placedDay: string }>(
  rows: readonly T[],
): readonly DayRun<T>[] {
  const runs: { dayKey: string; rows: T[] }[] = []
  for (const row of rows) {
    const last = runs.at(-1)
    if (last && last.dayKey === row.placedDay) last.rows.push(row)
    else runs.push({ dayKey: row.placedDay, rows: [row] })
  }
  return runs
}
