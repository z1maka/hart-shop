import { describe, expect, it } from 'vitest'
import { SalesChannel } from '@/db/enums'
import {
  ChannelFilter,
  countsAdSpend,
  earningsPerUnit,
  parseChannelFilter,
  rowsOfChannel,
  daysBetween,
  earningsByDay,
  earningsTotals,
  EarningsScope,
  shiftDays,
  type EarningsDayRow,
} from '@/features/orders/model/earnings'

function row(overrides: Partial<EarningsDayRow>): EarningsDayRow {
  return {
    day: '2026-10-20',
    isCollected: false,
    channel: SalesChannel.Site,
    orders: 1,
    units: 1,
    revenueCents: 0,
    costedRevenueCents: 0,
    costCents: 0,
    uncostedUnits: 0,
    ...overrides,
  }
}

const collected = row({
  day: '2026-10-20',
  isCollected: true,
  orders: 2,
  units: 3,
  revenueCents: 1_000_000,
  costedRevenueCents: 1_000_000,
  costCents: 600_000,
})
const onTheWay = row({
  day: '2026-10-22',
  orders: 1,
  units: 2,
  revenueCents: 500_000,
  costedRevenueCents: 300_000,
  costCents: 200_000,
  uncostedUnits: 1,
})

describe('earningsTotals', () => {
  it('counts only collected parcels in the actual scope', () => {
    expect(earningsTotals([collected, onTheWay], EarningsScope.Collected)).toEqual({
      orders: 2,
      units: 3,
      revenueCents: 1_000_000,
      costCents: 600_000,
      earningsCents: 400_000,
      marginPercent: 40,
      uncostedUnits: 0,
      uncostedRevenueCents: 0,
    })
  })

  it('adds the parcels still on their way in the all scope', () => {
    const totals = earningsTotals([collected, onTheWay], EarningsScope.All)

    expect(totals.orders).toBe(3)
    expect(totals.revenueCents).toBe(1_500_000)
    expect(totals.earningsCents).toBe(500_000)
  })

  it('keeps the parcels still to be collected apart', () => {
    const totals = earningsTotals([collected, onTheWay], EarningsScope.Pending)

    expect(totals.orders).toBe(1)
    expect(totals.revenueCents).toBe(500_000)
    expect(totals.earningsCents).toBe(100_000)
  })

  it('never counts a line without a cost as pure profit', () => {
    const totals = earningsTotals([onTheWay], EarningsScope.All)

    expect(totals.earningsCents).toBe(100_000)
    expect(totals.marginPercent).toBe(33)
    expect(totals.uncostedUnits).toBe(1)
    expect(totals.uncostedRevenueCents).toBe(200_000)
  })

  it('has no margin when nothing sold had a cost', () => {
    const uncosted = row({ revenueCents: 90_000, uncostedUnits: 1 })

    expect(earningsTotals([uncosted], EarningsScope.All).marginPercent).toBeNull()
    expect(earningsTotals([], EarningsScope.All).marginPercent).toBeNull()
  })
})

describe('earningsByDay', () => {
  it('lists every day of the period, a quiet day at zero', () => {
    expect(earningsByDay([collected, onTheWay], '2026-10-20', '2026-10-22')).toEqual([
      { day: '2026-10-20', collectedCents: 400_000, allCents: 400_000, orders: 2 },
      { day: '2026-10-21', collectedCents: 0, allCents: 0, orders: 0 },
      { day: '2026-10-22', collectedCents: 0, allCents: 100_000, orders: 1 },
    ])
  })

  it('adds the collected and the uncollected rows of one day', () => {
    const sameDay = { ...onTheWay, day: '2026-10-20' }

    expect(earningsByDay([collected, sameDay], '2026-10-20', '2026-10-20')).toEqual([
      { day: '2026-10-20', collectedCents: 400_000, allCents: 500_000, orders: 3 },
    ])
  })
})

describe('daysBetween', () => {
  it('includes both ends and crosses a month', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ])
  })

  it('keeps calendar days across the clock change', () => {
    expect(daysBetween('2026-10-24', '2026-10-26')).toHaveLength(3)
  })

  it('is empty for a reversed or broken range', () => {
    expect(daysBetween('2026-10-25', '2026-10-24')).toEqual([])
    expect(daysBetween('2026-13-45', '2026-10-24')).toEqual([])
  })
})

describe('shiftDays', () => {
  it('moves across a year', () => {
    expect(shiftDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(shiftDays('2026-02-28', 1)).toBe('2026-03-01')
  })
})

describe('sales channels', () => {
  // The first partner order (05.11.2026): 2 × FX14 multicam at the drop
  // price 3 550 ₴, the workshop's 2 300 ₴.
  const partnerSale = row({
    channel: SalesChannel.Dropship,
    units: 2,
    revenueCents: 710_000,
    costedRevenueCents: 710_000,
    costCents: 460_000,
  })
  const siteSale = row({
    units: 1,
    revenueCents: 440_000,
    costedRevenueCents: 440_000,
    costCents: 230_000,
  })

  it('counts a partner order at the drop price, not the retail one', () => {
    const totals = earningsTotals(
      rowsOfChannel([siteSale, partnerSale], ChannelFilter.Dropship),
      EarningsScope.All,
    )

    expect(totals.revenueCents).toBe(710_000)
    expect(totals.earningsCents).toBe(250_000)
    expect(earningsPerUnit(totals)).toBe(125_000)
  })

  it('keeps every row for «all» and only the site for «site»', () => {
    expect(rowsOfChannel([siteSale, partnerSale], ChannelFilter.All)).toHaveLength(2)
    expect(rowsOfChannel([siteSale, partnerSale], ChannelFilter.Site)).toEqual([siteSale])
  })

  it('reads the filter from the address, falling back to all', () => {
    expect(parseChannelFilter('dropship')).toBe(ChannelFilter.Dropship)
    expect(parseChannelFilter('site')).toBe(ChannelFilter.Site)
    expect(parseChannelFilter('partners')).toBe(ChannelFilter.All)
    expect(parseChannelFilter(undefined)).toBe(ChannelFilter.All)
  })

  it('counts the ads wherever the site is on the board, never for the partners alone', () => {
    expect(countsAdSpend(ChannelFilter.All)).toBe(true)
    expect(countsAdSpend(ChannelFilter.Site)).toBe(true)
    expect(countsAdSpend(ChannelFilter.Dropship)).toBe(false)
  })

  it('has no earnings per unit without a costed unit', () => {
    const uncosted = row({ units: 2, uncostedUnits: 2, revenueCents: 100 })
    expect(earningsPerUnit(earningsTotals([uncosted], EarningsScope.All))).toBeNull()
  })
})
