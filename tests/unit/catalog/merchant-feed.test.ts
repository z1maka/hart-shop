import { describe, expect, it } from 'vitest'
import {
  escapeXml,
  feedItemOf,
  feedListedProducts,
  feedListedVariants,
  materialOf,
  merchantFeedXml,
  metaCatalogItemOf,
  offerIdLookupOf,
  offerIdOf,
  productIdCarrierOf,
  type FeedProduct,
  type FeedVariant,
} from '@/features/catalog/model/merchant-feed'

const PRODUCT: FeedProduct = {
  sourceId: 35635,
  slug: 'anty-teploviziyna-nakydka-poncho-a6286',
  sku: 'FOX-UA-35635',
  colorGroup: null,
  title: 'Антитепловізійне пончо',
  description: 'Пончо\n\nз двома шарами   тканини',
  priceCents: 220000,
  salePriceCents: null,
  currency: 'UAH',
  weightGrams: 450,
  categoryName: 'Анти-дронові накидки',
  googleCategory: null,
  material: null,
  imageUrls: ['https://media.fox-armor.com.ua/a.webp', 'https://media.fox-armor.com.ua/b.webp'],
}

const OLIVE: FeedVariant = {
  sku: 'FOX-UA-35635-V35640',
  color: 'Олива',
  size: null,
  priceDeltaCents: 0,
  stockQty: 4,
  imageUrl: null,
}

const CONTEXT = {
  siteUrl: 'https://fox-armor.com.ua',
  brand: 'FOX Armor',
  hasColorChoice: true,
  hasSizeChoice: false,
  productIdCarrierSku: null,
}

const COLOURS_OF_A_SIMPLE_PRODUCT = [
  { sku: 'FOX-UA-35964-MULTICAM' },
  { sku: 'FOX-UA-35964-WINTER' },
  { sku: 'FOX-UA-35964-PIXEL' },
]

describe('feedListedVariants', () => {
  it('keeps the colours without photos of their own out of the feeds', () => {
    const variants = [{ sku: '3600-2-MULTICAM' }, { sku: '3600-2-PIXEL' }, { sku: '3600-2-OLIVE' }]

    expect(feedListedVariants(variants)).toEqual([{ sku: '3600-2-MULTICAM' }])
  })
})

describe('feedListedProducts', () => {
  it('keeps the products the owner does not advertise out of the feeds', () => {
    const products = [
      { slug: 'kriplennya-povorotni-na-reytsi-arc-na-sholom' },
      { slug: 'anty-teploviziyna-nakydka-poncho-a6286' },
    ]

    expect(feedListedProducts(products)).toEqual([
      { slug: 'anty-teploviziyna-nakydka-poncho-a6286' },
    ])
  })
})

describe('productIdCarrierOf', () => {
  it('is the untouched variant of a simple product', () => {
    expect(productIdCarrierOf([{ sku: '3600-STD' }])).toBe('3600-STD')
    expect(productIdCarrierOf([{ sku: 'FOX-UA-1-OLIVE' }, { sku: 'FOX-UA-1-STD' }])).toBe(
      'FOX-UA-1-STD',
    )
  })

  it('is the first colour when a simple product was split into colours', () => {
    expect(productIdCarrierOf(COLOURS_OF_A_SIMPLE_PRODUCT)).toBe('FOX-UA-35964-MULTICAM')
  })

  it('is nobody for a product that was variable on WordPress', () => {
    expect(productIdCarrierOf([{ sku: 'FOX-UA-35635-V35640' }, { sku: 'FOX-UA-35635-RED' }])).toBe(
      null,
    )
    expect(productIdCarrierOf([])).toBe(null)
  })
})

describe('offerIdOf', () => {
  it('keeps the plugin id of a WordPress variation', () => {
    expect(offerIdOf('FOX-UA-35635-V35640', 35635, null)).toBe('gla_35640')
  })

  it('keeps the plugin id of a simple product on its carrier, whatever the sku', () => {
    expect(offerIdOf('3600-STD', 37716, '3600-STD')).toBe('gla_37716')
    expect(offerIdOf('FOX-UA-35964-MULTICAM', 35964, 'FOX-UA-35964-MULTICAM')).toBe('gla_35964')
  })

  it('gives a variant added after the move an id the plugin never used', () => {
    expect(offerIdOf('FOX-UA-35964-WINTER', 35964, 'FOX-UA-35964-MULTICAM')).toBe(
      'hart_FOX-UA-35964-WINTER',
    )
    expect(offerIdOf('FOX-UA-35635-RED', 35635, null)).toBe('hart_FOX-UA-35635-RED')
    expect(offerIdOf('NEW-1-STD', null, 'NEW-1-STD')).toBe('hart_NEW-1-STD')
  })
})

