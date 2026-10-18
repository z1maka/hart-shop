import { describe, expect, it } from 'vitest'
import {
  catalogPositionInput,
  discountPercent,
  gramsToKilosInput,
  hryvniasToKopiykas,
  kilosToGrams,
  isValidSalePrice,
  parseCatalogPosition,
  parseDecimalInput,
  parseSpecs,
  parseStock,
  parseVariantCovers,
  nextSlug,
} from '@/features/admin/model/product-form'

describe('parseSpecs', () => {
  it('keeps the rows that carry both halves, in order', () => {
    const specs = parseSpecs(['Size', 'Fabric'], ['210 × 145 cm', 'Oxford'])

    expect(specs).toEqual([
      { label: 'Size', value: '210 × 145 cm' },
      { label: 'Fabric', value: 'Oxford' },
    ])
  })

  it('drops a row with a blank half — that is how the editor removes one', () => {
    expect(parseSpecs(['Size', '', 'Fabric'], ['210 cm', 'orphan value', ''])).toEqual([
      { label: 'Size', value: '210 cm' },
    ])
  })

  it('trims what the operator typed', () => {
    expect(parseSpecs(['  Size  '], ['  210 cm '])).toEqual([{ label: 'Size', value: '210 cm' }])
  })

  it('survives a values array shorter than the labels array', () => {
    expect(parseSpecs(['Size', 'Fabric'], ['210 cm'])).toEqual([{ label: 'Size', value: '210 cm' }])
  })
})

describe('parseStock', () => {
  it('pairs every variant with its quantity', () => {
    expect(parseStock(['a', 'b'], ['4', '0'])).toEqual({ a: 4, b: 0 })
  })

  it.each([
    ['a fractional quantity', ['a'], ['1.5']],
    ['a negative quantity', ['a'], ['-1']],
    ['a quantity that is not a number', ['a'], ['many']],
    ['a missing quantity', ['a', 'b'], ['4']],
    ['a blank variant id', [''], ['4']],
  ])('refuses %s', (_case, ids, quantities) => {
    expect(parseStock(ids, quantities)).toBeNull()
  })
})

describe('parseVariantCovers', () => {
  it('pairs every variant with the photo chosen for it, blank meaning none', () => {
    expect(parseVariantCovers(['a', 'b'], ['products/p/2.webp', ' '])).toEqual({
      a: 'products/p/2.webp',
      b: null,
    })
  })

  it.each([
    ['a form that answers for fewer variants', ['a', 'b'], ['products/p/2.webp']],
    ['a form that answers for more variants', ['a'], ['products/p/2.webp', '']],
    ['a blank variant id', [''], ['products/p/2.webp']],
  ])('refuses %s', (_case, ids, keys) => {
    expect(parseVariantCovers(ids, keys)).toBeNull()
  })
})

describe('isValidSalePrice', () => {
  it('accepts no sale price and one below the regular price', () => {
    expect(isValidSalePrice(220_000, null)).toBe(true)
    expect(isValidSalePrice(220_000, 180_000)).toBe(true)
  })

  it('refuses a sale price that is not lower, or zero', () => {
    expect(isValidSalePrice(220_000, 220_000)).toBe(false)
    expect(isValidSalePrice(220_000, 250_000)).toBe(false)
    expect(isValidSalePrice(220_000, 0)).toBe(false)
  })
})

describe('discountPercent', () => {
  it('rounds the discount to whole percent', () => {
    expect(discountPercent(220_000, 180_000)).toBe(18)
    expect(discountPercent(295_000, 236_000)).toBe(20)
  })

  it('has no discount without a valid sale price', () => {
    expect(discountPercent(220_000, null)).toBeNull()
    expect(discountPercent(220_000, 230_000)).toBeNull()
  })
})

describe('parseDecimalInput', () => {
  it('reads digits with a dot or a comma, as the admin types them', () => {
    expect(parseDecimalInput('1250')).toBe(1250)
    expect(parseDecimalInput(' 1250,5 ')).toBe(1250.5)
    expect(parseDecimalInput('0.125')).toBe(0.125)
  })

  it('refuses what the save action would refuse', () => {
    for (const input of ['', '1e3', '12.3456', '-5', '1 250', '1234567', 'abc']) {
      expect(parseDecimalInput(input)).toBeNull()
    }
  })
})

describe('hryvniasToKopiykas', () => {
  it('rounds to whole kopiykas', () => {
    expect(hryvniasToKopiykas(1250.5)).toBe(125_050)
    expect(hryvniasToKopiykas(0.125)).toBe(13)
    expect(hryvniasToKopiykas(19.99)).toBe(1999)
  })
})

describe('product weight', () => {
  it('reads kilos as grams and writes them back', () => {
    expect(kilosToGrams(1.4)).toBe(1400)
    expect(kilosToGrams(0.085)).toBe(85)
    expect(gramsToKilosInput(1400)).toBe('1.4')
    expect(gramsToKilosInput(2000)).toBe('2')
  })

  it('leaves an unweighed product empty rather than showing zero', () => {
    expect(gramsToKilosInput(0)).toBe('')
  })
})

describe('catalog position', () => {
  it('reads the place the owner typed', () => {
    expect(parseCatalogPosition('3')).toBe(3)
    expect(parseCatalogPosition(' 12 ')).toBe(12)
  })

  it('reads a blank cell as no place on the arranged shelf', () => {
    expect(parseCatalogPosition('')).toBeNull()
    expect(parseCatalogPosition('   ')).toBeNull()
  })

  it.each(['1,5', '-2', 'перший', '1e2', '0x10'])(
    'refuses «%s» instead of guessing a place',
    (input) => {
      expect(parseCatalogPosition(input)).toBeNaN()
    },
  )

  it('writes the place back, blank for a product without one', () => {
    expect(catalogPositionInput(7)).toBe('7')
    expect(catalogPositionInput(null)).toBe('')
  })
})

describe('nextSlug', () => {
  it('keeps an untouched slug letter for letter, Cyrillic included', () => {
    expect(nextSlug('чохол-антитепловізор-та-антидрон-для-2', 'чохол-антитепловізор-та-антидрон-для-2')).toBe(
      'чохол-антитепловізор-та-антидрон-для-2',
    )
  })

  it('normalises a slug the admin typed', () => {
    expect(nextSlug('old-slug', ' Новий Чохол 2 ')).toBe('novyi-chokhol-2')
  })
})
