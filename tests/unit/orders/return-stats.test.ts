import { describe, expect, it } from 'vitest'
import {
  isMonthKey,
  monthLabel,
  recentMonthKeys,
  returnSharePercent,
} from '@/features/orders/model/return-stats'
import { OrderShelf, parseOrderShelf } from '@/features/orders/model/order-shelves'

describe('recentMonthKeys', () => {
  it('counts back across a year boundary, newest first', () => {
    const now = new Date('2026-02-10T12:00:00Z')
    expect(recentMonthKeys(now, 4, 'Europe/Kyiv')).toEqual([
      '2026-02',
      '2026-01',
      '2025-12',
      '2025-11',
    ])
  })

  it('reads the month in the shop time zone, not in UTC', () => {
    // 22:30 UTC on 31 August is already 1 September in Kyiv.
    const now = new Date('2026-08-31T22:30:00Z')
    expect(recentMonthKeys(now, 1, 'Europe/Kyiv')).toEqual(['2026-09'])
  })
})

describe('isMonthKey', () => {
  it('takes a year and a real month only', () => {
    expect(isMonthKey('2026-09')).toBe(true)
    expect(isMonthKey('2026-12')).toBe(true)
    for (const value of [
      '2026-13',
      '2026-00',
      '2026-9',
      '26-09',
      '2026-09-01',
      "2026-09' or 1=1",
    ]) {
      expect(isMonthKey(value)).toBe(false)
    }
  })
})

describe('returnSharePercent', () => {
  it('rounds to whole percent and has no share without parcels', () => {
    expect(returnSharePercent({ month: '2026-08', sent: 30, returned: 4, returnedCents: 0 })).toBe(
      13,
    )
    expect(
      returnSharePercent({ month: '2026-09', sent: 0, returned: 0, returnedCents: 0 }),
    ).toBeNull()
  })
})

describe('monthLabel', () => {
  it('names the month in Russian with a capital letter', () => {
    expect(monthLabel('2026-09')).toBe('Сентябрь 2026')
    expect(monthLabel('2025-12')).toBe('Декабрь 2025')
  })
})

describe('parseOrderShelf', () => {
  it('opens the day’s work for anything it does not know', () => {
    expect(parseOrderShelf('returns')).toBe(OrderShelf.Returns)
    expect(parseOrderShelf('archive')).toBe(OrderShelf.Archive)
    expect(parseOrderShelf(undefined)).toBe(OrderShelf.Active)
    expect(parseOrderShelf(['returns'])).toBe(OrderShelf.Active)
  })
})
