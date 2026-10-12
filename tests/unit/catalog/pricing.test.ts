import { describe, expect, it } from 'vitest'
import {
  announcedWholesale,
  isValidWholesale,
  unitPriceCentsFor,
  wholesaleTierOf,
  wholesaleUnitPriceAt,
} from '@/features/catalog/model/pricing'

const PONCHO = { priceCents: 235000, salePriceCents: null, wholesale: { minQuantity: 10, priceCents: 220000 } }

describe('unitPriceCentsFor', () => {
  it('charges the single price below the tier and the wholesale price from it', () => {
    expect(unitPriceCentsFor(PONCHO, 1)).toBe(235000)
    expect(unitPriceCentsFor(PONCHO, 9)).toBe(235000)
    expect(unitPriceCentsFor(PONCHO, 10)).toBe(220000)
    expect(unitPriceCentsFor(PONCHO, 40)).toBe(220000)
  })

  it('never charges more than a single unit costs on sale', () => {
    const onSale = { ...PONCHO, salePriceCents: 210000 }

    expect(unitPriceCentsFor(onSale, 10)).toBe(210000)
    expect(unitPriceCentsFor({ ...PONCHO, salePriceCents: 225000 }, 10)).toBe(220000)
  })

  it('is the plain price without a tier', () => {
    expect(unitPriceCentsFor({ ...PONCHO, wholesale: null }, 50)).toBe(235000)
  })
})

describe('wholesaleTierOf', () => {
  it('needs both halves to be a tier', () => {
    expect(wholesaleTierOf(10, 220000)).toEqual({ minQuantity: 10, priceCents: 220000 })
    expect(wholesaleTierOf(10, null)).toBeNull()
    expect(wholesaleTierOf(null, 220000)).toBeNull()
  })
})

describe('isValidWholesale', () => {
  it('accepts a tier above one unit that undercuts the single price', () => {
    expect(isValidWholesale(235000, null, { minQuantity: 10, priceCents: 220000 })).toBe(true)
    expect(isValidWholesale(235000, null, null)).toBe(true)
  })

  it.each([
    ['from one unit', { minQuantity: 1, priceCents: 220000 }, null],
    ['not below the price', { minQuantity: 10, priceCents: 235000 }, null],
    ['not below the sale price', { minQuantity: 10, priceCents: 220000 }, 210000],
    ['free', { minQuantity: 10, priceCents: 0 }, null],
  ])('rejects a tier %s', (_, tier, salePriceCents) => {
    expect(isValidWholesale(235000, salePriceCents, tier)).toBe(false)
  })
})

describe('announcedWholesale', () => {
  it('announces exactly the tier the cart applies, with the rounded cut', () => {
    expect(announcedWholesale(PONCHO)).toEqual({ minQuantity: 10, priceCents: 220000, discountPercent: 6 })
    expect(announcedWholesale({ ...PONCHO, wholesale: null })).toBeNull()
    expect(announcedWholesale({ ...PONCHO, salePriceCents: 210000 })).toBeNull()
  })

  it('keeps a cut too small to round, so the page and the cart agree', () => {
    const tiny = { ...PONCHO, wholesale: { minQuantity: 10, priceCents: 234500 } }

    expect(announcedWholesale(tiny)?.discountPercent).toBe(0)
    expect(wholesaleUnitPriceAt(tiny, 10)).toBe(234500)
  })
})

describe('wholesaleUnitPriceAt', () => {
  it('is the tier price from the quantity up and null below it', () => {
    expect(wholesaleUnitPriceAt(PONCHO, 9)).toBeNull()
    expect(wholesaleUnitPriceAt(PONCHO, 10)).toBe(220000)
  })
})
