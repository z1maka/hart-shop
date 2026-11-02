import { describe, expect, it } from 'vitest'
import { requestedSizeOf } from '@/features/catalog/model/requested-size'

const STARLINK_MODELS = ['Gen 2', 'Gen 3 / Gen 4']

describe('requestedSizeOf', () => {
  it('reads the size the link names', () => {
    expect(requestedSizeOf({ size: 'Gen 3 / Gen 4' }, STARLINK_MODELS)).toBe('Gen 3 / Gen 4')
  })

  it('ignores a size the product does not have', () => {
    expect(requestedSizeOf({ size: 'Mini' }, STARLINK_MODELS)).toBeNull()
  })

  it('ignores a missing or repeated parameter', () => {
    expect(requestedSizeOf({}, STARLINK_MODELS)).toBeNull()
    expect(requestedSizeOf({ size: ['Gen 2', 'Gen 3 / Gen 4'] }, STARLINK_MODELS)).toBeNull()
  })
})
