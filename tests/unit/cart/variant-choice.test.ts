import { describe, expect, it } from 'vitest'
import {
  colorsOf,
  initialPickOf,
  sizesOf,
  variantOf,
  type ChoosableVariant,
} from '@/features/cart/model/variant-choice'

const MESH_COVER: readonly ChoosableVariant[] = [
  { id: 'mc-2', color: 'Мультикам', size: 'Gen 2', isAvailable: true },
  { id: 'mc-3', color: 'Мультикам', size: 'Gen 3 / Gen 4', isAvailable: true },
  { id: 'px-2', color: 'Піксель', size: 'Gen 2', isAvailable: true },
  { id: 'px-3', color: 'Піксель', size: 'Gen 3 / Gen 4', isAvailable: false },
]

const PONCHO: readonly ChoosableVariant[] = [
  { id: 'olive', color: 'Олива', size: null, isAvailable: true },
  { id: 'pixel', color: 'Піксель', size: null, isAvailable: true },
]

describe('colorsOf and sizesOf', () => {
  it('lists each colour once and the sizes sold in the chosen one', () => {
    expect(colorsOf(MESH_COVER)).toEqual(['Мультикам', 'Піксель'])
    expect(sizesOf(MESH_COVER, 'Піксель')).toEqual(['Gen 2', 'Gen 3 / Gen 4'])
    expect(sizesOf(PONCHO, 'Олива')).toEqual([])
  })
})

describe('variantOf', () => {
  it('waits for a model before naming a variant', () => {
    expect(variantOf(MESH_COVER, { color: 'Мультикам', size: null })).toBeNull()
    expect(variantOf(MESH_COVER, { color: 'Мультикам', size: 'Gen 3 / Gen 4' })?.id).toBe('mc-3')
  })

  it('names a colour-only variant by its colour', () => {
    expect(variantOf(PONCHO, { color: 'Піксель', size: null })?.id).toBe('pixel')
  })

  it('finds nothing for a pick no variant sells', () => {
    expect(variantOf(MESH_COVER, { color: 'Олива', size: 'Gen 2' })).toBeNull()
  })
})

describe('initialPickOf', () => {
  it('opens on the colour asked for, with no model chosen', () => {
    expect(initialPickOf(MESH_COVER, 'Піксель')).toEqual({ color: 'Піксель', size: null })
  })

  it('falls back to the first colour and takes a size only when there is one', () => {
    expect(initialPickOf(MESH_COVER, 'Олива')).toEqual({ color: 'Мультикам', size: null })
    expect(
      initialPickOf([{ id: 'one', color: 'Олива', size: 'Gen 2', isAvailable: true }], null),
    ).toEqual({ color: 'Олива', size: 'Gen 2' })
  })
})
