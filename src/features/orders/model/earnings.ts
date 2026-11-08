import { OrderStatus, SalesChannel } from '@/db/enums'
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
  // Placed and standing, the parcel not collected yet: in work or on its way.
  Pending: 'pending',
  All: 'all',
} as const

export type EarningsScope = (typeof EarningsScope)[keyof typeof EarningsScope]

// Which sales the board counts: all of them, the site's, or the partners'.
// A partner pays the drop price, so a unit earns less there; the board
// shows the two apart (owner, 05.11.2026).
export const ChannelFilter = {
  All: 'all',
  Site: SalesChannel.Site,
  Dropship: SalesChannel.Dropship,
} as const

export type ChannelFilter = (typeof ChannelFilter)[keyof typeof ChannelFilter]

function isChannelFilter(value: string | undefined): value is ChannelFilter {
  return Object.values<string | undefined>(ChannelFilter).includes(value)
}

export function parseChannelFilter(value: string | undefined): ChannelFilter {
  return isChannelFilter(value) ? value : ChannelFilter.All
}

// The ads bring buyers to the site only: partners' orders come from no ad.
// Their cost is counted against the site's orders and shown wherever the
// site's sales are on the board.
export function countsAdSpend(filter: ChannelFilter): boolean {
  return filter !== ChannelFilter.Dropship
}

export function rowsOfChannel<Row extends { readonly channel: SalesChannel }>(
  rows: readonly Row[],
  filter: ChannelFilter,
): Row[] {
  return rows.filter((row) => filter === ChannelFilter.All || row.channel === filter)
}

// What one unit sold earned on average; none without costed units.
export function earningsPerUnit(totals: EarningsTotals): number | null {
  const costedUnits = totals.units - totals.uncostedUnits
  return costedUnits > 0 ? Math.round(totals.earningsCents / costedUnits) : null
}

// The sales of one day, split by whether their parcels were collected and
// by who bought them.
export type EarningsDayRow = {
  // «2026-10-25» on the shop's clock.
  readonly day: string
  readonly isCollected: boolean
  readonly channel: SalesChannel
  readonly orders: number
  readonly units: number
  readonly revenueCents: number
  // The part of the revenue whose products had a cost: earnings are counted
  // on it alone, so a missing cost never passes for pure profit.
  readonly costedRevenueCents: number
  readonly costCents: number
  readonly uncostedUnits: number
  // The workshop's side, on the lines whose products have both its price
  // and its own cost: that price summed, and the cost of sewing them.
  readonly producedCostCents: number
  readonly productionCostCents: number
  // Units with the workshop's price but none of its own cost.
  readonly unproducedUnits: number
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
  // What sewing the goods cost the workshop, and what it earned on them:
  // its price less that cost (owner, 08.11.2026).
  readonly productionCostCents: number
  readonly workshopEarningsCents: number
  readonly unproducedUnits: number
  // The shop's earnings and the workshop's together.
  readonly combinedEarningsCents: number
}

export type EarningsDay = {
  readonly day: string
  readonly collectedCents: number
  readonly allCents: number
  readonly orders: number
}

function inScope(row: EarningsDayRow, scope: EarningsScope): boolean {
  if (scope === EarningsScope.All) return true
  return scope === EarningsScope.Collected ? row.isCollected : !row.isCollected
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
  const productionCostCents = sum((row) => row.productionCostCents)
  const workshopEarningsCents = sum((row) => row.producedCostCents) - productionCostCents

  return {
    orders: sum((row) => row.orders),
    units: sum((row) => row.units),
    revenueCents,
    costCents: sum((row) => row.costCents),
    earningsCents,
    marginPercent: sharePercent(earningsCents, costedRevenueCents),
    uncostedUnits: sum((row) => row.uncostedUnits),
    uncostedRevenueCents: revenueCents - costedRevenueCents,
    productionCostCents,
    workshopEarningsCents,
    unproducedUnits: sum((row) => row.unproducedUnits),
    combinedEarningsCents: earningsCents + workshopEarningsCents,
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
      orders: ofDay.reduce((total, row) => total + row.orders, 0),
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
