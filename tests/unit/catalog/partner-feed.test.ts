import { describe, expect, it } from 'vitest'
import { feedItemOf, type FeedProduct } from '@/features/catalog/model/merchant-feed'
import {
  partnerCategoriesOf,
  partnerCategoryIdOf,
  partnerDescriptionOf,
  partnerFeedYml,
  partnerOfferOf,
  type PartnerOffer,
} from '@/features/catalog/model/partner-feed'

const DESCRIPTION = [
  '## Конструкція',
  'Три шари. Це не фольга.',
  '',
  '- Люверси по кутах',
  '- Пара 760 ₴',
  '',
  '## Опт і купівля',
  'Від 10 штук 2 000 ₴ за штуку. Шиємо у власному цеху, гарантія 12 місяців.',
  '',
  '## Ціна',
  '2 050 ₴, від 10 штук 1 800 ₴ за штуку.',
].join('\n')

const PRODUCT: FeedProduct = {
  sourceId: null,
  slug: 'anty-teploviziyna-nakydka-poncho-a6286',
  sku: 'HART-35577',
  colorGroup: 'poncho-3-layers',
  title: 'Антитепловізійне пончо, 3 шари, олива',
  description: DESCRIPTION,
  priceCents: 220000,
  salePriceCents: null,
  currency: 'UAH',
  weightGrams: 1250,
  categoryName: 'Антидронові накидки',
  googleCategory: null,
  material: 'Оксфорд',
  imageUrls: ['https://media.hart-shop.com/a.webp', 'https://media.hart-shop.com/b.webp'],
}

const ITEM = feedItemOf(
  PRODUCT,
  {
    sku: 'HART-35577-OLIVE',
    color: 'Олива',
    size: null,
    priceDeltaCents: 0,
    stockQty: 3,
    imageUrl: null,
  },
  {
    siteUrl: 'https://hart-shop.com',
    brand: 'Гарт',
    hasColorChoice: false,
    hasSizeChoice: false,
    productIdCarrierSku: null,
  },
)

const SOURCE = {
  sku: 'HART-35577-OLIVE',
  categoryId: 1,
  minimumPriceCents: 210000,
  currency: 'UAH',
  description: DESCRIPTION,
  weightGrams: 1250,
}

describe('partnerDescriptionOf', () => {
  it('drops every sentence and bullet that quotes our price', () => {
    const text = partnerDescriptionOf(DESCRIPTION)

    expect(text).not.toContain('₴')
    expect(text).toContain('Три шари. Це не фольга.')
    expect(text).toContain('Шиємо у власному цеху, гарантія 12 місяців.')
    expect(text).toContain('Люверси по кутах.')
  })

  it('drops a heading whose whole section was prices', () => {
    expect(partnerDescriptionOf(DESCRIPTION)).not.toContain('Ціна')
  })

  it('keeps a heading that still has text under it', () => {
    expect(partnerDescriptionOf(DESCRIPTION)).toContain('Опт і купівля. Шиємо')
  })
})

describe('partnerOfferOf', () => {
  const offer = partnerOfferOf(ITEM, SOURCE)

  it('keys the offer by the variant sku, not by our Merchant Center id', () => {
    expect(offer.id).toBe('HART-35577-OLIVE')
    expect(ITEM.id).not.toBe(offer.id)
  })

  it('carries the minimum resale price it is given', () => {
    expect(offer.price).toBe('2100.00')
    expect(offer.currency).toBe('UAH')
  })

  it('names the colour, the fabric and the weight as params', () => {
    expect(offer.params).toEqual([
      { name: 'Колір', value: 'Олива' },
      { name: 'Тканина', value: 'Оксфорд' },
      { name: 'Вага', value: '1250 г' },
    ])
  })

  it('lists the photos with the colour shot first', () => {
    expect(offer.pictures).toEqual([
      'https://media.hart-shop.com/a.webp',
      'https://media.hart-shop.com/b.webp',
    ])
  })

  it('falls back to the title when no text is left', () => {
    const bare = partnerOfferOf(ITEM, { ...SOURCE, description: '2 050 ₴ за штуку.' })
    expect(bare.description).toBe(ITEM.title)
  })
})

describe('partner categories', () => {
  const slugs = ['anti-dronovi-nakidki', 'chokhly-dlya-starlink', 'antyteploviziyni-tenty']

  it('numbers categories by the configured order', () => {
    expect(partnerCategoryIdOf(slugs, 'antyteploviziyni-tenty')).toBe(3)
  })

  it('lists only categories with products, keeping their ids', () => {
    const categories = partnerCategoriesOf(slugs, [
      { categorySlug: 'antyteploviziyni-tenty', categoryName: 'Антитепловізійні тенти' },
    ])
    expect(categories).toEqual([{ id: 3, name: 'Антитепловізійні тенти' }])
  })
})

describe('partnerFeedYml', () => {
  const offer: PartnerOffer = {
    ...partnerOfferOf(ITEM, SOURCE),
    name: 'Пончо "3 шари" & чохол',
    isAvailable: false,
  }
  const yml = partnerFeedYml({
    shop: { name: 'Гарт', company: 'ФОП Масний Олександр Сергійович', url: 'https://hart-shop.com/' },
    generatedAt: '2026-10-29 16:50',
    categories: [{ id: 1, name: 'Антидронові накидки' }],
    offers: [offer],
  })

  it('writes the YML catalogue shell', () => {
    expect(yml).toContain('<yml_catalog date="2026-10-29 16:50">')
    expect(yml).toContain('<currency id="UAH" rate="1"/>')
    expect(yml).toContain('<category id="1">Антидронові накидки</category>')
  })

  it('writes an offer with its availability, price and params', () => {
    expect(yml).toContain('<offer id="HART-35577-OLIVE" available="false">')
    expect(yml).toContain('<price>2100.00</price>')
    expect(yml).toContain('<vendorCode>HART-35577-OLIVE</vendorCode>')
    expect(yml).toContain('<param name="Колір">Олива</param>')
  })

  it('escapes text', () => {
    expect(yml).toContain('<name>Пончо &quot;3 шари&quot; &amp; чохол</name>')
  })

  it('never links to our product pages', () => {
    expect(yml).not.toContain('/product/')
  })
})
