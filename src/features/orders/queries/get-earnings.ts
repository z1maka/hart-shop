import {
  earningsByDay,
  earningsTotals,
  EarningsScope,
  type EarningsDay,
  type EarningsTotals,
} from '@/features/orders/model/earnings'
import { earningsPeriod, type EarningsPeriod } from '@/features/orders/model/earnings-period'
import { earningsRepository } from '@/features/orders/repository/earnings-repository'
import { DISPLAY_TIME_ZONE, formatDateIsoKyiv } from '@/lib/datetime'
import { createMoney, Currency, formatMoney } from '@/lib/money'

export type EarningsTotalsView = {
  readonly orders: number
  readonly units: number
  readonly revenueLabel: string
  readonly costLabel: string
  readonly earningsLabel: string
  // «38 %», or a dash when nothing sold had a cost.
  readonly marginLabel: string
  // «2 шт. на 3 890,00 ₴ без себестоимости», or null when every line had one.
  readonly uncostedNote: string | null
}

export type EarningsView = {
  readonly period: EarningsPeriod
  readonly collected: EarningsTotalsView
  readonly all: EarningsTotalsView
  // Per day, in kopiykas, for the chart.
  readonly days: readonly EarningsDay[]
}

type EarningsParams = {
  readonly period?: string
  readonly from?: string
  readonly to?: string
}

// The admin only: the caller checks the session.
export async function getEarnings(params: EarningsParams, now: Date): Promise<EarningsView> {
  const period = earningsPeriod(params, formatDateIsoKyiv(now))
  const rows = await earningsRepository.findDays(period.from, period.to, DISPLAY_TIME_ZONE)

  return {
    period,
    collected: totalsView(earningsTotals(rows, EarningsScope.Collected)),
    all: totalsView(earningsTotals(rows, EarningsScope.All)),
    days: earningsByDay(rows, period.from, period.to),
  }
}

function totalsView(totals: EarningsTotals): EarningsTotalsView {
  return {
    orders: totals.orders,
    units: totals.units,
    revenueLabel: money(totals.revenueCents),
    costLabel: money(totals.costCents),
    earningsLabel: money(totals.earningsCents),
    marginLabel: totals.marginPercent === null ? '—' : `${totals.marginPercent} %`,
    uncostedNote:
      totals.uncostedUnits > 0
        ? `${totals.uncostedUnits} шт. на ${money(totals.uncostedRevenueCents)} без себестоимости`
        : null,
  }
}

function money(cents: number): string {
  return formatMoney(createMoney(cents, Currency.Uah))
}
