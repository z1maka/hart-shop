import { describe, expect, it } from 'vitest'
import { calculateCartTotals, clampQuantity } from '@/features/cart/model/cart-math'
import { Currency } from '@/lib/money'

const line = (quantity: number, unitPriceCents: number, weightGrams = 500) => ({
  quantity,
  unitPriceCents,
  weightGrams,
})

describe('calculateCartTotals', () => {
  it('sums quantities, subtotal and weight in hryvnia kopiykas', () => {
    const totals = calculateCartTotals([line(2, 150_00), line(1, 99_00, 1200)])

    expect(totals.itemCount).toBe(3)
    expect(totals.lineCount).toBe(2)
    expect(totals.subtotal.amountCents).toBe(399_00)
    expect(totals.subtotal.currency).toBe(Currency.Uah)
    expect(totals.weightGrams).toBe(2200)
  })

  it('refuses a non-integer price', () => {
    expect(() => calculateCartTotals([line(1, 10.5)])).toThrow()
  })

  it('refuses a zero quantity', () => {
    expect(() => calculateCartTotals([line(0, 100)])).toThrow()
  })
})

describe('clampQuantity', () => {
  it('clamps into the allowed range', () => {
    expect(clampQuantity(0)).toBe(1)
    expect(clampQuantity(500)).toBe(99)
    expect(clampQuantity(5)).toBe(5)
  })

  it('refuses fractions', () => {
    expect(() => clampQuantity(1.5)).toThrow()
  })
})
