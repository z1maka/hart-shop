import { describe, expect, it } from 'vitest'
import { isWholesaleLine, wholesaleAhead } from '@/features/cart/model/wholesale-line'

const LINE = { regularUnitPriceCents: 235000, wholesaleMinQty: 10, wholesaleUnitPriceCents: 220000 }

describe('wholesaleAhead', () => {
  it('counts what is missing to the tier across the product', () => {
    expect(wholesaleAhead(LINE, 9)).toEqual({ minQuantity: 10, unitPriceCents: 220000, missing: 1 })
  })

  it('is null once the tier is reached, absent, or no cheaper', () => {
    expect(wholesaleAhead(LINE, 10)).toBeNull()
    expect(wholesaleAhead({ ...LINE, wholesaleMinQty: null, wholesaleUnitPriceCents: null }, 1)).toBeNull()
    expect(wholesaleAhead({ ...LINE, wholesaleUnitPriceCents: 235000 }, 1)).toBeNull()
  })
})

describe('isWholesaleLine', () => {
  it('tags a line by the tier, not by a price that merely drifted', () => {
    expect(isWholesaleLine(LINE, 10)).toBe(true)
    expect(isWholesaleLine(LINE, 9)).toBe(false)
    expect(isWholesaleLine({ ...LINE, wholesaleMinQty: null, wholesaleUnitPriceCents: null }, 50)).toBe(false)
  })
})
