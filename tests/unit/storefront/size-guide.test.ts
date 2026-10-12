import { describe, expect, it } from 'vitest'
import { sizeGuideRowsFor } from '@/config/size-guide'

describe('sizeGuideRowsFor', () => {
  it("shows the grid only for the sizes a product is sold in, in the grid's order", () => {
    expect(sizeGuideRowsFor(['XL', 'S', 'M', 'L']).map((row) => row.size)).toEqual([
      'S',
      'M',
      'L',
      'XL',
    ])
  })

  it('offers no table for sizes that name their own measure', () => {
    expect(sizeGuideRowsFor(['M (55-59 см)', 'L (58-62 см)'])).toEqual([])
    expect(sizeGuideRowsFor([])).toEqual([])
  })
})
