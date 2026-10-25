import { OrderStatus } from '@/db/enums'
import { sharePercent } from '@/features/orders/model/traffic-weeks'

// What the shop earns on its sales: the price a line sold at less what the
// unit cost the shop (owner, 25.10.2026). Counted by the day the order was
// placed, on the shop's clock.

// A sale: placed and neither cancelled nor come back. A refused or unclaimed
// parcel turns the order to Refunded and takes it off the board.
export const SOLD_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.Pending,
  OrderStatus.Paid,
  OrderStatus.Packed,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
]

// «Фактический»: the buyer has collected the parcel, the money is in.
export const COLLECTED_ORDER_STATUS = OrderStatus.Delivered

export const EarningsScope = {
  Collected: 'collected',
  All: 'all',
} as const

export type EarningsScope = (typeof EarningsScope)[keyof typeof EarningsScope]

// The sales of one day, split by whether their parcels were collected.
export type EarningsDayRow = {
  // «2026-10-25» on the shop's clock.
  readonly day: string
  readonly isCollected: boolean
  readonly orders: number
  readonly units: number
  readonly revenueCents: number
  // The part of the revenue whose products had a cost: earnings are counted
  // on it alone, so a missing cost never passes for pure profit.
  readonly costedRevenueCents: number
  readonly costCents: number
  readonly uncostedUnits: number
}

export type EarningsTotals = {
  readonly orders: number
  readonly units: number
  readonly revenueCents: number
  readonly costCents: number
  readonly earningsCents: number
  // Earnings over the revenue they were counted on, in whole percent; null
  // when nothing sold had a cost.
  readonly marginPercent: number | null
  readonly uncostedUnits: number
  readonly uncostedRevenueCents: number
}

export type EarningsDay = {
  readonly day: string
  readonly collectedCents: number
  readonly allCents: number
}

function inScope(row: EarningsDayRow, scope: EarningsScope): boolean {
  return scope === EarningsScope.All || row.isCollected
}

function rowEarnings(row: EarningsDayRow): number {
  return row.costedRevenueCents - row.costCents
}

export function earningsTotals(
  rows: readonly EarningsDayRow[],
  scope: EarningsScope,
): EarningsTotals {
  const picked = rows.filter((row) => inScope(row, scope))
  const sum = (pick: (row: EarningsDayRow) => number) =>
    picked.reduce((total, row) => total + pick(row), 0)

  const revenueCents = sum((row) => row.revenueCents)
  const costedRevenueCents = sum((row) => row.costedRevenueCents)
  const earningsCents = sum(rowEarnings)

  return {
    orders: sum((row) => row.orders),
    units: sum((row) => row.units),
    revenueCents,
    costCents: sum((row) => row.costCents),
    earningsCents,
    marginPercent: sharePercent(earningsCents, costedRevenueCents),
    uncostedUnits: sum((row) => row.uncostedUnits),
    uncostedRevenueCents: revenueCents - costedRevenueCents,
  }
}

// Every day from `from` to `to` inclusive, a day without sales at zero, so
// the chart's gaps are real quiet days and not missing points.
export function earningsByDay(
  rows: readonly EarningsDayRow[],
  from: string,
  to: string,
): EarningsDay[] {
  const byDay = new Map<string, EarningsDayRow[]>()
  rows.forEach((row) => byDay.set(row.day, [...(byDay.get(row.day) ?? []), row]))

  return daysBetween(from, to).map((day) => {
    const ofDay = byDay.get(day) ?? []
    return {
      day,
      collectedCents: ofDay
        .filter((row) => row.isCollected)
        .reduce((total, row) => total + rowEarnings(row), 0),
      allCents: ofDay.reduce((total, row) => total + rowEarnings(row), 0),
    }
  })
}

const MS_PER_DAY = 86_400_000
const ISO_DATE_LENGTH = 10

export function daysBetween(from: string, to: string): string[] {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return []

  const count = Math.round((end - start) / MS_PER_DAY) + 1
  return Array.from({ length: count }, (_, index) =>
    new Date(start + index * MS_PER_DAY).toISOString().slice(0, ISO_DATE_LENGTH),
  )
}

export function shiftDays(day: string, offset: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + offset * MS_PER_DAY)
    .toISOString()
    .slice(0, ISO_DATE_LENGTH)
}
