import { describe, expect, it } from 'vitest'
import { packingCutoff } from '@/features/orders/model/auto-packing'

describe('packingCutoff', () => {
  it('reaches back the given number of hours', () => {
    const now = new Date('2026-09-19T12:00:00Z')
    expect(packingCutoff(now, 2).toISOString()).toBe('2026-09-19T10:00:00.000Z')
  })

  it('leaves the moment itself for zero hours', () => {
    const now = new Date('2026-09-19T12:00:00Z')
    expect(packingCutoff(now, 0).getTime()).toBe(now.getTime())
  })
})
