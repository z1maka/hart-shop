import {
  earningsByDay,
  earningsTotals,
  EarningsScope,
  type EarningsDay,
  type EarningsTotals,
} from '@/features/orders/model/earnings'
import type { EarningsPeriod } from '@/features/orders/model/earnings-period'
import { earningsRepository } from '@/features/orders/repository/earnings-repository'
import { DISPLAY_TIME_ZONE } from '@/lib/datetime'

export type EarningsView = {
  // The parcels the buyers collected, the ones still to collect, and both.
  readonly collected: EarningsTotals
  readonly pending: EarningsTotals
  readonly all: EarningsTotals
  // Per day, in kopiykas, for the chart.
  readonly days: readonly EarningsDay[]
}

// The admin only: the caller checks the session.
export async function getEarnings(period: EarningsPeriod): Promise<EarningsView> {
  const rows = await earningsRepository.findDays(period.from, period.to, DISPLAY_TIME_ZONE)

  return {
    collected: earningsTotals(rows, EarningsScope.Collected),
    pending: earningsTotals(rows, EarningsScope.Pending),
    all: earningsTotals(rows, EarningsScope.All),
    days: earningsByDay(rows, period.from, period.to),
  }
}
