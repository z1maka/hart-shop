import { describe, expect, it } from 'vitest'
import { receivingLimitGrams } from '@/features/shipping/model/parcel-fit'

describe('receivingLimitGrams', () => {
  it('prefers the per-place limit', () => {
    expect(receivingLimitGrams(30, 0)).toBe(30_000)
  })

  it('falls back to the total limit of lockers and mini branches', () => {
    expect(receivingLimitGrams(0, 20)).toBe(20_000)
  })

  it('treats two zeros as no stated limit', () => {
    expect(receivingLimitGrams(0, 0)).toBeNull()
  })
})
