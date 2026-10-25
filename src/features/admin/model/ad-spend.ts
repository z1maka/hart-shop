// Google Ads spend per day for the earnings board. A source that is not set
// up says so instead of reporting zero, so «0 ₴» on the board always means
// nothing was spent.

export type AdSpendDay = {
  // «2026-10-25» on the shop's clock.
  readonly day: string
  readonly costCents: number
}

export const AdSpendState = {
  NotConnected: 'not-connected',
  Connected: 'connected',
  Failed: 'failed',
} as const

export type AdSpendState = (typeof AdSpendState)[keyof typeof AdSpendState]

export type AdSpendResult =
  | { readonly state: typeof AdSpendState.NotConnected }
  | { readonly state: typeof AdSpendState.Connected; readonly days: readonly AdSpendDay[] }

// What the board ends up with: a source that failed leaves only its state.
export type AdSpendReport = AdSpendResult | { readonly state: typeof AdSpendState.Failed }

// Google Analytics today; another ad network is another source, not a change
// to the board.
export type AdSpendSource = {
  dailySpend(from: string, to: string): Promise<AdSpendResult>
}

export function totalAdSpend(days: readonly AdSpendDay[]): number {
  return days.reduce((total, day) => total + day.costCents, 0)
}

export function adSpendByDay(days: readonly AdSpendDay[]): ReadonlyMap<string, number> {
  const byDay = new Map<string, number>()
  days.forEach((day) => byDay.set(day.day, (byDay.get(day.day) ?? 0) + day.costCents))
  return byDay
}

// What one order cost in ads over the period; none without orders.
export function adSpendPerOrder(spendCents: number, orders: number): number | null {
  return orders === 0 ? null : Math.round(spendCents / orders)
}
