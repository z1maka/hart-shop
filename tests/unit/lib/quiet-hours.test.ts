import { describe, expect, it } from 'vitest'
import { isQuietHour, kyivHour } from '@/lib/quiet-hours'

describe('quiet hours on Kyiv time', () => {
  it('reads the Kyiv hour in summer (UTC+3) and winter (UTC+2)', () => {
    expect(kyivHour(new Date('2026-07-01T20:00:00Z'))).toBe(23)
    expect(kyivHour(new Date('2026-12-01T21:00:00Z'))).toBe(23)
  })

  it('is quiet from 23:00 up to 08:00 and awake in between', () => {
    expect(isQuietHour(new Date('2026-07-01T19:59:00Z'))).toBe(false)
    expect(isQuietHour(new Date('2026-07-01T20:00:00Z'))).toBe(true)
    expect(isQuietHour(new Date('2026-07-02T04:59:00Z'))).toBe(true)
    expect(isQuietHour(new Date('2026-07-02T05:00:00Z'))).toBe(false)
    expect(isQuietHour(new Date('2026-12-01T06:00:00Z'))).toBe(false)
    expect(isQuietHour(new Date('2026-12-01T05:59:00Z'))).toBe(true)
  })
})
