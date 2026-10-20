import { describe, expect, it } from 'vitest'
import { SizeAxis, sizeAxisOf } from '@/config/variant-size'

describe('sizeAxisOf', () => {
  it('asks for the Starlink model when every choice is a dish generation', () => {
    expect(sizeAxisOf(['Gen 2', 'Gen 3 / Gen 4'])).toBe(SizeAxis.StarlinkModel)
  })

  it('keeps the size for clothing and for anything mixed', () => {
    expect(sizeAxisOf(['S', 'M', 'L'])).toBe(SizeAxis.Size)
    expect(sizeAxisOf(['Gen 2', 'XL'])).toBe(SizeAxis.Size)
    expect(sizeAxisOf(['General'])).toBe(SizeAxis.Size)
    expect(sizeAxisOf([])).toBe(SizeAxis.Size)
  })
})
