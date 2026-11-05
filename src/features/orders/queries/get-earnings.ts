import { SalesChannel } from '@/db/enums'
import {
  earningsByDay,
  earningsTotals,
  EarningsScope,
  rowsOfChannel,
  type ChannelFilter,
  type EarningsDay,
  type EarningsTotals,
} from '@/features/orders/model/earnings'
import type { EarningsPeriod } from '@/features/orders/model/earnings-period'
import { earningsRepository } from '@/features/orders/repository/earnings-repository'
import { DISPLAY_TIME_ZONE } from '@/lib/datetime'

export type EarningsView = {
  readonly channel: ChannelFilter
  // The parcels the buyers collected, the ones still to collect, and both,
  // of the channel picked.
  readonly collected: EarningsTotals
  readonly pending: EarningsTotals
  readonly all: EarningsTotals
  // Per day, in kopiykas, for the chart.
  readonly days: readonly EarningsDay[]
  // Every channel side by side, whichever is picked.
  readonly byChannel: Readonly<Record<SalesChannel, EarningsTotals>>
  readonly total: EarningsTotals
}

// The admin only: the caller checks the session.
export async function getEarnings(
  period: EarningsPeriod,
  channel: ChannelFilter,
): Promise<EarningsView> {
  const rows = await earningsRepository.findDays(period.from, period.to, DISPLAY_TIME_ZONE)
  const picked = rowsOfChannel(rows, channel)

  return {
    channel,
    collected: earningsTotals(picked, EarningsScope.Collected),
    pending: earningsTotals(picked, EarningsScope.Pending),
    all: earningsTotals(picked, EarningsScope.All),
    days: earningsByDay(picked, period.from, period.to),
    byChannel: {
      [SalesChannel.Site]: earningsTotals(
        rowsOfChannel(rows, SalesChannel.Site),
        EarningsScope.All,
      ),
      [SalesChannel.Dropship]: earningsTotals(
        rowsOfChannel(rows, SalesChannel.Dropship),
        EarningsScope.All,
      ),
    },
    total: earningsTotals(rows, EarningsScope.All),
  }
}
