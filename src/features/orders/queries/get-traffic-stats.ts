import type { TrafficSource } from '@/db/enums'
import { recentWeekKeys, sharePercent, weekLabel } from '@/features/orders/model/traffic-weeks'
import { orderRepository } from '@/features/orders/repository/order-repository'
import { DISPLAY_TIME_ZONE } from '@/lib/datetime'
import { createMoney, Currency, formatMoney } from '@/lib/money'

// A quarter back: enough to see a campaign start and settle.
const TRAFFIC_STATS_WEEKS = 13

export type TrafficWeek = {
  // The week's Monday, "2026-10-05".
  readonly key: string
  readonly label: string
}

export type TrafficChannelView = {
  // Null is the orders without a known channel.
  readonly source: TrafficSource | null
  readonly orders: number
  // Of them, refused at the branch or refunded.
  readonly returned: number
  // What was ordered, less what came back.
  readonly soldLabel: string
  // Part of the week's sold sum, in whole percent.
  readonly sharePercent: number | null
}

export type TrafficWeekView = {
  readonly weekLabel: string
  readonly orders: number
  readonly returned: number
  readonly soldLabel: string
  // Largest sold sum first.
  readonly channels: readonly TrafficChannelView[]
}

export function trafficWeeks(now: Date): TrafficWeek[] {
  return recentWeekKeys(now, TRAFFIC_STATS_WEEKS, DISPLAY_TIME_ZONE).map((key) => ({
    key,
    label: weekLabel(key),
  }))
}

// Orders counted by the week they were placed in and the channel the buyer
// came from; a cancelled order is left out, a refused one is counted and
// taken off the sold sum, so a recent week keeps settling as parcels return.
export async function getWeekTraffic(week: string): Promise<TrafficWeekView> {
  const rows = await orderRepository.countByTrafficInWeek(week, DISPLAY_TIME_ZONE)
  const sold = rows.map((row) => ({ ...row, soldCents: row.totalCents - row.returnedCents }))
  const soldCents = sold.reduce((sum, row) => sum + row.soldCents, 0)

  return {
    weekLabel: weekLabel(week),
    orders: sold.reduce((sum, row) => sum + row.orders, 0),
    returned: sold.reduce((sum, row) => sum + row.returned, 0),
    soldLabel: money(soldCents),
    channels: sold
      .sort((first, second) => second.soldCents - first.soldCents)
      .map((row) => ({
        source: row.source,
        orders: row.orders,
        returned: row.returned,
        soldLabel: money(row.soldCents),
        sharePercent: sharePercent(row.soldCents, soldCents),
      })),
  }
}

function money(cents: number): string {
  return formatMoney(createMoney(cents, Currency.Uah))
}
