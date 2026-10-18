import { describe, expect, it } from 'vitest'
import { legacyProductImageKey, nextImageKeyIndex, productImageKeys } from '@/lib/product-image-key'

describe('productImageKeys', () => {
  it('names the full shot and the square crop after the index and a token', () => {
    expect(productImageKeys('poncho', 3, 'a1b2c3d4')).toEqual({
      storageKey: 'products/poncho/3-a1b2c3d4.webp',
      squareStorageKey: 'products/poncho/3-a1b2c3d4-square.webp',
    })
  })

  it('never repeats a name for the same index', () => {
    const first = productImageKeys('poncho', 0)
    const second = productImageKeys('poncho', 0)

    expect(first.storageKey).not.toBe(second.storageKey)
    expect(first.storageKey).toMatch(/^products\/poncho\/0-[0-9a-f]{8}\.webp$/)
  })
})

describe('nextImageKeyIndex', () => {
  it('starts at zero for a product without photos', () => {
    expect(nextImageKeyIndex([])).toBe(0)
  })

  it('continues after the older plain names', () => {
    expect(nextImageKeyIndex(['products/p/0.webp', 'products/p/7.webp'])).toBe(8)
  })

  it('reads the current names with a token', () => {
    expect(nextImageKeyIndex(['products/p/3.webp', 'products/p/9-a1b2c3d4.webp'])).toBe(10)
  })

  it('ignores names it did not create', () => {
    expect(nextImageKeyIndex(['products/p/cover.webp', 'products/p/2.jpg'])).toBe(0)
  })
})

describe('legacyProductImageKey', () => {
  it('rebuilds the plain name the WordPress import gave a photo', () => {
    expect(legacyProductImageKey('poncho', 4)).toBe('products/poncho/4.webp')
  })
})
