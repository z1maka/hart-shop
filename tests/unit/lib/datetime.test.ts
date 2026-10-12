import { describe, expect, it } from 'vitest'
import {
  daysAgo,
  formatDateIsoKyiv,
  formatDateUk,
  hoursAgo,
  previousIsoDay,
  wholeHoursBetween,
} from '@/lib/datetime'

describe('formatDateIsoKyiv', () => {
  it('names the Kyiv calendar day, not the UTC one', () => {
    // 22:30 UTC on the 15th is already 01:30 on the 16th in Kyiv.
    expect(formatDateIsoKyiv(new Date('2026-09-15T22:30:00Z'))).toBe('2026-09-16')
  })
})

describe('formatDateUk', () => {
  it('spells the same day in Ukrainian without the trailing «р.»', () => {
    expect(formatDateUk(new Date('2026-09-15T22:30:00Z'))).toBe('16 вересня 2026')
  })
})

describe('time arithmetic', () => {
  const now = new Date('2026-09-26T12:00:00Z')

  it('steps back by whole hours and days', () => {
    expect(hoursAgo(now, 2).toISOString()).toBe('2026-09-26T10:00:00.000Z')
    expect(daysAgo(now, 14).toISOString()).toBe('2026-09-12T12:00:00.000Z')
  })

  it('counts whole hours and never goes negative', () => {
    expect(wholeHoursBetween(new Date('2026-09-26T09:30:00Z'), now)).toBe(2)
    expect(wholeHoursBetween(new Date('2026-09-26T12:30:00Z'), now)).toBe(0)
  })
})

describe('previousIsoDay', () => {
  it('steps back one calendar day across month and year edges', () => {
    expect(previousIsoDay('2026-09-27')).toBe('2026-09-26')
    expect(previousIsoDay('2026-10-01')).toBe('2026-09-30')
    expect(previousIsoDay('2027-01-01')).toBe('2026-12-31')
    expect(previousIsoDay('2028-03-01')).toBe('2028-02-29')
  })
})
