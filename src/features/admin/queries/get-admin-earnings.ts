import { connection } from 'next/server'
import {
  adSpendByDay,
  adSpendPerOrder,
  AdSpendState,
  totalAdSpend,
  type AdSpendDay,
  type AdSpendReport,
} from '@/features/admin/model/ad-spend'
import { readAdSpend } from '@/features/admin/services/ad-spend-reader'
import { googleAnalyticsAdSpend } from '@/features/admin/services/google-analytics-ad-spend'
import { requireAdminSession } from '@/features/admin/session-cookie'
import {
  earningsPeriod,
  getEarnings,
  sharePercent,
  type EarningsDay,
  type EarningsPeriod,
  type EarningsTotals,
  type EarningsView,
} from '@/features/orders'
import { formatDateIsoKyiv } from '@/lib/datetime'

// Ads stay beside the earnings, never taken off them: the owner reads what
// the workshop's goods earn and what the ads cost as two separate numbers.
export type AdSpendView =
  | { readonly state: typeof AdSpendState.NotConnected }
  | { readonly state: typeof AdSpendState.Failed }
  | {
      readonly state: typeof AdSpendState.Connected
      readonly totalCents: number
      readonly perOrderCents: number | null
      // Of all the period's revenue, in whole percent.
      readonly shareOfRevenue: number | null
      // Every day of the period, a day without ads at zero.
      readonly days: readonly AdSpendDay[]
    }

export type AdminEarningsView = EarningsView & {
  readonly period: EarningsPeriod
  readonly adSpend: AdSpendView
}

export async function getAdminEarnings(params: {
  readonly period?: string
  readonly from?: string
  readonly to?: string
}): Promise<AdminEarningsView> {
  await requireAdminSession()
  // A link prefetch prerenders this page with the admin's cookies and aborts
  // its requests when done: Google would be called for nothing on every hover.
  await connection()

  const period = earningsPeriod(params, formatDateIsoKyiv(new Date()))
  const [earnings, adSpend] = await Promise.all([
    getEarnings(period),
    readAdSpend(googleAnalyticsAdSpend, period.from, period.to),
  ])

  return { ...earnings, period, adSpend: adSpendView(adSpend, earnings.all, earnings.days) }
}

function adSpendView(
  report: AdSpendReport,
  all: EarningsTotals,
  days: readonly EarningsDay[],
): AdSpendView {
  if (report.state !== AdSpendState.Connected) return { state: report.state }

  const totalCents = totalAdSpend(report.days)
  const byDay = adSpendByDay(report.days)
  return {
    state: AdSpendState.Connected,
    totalCents,
    perOrderCents: adSpendPerOrder(totalCents, all.orders),
    shareOfRevenue: sharePercent(totalCents, all.revenueCents),
    days: days.map((day) => ({ day: day.day, costCents: byDay.get(day.day) ?? 0 })),
  }
}
