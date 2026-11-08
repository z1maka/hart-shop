import { and, eq, inArray, sql } from 'drizzle-orm'
import { orderItems, orders } from '@/db/schema'
import {
  COLLECTED_ORDER_STATUS,
  SOLD_ORDER_STATUSES,
  type EarningsDayRow,
} from '@/features/orders/model/earnings'
import { db } from '@/lib/db'

export const earningsRepository = {
  // The lines of the orders sold from `from` to `to` (both included, on
  // `timeZone`'s clock), added up per day, per collected or not and per
  // channel; the board picks the channel it shows.
  async findDays(from: string, to: string, timeZone: string): Promise<EarningsDayRow[]> {
    const day = sql<string>`to_char(${orders.createdAt} at time zone ${timeZone}, 'YYYY-MM-DD')`
    const isCollected = sql<boolean>`${orders.status} = ${COLLECTED_ORDER_STATUS}`
    const lineCents = sql`${orderItems.unitPriceCents} * ${orderItems.quantity}`
    const hasCost = sql`${orderItems.unitCostCents} is not null`
    // The workshop's side counts where both its price and its own cost are known.
    const hasProductionCost = sql`(${hasCost} and ${orderItems.unitProductionCostCents} is not null)`

    // Grouped by position: the time zone goes in as a fresh parameter in
    // every clause, so Postgres would not match a repeated expression.
    return db
      .select({
        day,
        isCollected,
        channel: orders.channel,
        orders: sql<number>`count(distinct ${orders.id})::int`,
        units: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
        revenueCents: sql<number>`coalesce(sum(${lineCents}), 0)::int`,
        costedRevenueCents: sql<number>`coalesce(sum(${lineCents}) filter (where ${hasCost}), 0)::int`,
        costCents: sql<number>`coalesce(sum(${orderItems.unitCostCents} * ${orderItems.quantity}), 0)::int`,
        uncostedUnits: sql<number>`coalesce(sum(${orderItems.quantity}) filter (where not ${hasCost}), 0)::int`,
        producedCostCents: sql<number>`coalesce(sum(${orderItems.unitCostCents} * ${orderItems.quantity}) filter (where ${hasProductionCost}), 0)::int`,
        productionCostCents: sql<number>`coalesce(sum(${orderItems.unitProductionCostCents} * ${orderItems.quantity}) filter (where ${hasProductionCost}), 0)::int`,
        unproducedUnits: sql<number>`coalesce(sum(${orderItems.quantity}) filter (where ${hasCost} and not ${hasProductionCost}), 0)::int`,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(
          sql`${orders.createdAt} >= (${from}::timestamp at time zone ${timeZone})`,
          sql`${orders.createdAt} < ((${to}::timestamp + interval '1 day') at time zone ${timeZone})`,
          inArray(orders.status, [...SOLD_ORDER_STATUSES]),
        ),
      )
      .groupBy(sql`1`, sql`2`, sql`3`)
      .orderBy(sql`1`)
  },
}
