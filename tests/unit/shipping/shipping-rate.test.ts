import { describe, expect, it } from 'vitest'
import { shippingRateCentsFor } from '@/config/delivery'

describe('shippingRateCentsFor', () => {
  it('charges the small-parcel rate up to two kilograms inclusive', () => {
    expect(shippingRateCentsFor(350)).toBe(10_000)
    expect(shippingRateCentsFor(2_000)).toBe(10_000)
  })

  it('charges the medium-parcel rate above two and up to ten kilograms', () => {
    expect(shippingRateCentsFor(2_001)).toBe(15_000)
    expect(shippingRateCentsFor(10_000)).toBe(15_000)
  })

  it('charges the large-parcel rate above ten kilograms', () => {
    expect(shippingRateCentsFor(10_001)).toBe(22_000)
  })

  it('quotes nothing for a product without a weight', () => {
    expect(shippingRateCentsFor(0)).toBeNull()
  })
})
