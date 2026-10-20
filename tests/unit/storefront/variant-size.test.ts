import { describe, expect, it } from 'vitest'
import { SizeAxis, sizeAxisOf, sizeNoteOf } from '@/config/variant-size'

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

describe('sizeNoteOf', () => {
  it('gives each Starlink model the dish it is cut to', () => {
    expect(sizeNoteOf('Gen 2')).toBe('513 × 303 мм')
    expect(sizeNoteOf('Gen 3 / Gen 4')).toBe('594 × 383 мм')
  })

  it('has nothing to add under a clothing size', () => {
    expect(sizeNoteOf('XL')).toBeNull()
    expect(sizeNoteOf('toString')).toBeNull()
  })
})
