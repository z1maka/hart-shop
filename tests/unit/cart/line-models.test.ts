import { describe, expect, it } from 'vitest'
import { lineModelOptionsOf } from '@/features/cart/model/line-models'

describe('lineModelOptionsOf', () => {
  it('offers a cover the other Starlink model, out of stock ones disabled', () => {
    expect(
      lineModelOptionsOf(
        [
          { variantId: 'gen2', size: 'Gen 2', stockQty: 5 },
          { variantId: 'gen3', size: 'Gen 3 / Gen 4', stockQty: 0 },
        ],
        1,
      ),
    ).toEqual([
      { variantId: 'gen2', size: 'Gen 2', isAvailable: true },
      { variantId: 'gen3', size: 'Gen 3 / Gen 4', isAvailable: false },
    ])
  })

  it('offers nothing for a single model or for clothing sizes', () => {
    expect(lineModelOptionsOf([{ variantId: 'gen2', size: 'Gen 2', stockQty: 5 }], 1)).toEqual([])
    expect(
      lineModelOptionsOf(
        [
          { variantId: 'm', size: 'M', stockQty: 5 },
          { variantId: 'l', size: 'L', stockQty: 5 },
        ],
        1,
      ),
    ).toEqual([])
  })

  it('closes a model whose stock cannot take the whole line', () => {
    const options = lineModelOptionsOf(
      [
        { variantId: 'gen2', size: 'Gen 2', stockQty: 5 },
        { variantId: 'gen3', size: 'Gen 3 / Gen 4', stockQty: 2 },
      ],
      3,
    )
    expect(options.map((option) => option.isAvailable)).toEqual([true, false])
  })
})
