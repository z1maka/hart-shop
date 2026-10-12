import { describe, expect, it } from 'vitest'
import {
  isWeekKey,
  recentWeekKeys,
  sharePercent,
  weekLabel,
} from '@/features/orders/model/traffic-weeks'

describe('recentWeekKeys', () => {
  it('names weeks by their Monday on Kyiv’s clock, newest first', () => {
    // Saturday 10.10.2026, 12:00 in Kyiv.
    expect(recentWeekKeys(new Date('2026-10-10T09:00:00Z'), 3, 'Europe/Kyiv')).toEqual([
      '2026-10-05',
      '2026-09-28',
      '2026-09-21',
    ])
  })

  it('starts a new week at Monday midnight in Kyiv, not in UTC', () => {
    // Monday 12.10.2026, 01:30 in Kyiv — still Sunday in UTC.
    expect(recentWeekKeys(new Date('2026-10-11T22:30:00Z'), 1, 'Europe/Kyiv')).toEqual([
      '2026-10-12',
    ])
  })

  it('counts Sunday into the week it ends', () => {
    expect(recentWeekKeys(new Date('2026-10-11T18:00:00Z'), 1, 'Europe/Kyiv')).toEqual([
      '2026-10-05',
    ])
  })
})

describe('isWeekKey', () => {
  it('accepts a Monday only', () => {
    expect(isWeekKey('2026-10-05')).toBe(true)
    expect(isWeekKey('2026-10-06')).toBe(false)
    expect(isWeekKey('2026-02-30')).toBe(false)
    expect(isWeekKey('2026-10')).toBe(false)
  })
})

describe('weekLabel', () => {
  it('names a week inside one month', () => {
    expect(weekLabel('2026-10-05')).toBe('5–11 октября 2026')
  })

  it('names a week across two months', () => {
    expect(weekLabel('2026-09-28')).toBe('28 сентября – 4 октября 2026')
  })

  it('names a week across two years', () => {
    expect(weekLabel('2026-12-28')).toBe('28 декабря 2026 – 3 января 2027')
  })
})

describe('sharePercent', () => {
  it('is the part of the week’s sum, none for an empty week', () => {
    expect(sharePercent(4100, 12300)).toBe(33)
    expect(sharePercent(0, 0)).toBeNull()
  })
})
