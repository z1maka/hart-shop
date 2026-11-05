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
  countsAdSpend,
  earningsPeriod,
  getEarnings,
  parseChannelFilter,
  sharePercent,
  type EarningsDay,
  type EarningsPeriod,
  type EarningsTotals,
  type EarningsView,
} from '@/features/orders'
import { SalesChannel } from '@/db/enums'
import { formatDateIsoKyiv } from '@/lib/datetime'

// The cost per order and the share of revenue are the site's alone: the
// partners' orders came from no ad, and counting them would make the ads
// look cheaper than they are.
// Ads stay beside the earnings, never taken off them: the owner reads what
// the workshop's goods earn and what the ads cost as two separate numbers.
export type AdSpendView =
  | { readonly state: typeof AdSpendState.NotConnected }
  | { readonly state: typeof AdSpendState.Failed }
  | {
      readonly state: typeof AdSpendState.Connected
      readonly totalCents: number
      readonly perOrderCents: number | null
      // Of the site's revenue in the period, in whole percent.
      readonly shareOfRevenue: number | null
      // Every day of the period, a day without ads at zero.
      readonly days: readonly AdSpendDay[]
    }

export type AdminEarningsView = EarningsView & {
  readonly period: EarningsPeriod
  // Null on the partners' board: no ad brought those orders.
  readonly adSpend: AdSpendView | null
}

export async function getAdminEarnings(params: {
  readonly period?: string
  readonly from?: string
  readonly to?: string
  readonly channel?: string
}): Promise<AdminEarningsView> {
  await requireAdminSession()
  // A link prefetch prerenders this page with the admin's cookies and aborts
  // its requests when done: Google would be called for nothing on every hover.
  await connection()

  const period = earningsPeriod(params, formatDateIsoKyiv(new Date()))
  const channel = parseChannelFilter(params.channel)
  if (!countsAdSpend(channel)) {
    return { ...(await getEarnings(period, channel)), period, adSpend: null }
  }

  const [earnings, adSpend] = await Promise.all([
    getEarnings(period, channel),
    readAdSpend(googleAnalyticsAdSpend, period.from, period.to),
  ])
  const siteSales = earnings.byChannel[SalesChannel.Site]
  return { ...earnings, period, adSpend: adSpendView(adSpend, siteSales, earnings.days) }
}

function adSpendView(
  report: AdSpendReport,
  siteSales: EarningsTotals,
  days: readonly EarningsDay[],
): AdSpendView {
  if (report.state !== AdSpendState.Connected) return { state: report.state }

  const totalCents = totalAdSpend(report.days)
  const byDay = adSpendByDay(report.days)
  return {
    state: AdSpendState.Connected,
    totalCents,
    perOrderCents: adSpendPerOrder(totalCents, siteSales.orders),
    shareOfRevenue: sharePercent(totalCents, siteSales.revenueCents),
    days: days.map((day) => ({ day: day.day, costCents: byDay.get(day.day) ?? 0 })),
  }
}
