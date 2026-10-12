import {
  monthLabel,
  recentMonthKeys,
  returnSharePercent,
} from '@/features/orders/model/return-stats'
import { orderRepository } from '@/features/orders/repository/order-repository'
import { DISPLAY_TIME_ZONE } from '@/lib/datetime'
import { createMoney, Currency, formatMoney } from '@/lib/money'

// A year back is enough to compare a season with the one before.
const RETURN_STATS_MONTHS = 12

export type ReturnStatsMonth = {
  // "2026-09"
  readonly key: string
  readonly label: string
}

export type MonthReturnsView = {
  readonly monthLabel: string
  readonly sent: number
  readonly returned: number
  // Share of that month's sent parcels that came back; null when none left.
  readonly sharePercent: number | null
  readonly returnedLabel: string
}

export function returnStatsMonths(now: Date): ReturnStatsMonth[] {
  return recentMonthKeys(now, RETURN_STATS_MONTHS, DISPLAY_TIME_ZONE).map((key) => ({
    key,
    label: monthLabel(key),
  }))
}

// Orders counted by the month they were placed, so a recent month keeps
// filling in as its late refusals arrive.
export async function getMonthReturns(month: string): Promise<MonthReturnsView> {
  const row = await orderRepository.countReturnsInMonth(month, DISPLAY_TIME_ZONE)

  return {
    monthLabel: monthLabel(month),
    sent: row.sent,
    returned: row.returned,
    sharePercent: returnSharePercent(row),
    returnedLabel: formatMoney(createMoney(row.returnedCents, Currency.Uah)),
  }
}
