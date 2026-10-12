import { describe, expect, it } from 'vitest'
import { archivedProductDestination } from '@/features/catalog/model/archived-product'

describe('archivedProductDestination', () => {
  it('moves an archived product to the shelf it stood on', () => {
    expect(
      archivedProductDestination({ categorySlug: 'anti-dronovi-nakidki', isCategoryVisible: true }),
    ).toBe('/product-category/anti-dronovi-nakidki/')
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
