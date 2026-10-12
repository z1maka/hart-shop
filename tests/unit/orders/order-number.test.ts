import { describe, expect, it } from 'vitest'
import { formatOrderNumber } from '@/features/orders/model/order-number'

describe('formatOrderNumber', () => {
  it('pads the sequence to a fixed width', () => {
    expect(formatOrderNumber(2026, 1)).toBe('FOX-2026-000001')
  })

  it('keeps the width once the counter grows', () => {
    expect(formatOrderNumber(2026, 123_456)).toBe('FOX-2026-123456')
  })

  it('wraps rather than widening past the sequence length', () => {
    expect(formatOrderNumber(2026, 1_000_001)).toBe('FOX-2026-000001')
  })
})
