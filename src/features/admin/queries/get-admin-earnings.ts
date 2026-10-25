import { connection } from 'next/server'
import {
  adSpendByDay,
  AdSpendState,
  earningsAfterAds,
  totalAdSpend,
  type AdSpendReport,
} from '@/features/admin/model/ad-spend'
import { readAdSpend } from '@/features/admin/services/ad-spend-reader'
import { googleAnalyticsAdSpend } from '@/features/admin/services/google-analytics-ad-spend'
import { requireAdminSession } from '@/features/admin/session-cookie'
import {
  earningsPeriod,
  getEarnings,
  type EarningsDay,
  type EarningsPeriod,
  type EarningsTotalsView,
} from '@/features/orders'
import { formatDateIsoKyiv } from '@/lib/datetime'
import { createMoney, Currency, formatMoney } from '@/lib/money'

export type AdminTotalsView = EarningsTotalsView & {
  // Null while the ad spend is not known: not connected or Google failed.
  readonly adSpendLabel: string | null
  readonly afterAdsLabel: string | null
}

export type AdminEarningsDay = EarningsDay & {
  readonly adSpendCents: number | null
}

export type AdminEarningsView = {
  readonly period: EarningsPeriod
  readonly collected: AdminTotalsView
  readonly all: AdminTotalsView
  readonly days: readonly AdminEarningsDay[]
  readonly adSpendState: AdSpendState
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
  const spendCents = adSpend.state === AdSpendState.Connected ? totalAdSpend(adSpend.days) : null

  return {
    period,
    collected: withAdSpend(earnings.collected, spendCents),
    all: withAdSpend(earnings.all, spendCents),
    days: withDailyAdSpend(earnings.days, adSpend),
    adSpendState: adSpend.state,
  }
}

function withAdSpend(totals: EarningsTotalsView, spendCents: number | null): AdminTotalsView {
  return {
    ...totals,
    adSpendLabel: spendCents === null ? null : money(spendCents),
    afterAdsLabel:
      spendCents === null ? null : money(earningsAfterAds(totals.earningsCents, spendCents)),
  }
}

function withDailyAdSpend(
  days: readonly EarningsDay[],
  adSpend: AdSpendReport,
): AdminEarningsDay[] {
  if (adSpend.state !== AdSpendState.Connected) {
    return days.map((day) => ({ ...day, adSpendCents: null }))
  }

  const byDay = adSpendByDay(adSpend.days)
  return days.map((day) => ({ ...day, adSpendCents: byDay.get(day.day) ?? 0 }))
}

function money(cents: number): string {
  return formatMoney(createMoney(cents, Currency.Uah))
}