describe('offerIdLookupOf', () => {
  const owners = [
    { sku: 'FOX-UA-35635-V35640', productId: 'poncho', sourceId: 35635 },
    { sku: 'FOX-UA-35964-MULTICAM', productId: 'tent', sourceId: 35964 },
    { sku: 'FOX-UA-35964-WINTER', productId: 'tent', sourceId: 35964 },
    { sku: 'FOX-UA-35964-PIXEL', productId: 'tent', sourceId: 35964 },
  ]

  it('gives each bought variant the id its offer has in the feed', () => {
    const offerIdOfSku = offerIdLookupOf(
      owners,
      new Map([
        ['poncho', [{ sku: 'FOX-UA-35635-V35640' }]],
        ['tent', [{ sku: 'FOX-UA-35964-MULTICAM' }, { sku: 'FOX-UA-35964-WINTER' }]],
      ]),
    )

    expect(offerIdOfSku('FOX-UA-35635-V35640')).toBe('gla_35640')
    expect(offerIdOfSku('FOX-UA-35964-MULTICAM')).toBe('gla_35964')
    expect(offerIdOfSku('FOX-UA-35964-WINTER')).toBe('hart_FOX-UA-35964-WINTER')
  })

  it('picks the carrier among the listed variants only, as the feed does', () => {
    const offerIdOfSku = offerIdLookupOf(
      owners,
      new Map([['tent', [{ sku: 'FOX-UA-35964-WINTER' }, { sku: 'FOX-UA-35964-PIXEL' }]]]),
    )

    expect(offerIdOfSku('FOX-UA-35964-WINTER')).toBe('gla_35964')
    expect(offerIdOfSku('FOX-UA-35964-MULTICAM')).toBe('hart_FOX-UA-35964-MULTICAM')
  })

  it('falls back to the id the sku alone gives for a variant no longer in the catalogue', () => {
    const offerIdOfSku = offerIdLookupOf([], new Map())

    expect(offerIdOfSku('FOX-UA-36001-V36002')).toBe('gla_36002')
    expect(offerIdOfSku('GONE-1-STD')).toBe('hart_GONE-1-STD')
  })
})

describe('metaCatalogItemOf', () => {
  it('keys the item by the variant sku the cart reports, keeping everything else', () => {
    const item = feedItemOf(PRODUCT, OLIVE, CONTEXT)
    const metaItem = metaCatalogItemOf(item, OLIVE.sku)

    expect(item.id).toBe('gla_35640')
    expect(metaItem).toEqual({ ...item, id: 'FOX-UA-35635-V35640' })
    expect(metaItem.itemGroupId).toBe('FOX-UA-35635')
  })
})

describe('feedItemOf', () => {
  it("groups a colour sold on its own page with the model's other colours", () => {
    const item = feedItemOf({ ...PRODUCT, colorGroup: 'poncho-3-layers' }, OLIVE, CONTEXT)

    expect(item.itemGroupId).toBe('poncho-3-layers')
  })

  it('describes the variant as a shopper would find it on the page', () => {
    const item = feedItemOf(PRODUCT, OLIVE, CONTEXT)

    expect(item).toMatchObject({
      id: 'gla_35640',
      itemGroupId: 'FOX-UA-35635',
      title: 'Антитепловізійне пончо — Олива',
      description: 'Пончо з двома шарами тканини',
      link: 'https://fox-armor.com.ua/product/anty-teploviziyna-nakydka-poncho-a6286/?color=%D0%9E%D0%BB%D0%B8%D0%B2%D0%B0',
      imageLink: 'https://media.fox-armor.com.ua/a.webp',
      additionalImageLinks: ['https://media.fox-armor.com.ua/b.webp'],
      availability: 'in_stock',
      price: '2200.00 UAH',
      salePrice: null,
      shippingWeight: '450 g',
    })
  })

  it('turns the page markup into plain sentences for the feed', () => {
    const item = feedItemOf(
      { ...PRODUCT, description: '## Конструкція\n- Три шари\n- Без фольги\n\nТримає дощ.' },
      OLIVE,
      CONTEXT,
    )

    expect(item.description).toBe('Конструкція. Три шари. Без фольги. Тримає дощ.')
  })

  it('quotes the price the cart charges, sale and variant delta included', () => {
    const item = feedItemOf(
      { ...PRODUCT, salePriceCents: 199000 },
      { ...OLIVE, priceDeltaCents: 10000, stockQty: 0 },
      CONTEXT,
    )

    expect(item.price).toBe('2300.00 UAH')
    expect(item.salePrice).toBe('2090.00 UAH')
    expect(item.availability).toBe('out_of_stock')
  })

  it("leads with the colour's own shot and keeps the rest of the gallery behind it", () => {
    const item = feedItemOf(
      PRODUCT,
      { ...OLIVE, imageUrl: 'https://media.fox-armor.com.ua/b.webp' },
      CONTEXT,
    )

    expect(item.imageLink).toBe('https://media.fox-armor.com.ua/b.webp')
    expect(item.additionalImageLinks).toEqual(['https://media.fox-armor.com.ua/a.webp'])
  })

  it('does not name a one-colour product after its colour', () => {
    const item = feedItemOf(PRODUCT, OLIVE, { ...CONTEXT, hasColorChoice: false })

    expect(item.title).toBe('Антитепловізійне пончо')
    expect(item.link).toBe(
      'https://fox-armor.com.ua/product/anty-teploviziyna-nakydka-poncho-a6286/',
    )
    expect(item.color).toBe('Олива')
  })

  it('percent-encodes a Cyrillic slug in the link', () => {
    const item = feedItemOf(
      { ...PRODUCT, slug: 'маскувальне-пончо-fx13' },
      { ...OLIVE, sku: '3600-1-OLIVE' },
      { ...CONTEXT, hasColorChoice: false },
    )

    expect(item.link).toBe(
      'https://fox-armor.com.ua/product/%D0%BC%D0%B0%D1%81%D0%BA%D1%83%D0%B2%D0%B0%D0%BB%D1%8C%D0%BD%D0%B5-%D0%BF%D0%BE%D0%BD%D1%87%D0%BE-fx13/',
    )
  })
})

