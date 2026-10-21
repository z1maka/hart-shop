import { describe, expect, it } from 'vitest'
import {
  isSizeAxisProminent,
  SizeAxis,
  sizeAxisOf,
  sizeDimensionsOf,
  sizeNoteOf,
} from '@/config/variant-size'

describe('sizeAxisOf', () => {
  it('asks for the Starlink model when every choice is a known dish', () => {
    expect(sizeAxisOf(['Gen 2', 'Gen 3 / Gen 4'])).toBe(SizeAxis.StarlinkModel)
    expect(sizeAxisOf(['Gen 3 / Gen 4'])).toBe(SizeAxis.StarlinkModel)
  })

  it('keeps the size for clothing, unknown dishes and anything mixed', () => {
    expect(sizeAxisOf(['S', 'M', 'L'])).toBe(SizeAxis.Size)
    expect(sizeAxisOf(['Gen 2', 'XL'])).toBe(SizeAxis.Size)
    expect(sizeAxisOf(['Gen 5'])).toBe(SizeAxis.Size)
    expect(sizeAxisOf(['toString'])).toBe(SizeAxis.Size)
    expect(sizeAxisOf([])).toBe(SizeAxis.Size)
  })
})

describe('isSizeAxisProminent', () => {
  it('spells out Starlink models and leaves clothing sizes as plain text', () => {
    expect(isSizeAxisProminent(SizeAxis.StarlinkModel)).toBe(true)
    expect(isSizeAxisProminent(SizeAxis.Size)).toBe(false)
  })
})

describe('sizeDimensionsOf and sizeNoteOf', () => {
  it('gives each Starlink model the dish it is cut to', () => {
    expect(sizeDimensionsOf('Gen 2')).toEqual({ widthMm: 513, heightMm: 303 })
    expect(sizeNoteOf('Gen 2')).toBe('513 × 303 мм')
    expect(sizeNoteOf('Gen 3 / Gen 4')).toBe('594 × 383 мм')
  })

  it('has nothing to add under a clothing size', () => {
    expect(sizeDimensionsOf('XL')).toBeNull()
    expect(sizeNoteOf('XL')).toBeNull()
    expect(sizeNoteOf('toString')).toBeNull()
  })
})
