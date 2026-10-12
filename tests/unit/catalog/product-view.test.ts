import { describe, expect, it } from 'vitest'
import {
  buildMetaLine,
  cardImageFor,
  coverIndexByColor,
  coverIndexFor,
  formatWeight,
  galleryIndexFor,
  mergeSpecs,
  metaDescription,
} from '@/features/catalog/model/product-view'

const SHOT = { url: 'https://media.fox-armor.com.ua/1.webp', alt: 'Олива', width: 1, height: 1 }
const COVER = { url: 'https://media.fox-armor.com.ua/0.webp', alt: 'Пончо', width: 1, height: 1 }

describe('coverIndexByColor', () => {
  it('maps each colour to the shot its first variant names', () => {
    expect(
      coverIndexByColor([
        { color: 'Олива', imageIndex: 2 },
        { color: 'Олива', imageIndex: 5 },
        { color: 'Піксель', imageIndex: null },
        { color: 'Мультикам', imageIndex: 0 },
      ]),
    ).toEqual({ Олива: 2, Мультикам: 0 })
  })

  it('is empty when no colour has a shot of its own', () => {
    expect(coverIndexByColor([{ color: 'Standard', imageIndex: null }])).toEqual({})
  })

  it('is not fooled by a colour named like an Object.prototype member', () => {
    expect(coverIndexByColor([{ color: 'constructor', imageIndex: 3 }])).toEqual({
      constructor: 3,
    })
  })
})

describe('coverIndexFor', () => {
  it('reads a colour that has a cover and nothing else', () => {
    expect(coverIndexFor({ Олива: 2 }, 'Олива')).toBe(2)
    expect(coverIndexFor({ Олива: 2 }, 'Піксель')).toBeUndefined()
    expect(coverIndexFor({ Олива: 2 }, null)).toBeUndefined()
    expect(coverIndexFor({}, 'constructor')).toBeUndefined()
  })
})

describe('cardImageFor', () => {
  const product = { image: COVER, imagesByColor: { Олива: SHOT } }

  it("shows the colour's own shot when the card opens on that colour", () => {
    expect(cardImageFor(product, 'Олива')).toBe(SHOT)
  })

  it('falls back to the product cover for other colours and for no colour', () => {
    expect(cardImageFor(product, 'Піксель')).toBe(COVER)
    expect(cardImageFor(product, undefined)).toBe(COVER)
    expect(cardImageFor(product, 'constructor')).toBe(COVER)
    expect(cardImageFor({ image: null, imagesByColor: {} }, 'Олива')).toBe(null)
  })
})

describe('galleryIndexFor', () => {
  const count = 14

  it('opens on the first shot until a colour with a cover arrives', () => {
    expect(galleryIndexFor({ pick: null, color: null, coverIndex: undefined, count })).toBe(0)
    expect(galleryIndexFor({ pick: null, color: 'Олива', coverIndex: undefined, count })).toBe(0)
    expect(galleryIndexFor({ pick: null, color: 'Олива', coverIndex: 12, count })).toBe(12)
  })

  it("keeps the shopper's pick while its colour stays on screen", () => {
    const pick = { index: 3, color: 'Олива' }
    expect(galleryIndexFor({ pick, color: 'Олива', coverIndex: 12, count })).toBe(3)
  })

  it('keeps a pick made before any colour arrived', () => {
    const pick = { index: 3, color: null }
    expect(galleryIndexFor({ pick, color: 'Олива', coverIndex: 12, count })).toBe(3)
  })

  it("switches to the new colour's cover, or stays put when it has none", () => {
    const pick = { index: 3, color: 'Олива' }
    expect(galleryIndexFor({ pick, color: 'Піксель', coverIndex: 13, count })).toBe(13)
    expect(galleryIndexFor({ pick, color: 'Піксель', coverIndex: undefined, count })).toBe(3)
  })

  it('never points past the gallery', () => {
    expect(galleryIndexFor({ pick: null, color: 'Олива', coverIndex: 40, count })).toBe(13)
    expect(galleryIndexFor({ pick: { index: 9, color: null }, color: null, coverIndex: undefined, count: 0 })).toBe(0)
  })
})

describe('metaDescription', () => {
  it('takes the first candidate that has something to say', () => {
    expect(metaDescription('Коротко про пончо', 'Старий текст', 'Повний опис')).toBe(
      'Коротко про пончо',
    )
    expect(metaDescription('  ', null, 'Повний опис')).toBe('Повний опис')
    expect(metaDescription(null, null, '')).toBe('')
  })

  it('flattens the imported text into one line', () => {
    expect(metaDescription('🔥 ЦІНИ ВІД ВИРОБНИКА🔥\n\nОпис:  пончо\nз капюшоном')).toBe(
      '🔥 ЦІНИ ВІД ВИРОБНИКА🔥 Опис: пончо з капюшоном',
    )
  })

  it('cuts a long text on a word, not mid-word', () => {
    const long = `${'слово '.repeat(80)}кінець`
    const meta = metaDescription(long)
    expect(meta.length).toBeLessThanOrEqual(301)
    expect(meta.endsWith('…')).toBe(true)
    expect(meta).not.toContain('сло…')
  })
})

describe('mergeSpecs', () => {
  const WEIGHT = { label: 'Вага', value: '1.4 кг' }
  const COLOURS = { label: 'Кольори', value: 'Мультикам · Зимовий мультикам' }

  it('keeps the derived rows around the entered ones, in order', () => {
    const fabric = { label: 'Тканина', value: 'Оксфорд' }
    expect(mergeSpecs([WEIGHT], [fabric], [COLOURS])).toEqual([WEIGHT, fabric, COLOURS])
  })

  it('drops an entered row that repeats a derived one, whatever its case or spacing', () => {
    const entered = [
      { label: ' кольори ', value: 'Мультикам, зимовий мультикам' },
      { label: 'ВАГА', value: '1,4 кг' },
    ]
    expect(mergeSpecs([WEIGHT], entered, [COLOURS])).toEqual([WEIGHT, COLOURS])
  })

  it('keeps an entered colours row when the page derives none', () => {
    const colours = { label: 'Кольори', value: 'Олива' }
    expect(mergeSpecs([], [colours], [])).toEqual([colours])
  })

  it('drops entered rows with blank values', () => {
    expect(mergeSpecs([], [{ label: 'Сезон', value: '  ' }], [])).toEqual([])
  })
})

describe('formatWeight', () => {
  it('writes the weight with a decimal comma at the catalogue precision', () => {
    expect(formatWeight(1350, 'кг')).toBe('1,35 кг')
    expect(formatWeight(1150, 'кг')).toBe('1,15 кг')
    expect(formatWeight(1400, 'кг')).toBe('1,4 кг')
    expect(formatWeight(300, 'кг')).toBe('0,3 кг')
    expect(formatWeight(2000, 'кг')).toBe('2 кг')
  })
})

describe('buildMetaLine', () => {
  it('joins the weight and the layers, leaving out what is not stated', () => {
    expect(buildMetaLine(1250, '3 шари', 'кг')).toBe('1,25 кг · 3 шари')
    expect(buildMetaLine(0, null, 'кг')).toBe('')
  })
})