describe('merchantFeedXml', () => {
  it('writes an RSS feed with Google attributes, escaped', () => {
    const item = feedItemOf({ ...PRODUCT, title: 'Tent "A&B" <XL>' }, OLIVE, CONTEXT)
    const xml = merchantFeedXml(
      { title: 'FOX Armor', link: 'https://fox-armor.com.ua/', description: 'Shop' },
      [item],
    )

    expect(xml).toContain('<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">')
    expect(xml).toContain('<g:id>gla_35640</g:id>')
    expect(xml).toContain('<title>Tent &quot;A&amp;B&quot; &lt;XL&gt; — Олива</title>')
    expect(xml).toContain('<g:identifier_exists>no</g:identifier_exists>')
    expect(xml).toContain('<g:shipping_weight>450 g</g:shipping_weight>')
    expect(xml).not.toContain('<g:sale_price>')
    expect(xml).not.toContain('<g:google_product_category>')
    expect(xml).not.toContain('<g:gender>')
  })

  it('names the Google category, the fabric, and for worn goods the wearer', () => {
    const poncho = feedItemOf(
      {
        ...PRODUCT,
        googleCategory: { id: 5462, label: 'Маскировочные костюмы', isApparel: true },
        material: 'Оксфорд з водовідштовхувальним просоченням',
      },
      OLIVE,
      CONTEXT,
    )
    const tent = feedItemOf(
      {
        ...PRODUCT,
        googleCategory: { id: 1034, label: 'Укрытия', isApparel: false },
        material: 'Оксфорд',
      },
      OLIVE,
      CONTEXT,
    )
    const xml = merchantFeedXml(
      { title: 'FOX Armor', link: 'https://fox-armor.com.ua/', description: 'Shop' },
      [poncho, tent],
    )
    const [ponchoXml = '', tentXml = ''] = xml.split('</item>')

    expect(ponchoXml).toContain('<g:google_product_category>5462</g:google_product_category>')
    expect(ponchoXml).toContain(
      '<g:material>Оксфорд з водовідштовхувальним просоченням</g:material>',
    )
    expect(ponchoXml).toContain('<g:gender>unisex</g:gender>')
    expect(ponchoXml).toContain('<g:age_group>adult</g:age_group>')
    expect(tentXml).toContain('<g:google_product_category>1034</g:google_product_category>')
    expect(tentXml).not.toContain('<g:gender>')
    expect(tentXml).not.toContain('<g:age_group>')
  })
})

describe('materialOf', () => {
  it('reads the fabric row and nothing else', () => {
    expect(
      materialOf([
        { label: 'Розмір', value: '150 × 280 см' },
        { label: 'Тканина', value: ' Оксфорд ' },
      ]),
    ).toBe('Оксфорд')
    expect(materialOf([{ label: 'Розмір', value: '150 × 280 см' }])).toBeNull()
    expect(materialOf([{ label: 'Тканина', value: '  ' }])).toBeNull()
  })
})

describe('escapeXml', () => {
  it('drops characters XML cannot carry', () => {
    expect(escapeXml('a\u0000b\u0008c')).toBe('abc')
  })
})
