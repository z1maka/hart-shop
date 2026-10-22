import { describe, expect, it } from 'vitest'
import { archivedProductDestination } from '@/features/catalog/model/archived-product'

describe('archivedProductDestination', () => {
  it('moves an archived product to the shelf it stood on', () => {
    expect(
      archivedProductDestination({ categorySlug: 'anti-dronovi-nakidki', isCategoryVisible: true }),
    ).toBe('/product-category/anti-dronovi-nakidki/')
  })

  it('encodes a Cyrillic shelf for the Location header', () => {
    expect(
      archivedProductDestination({ categorySlug: 'чохли-для-starlink', isCategoryVisible: true }),
    ).toBe('/product-category/%D1%87%D0%BE%D1%85%D0%BB%D0%B8-%D0%B4%D0%BB%D1%8F-starlink/')
  })

  it('falls back to the shop when the shelf is hidden', () => {
    expect(
      archivedProductDestination({ categorySlug: 'sholomi-bronepliti', isCategoryVisible: false }),
    ).toBe('/shop/')
  })

  it('falls back to the shop when the product lost its category', () => {
    expect(archivedProductDestination({ categorySlug: null, isCategoryVisible: null })).toBe(
      '/shop/',
    )
  })
})
