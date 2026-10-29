import { FEED_MATERIAL_SPEC_LABEL } from '@/config/merchant-feed'
import { PARTNER_FEED_PICTURES_MAX } from '@/config/partner-feed'
import { parseStory, type StoryBlock } from '@/features/catalog/model/category-content'
import { escapeXml, storyText, type FeedItem } from '@/features/catalog/model/merchant-feed'
import { decimalAmount } from '@/lib/money'

// The product file dropshipping partners import into their own shops, in YML:
// the format Prom, Rozetka, Horoshop and OpenCart read. Its offers are our ad
// feeds' items without what is ours alone: the link to our page and the lines
// of the text that quote our prices. A partner sets his own price, never
// below the minimum one the offer carries.

export type PartnerOfferSource = {
  readonly sku: string
  readonly categoryId: number
  readonly minimumPriceCents: number
  readonly currency: string
  // The product page's text as typed in the admin, headings and bullets included.
  readonly description: string
  readonly weightGrams: number
}

export type PartnerParam = {
  readonly name: string
  readonly value: string
}

export type PartnerOffer = {
  readonly id: string
  readonly isAvailable: boolean
  readonly name: string
  readonly vendor: string
  readonly description: string
  readonly categoryId: number
  readonly price: string
  readonly currency: string
  readonly pictures: readonly string[]
  readonly params: readonly PartnerParam[]
}

export type PartnerCategory = {
  readonly id: number
  readonly name: string
}

export type PartnerShop = {
  readonly name: string
  readonly company: string
  readonly url: string
}

export type PartnerFeed = {
  readonly shop: PartnerShop
  // When the file was built, as YML writes it: «2026-10-29 16:50».
  readonly generatedAt: string
  readonly categories: readonly PartnerCategory[]
  readonly offers: readonly PartnerOffer[]
}

const COLOR_PARAM = 'Колір'
const SIZE_PARAM = 'Розмір'
const WEIGHT_PARAM = 'Вага'

// Offers are keyed by the variant sku: the same code a partner's order names
// and our cart knows.
export function partnerOfferOf(item: FeedItem, source: PartnerOfferSource): PartnerOffer {
  return {
    id: source.sku,
    isAvailable: item.availability === 'in_stock',
    name: item.title,
    vendor: item.brand,
    description: partnerDescriptionOf(source.description) || item.title,
    categoryId: source.categoryId,
    price: decimalAmount(source.minimumPriceCents),
    currency: source.currency,
    pictures: [item.imageLink, ...item.additionalImageLinks]
      .filter((url): url is string => url !== null)
      .slice(0, PARTNER_FEED_PICTURES_MAX),
    params: paramsOf(item, source.weightGrams),
  }
}

function paramsOf(item: FeedItem, weightGrams: number): PartnerParam[] {
  const params = [
    item.color ? { name: COLOR_PARAM, value: item.color } : null,
    item.size ? { name: SIZE_PARAM, value: item.size } : null,
    item.material ? { name: FEED_MATERIAL_SPEC_LABEL, value: item.material } : null,
    { name: WEIGHT_PARAM, value: `${weightGrams} г` },
  ]
  return params.filter((param): param is PartnerParam => param !== null)
}

// Category ids follow the configured order, so the mapping a partner sets up
// in his shop survives products coming and going.
export function partnerCategoryIdOf(slugs: readonly string[], slug: string): number {
  return slugs.indexOf(slug) + 1
}

// Only categories with products are listed.
export function partnerCategoriesOf(
  slugs: readonly string[],
  products: readonly { readonly categorySlug: string; readonly categoryName: string }[],
): PartnerCategory[] {
  const nameBySlug = new Map(products.map((product) => [product.categorySlug, product.categoryName]))
  return slugs.flatMap((slug) => {
    const name = nameBySlug.get(slug)
    return name === undefined ? [] : [{ id: partnerCategoryIdOf(slugs, slug), name }]
  })
}

// Our texts end with what one unit and ten units cost here. In a partner's
// shop those lines would quote our price list next to his own price, so every
// sentence or bullet with a price goes, and a heading left with nothing under
// it goes with it.
const PRICE_MARK = '₴'
const SENTENCE_BREAK = /(?<=[.!?…])\s+/u

export function partnerDescriptionOf(description: string): string {
  const blocks = parseStory(description).flatMap(withoutPriceLines)
  return storyText(withoutEmptySections(blocks)).replace(/\s+/g, ' ').trim()
}

function withoutPriceLines(block: StoryBlock): StoryBlock[] {
  if (block.type === 'heading') return [block]

  if (block.type === 'list') {
    const items = block.items.filter((text) => !text.includes(PRICE_MARK))
    return items.length > 0 ? [{ type: 'list', items }] : []
  }

  const sentences = block.text.split(SENTENCE_BREAK).filter((text) => !text.includes(PRICE_MARK))
  return sentences.length > 0 ? [{ type: 'paragraph', text: sentences.join(' ') }] : []
}

function withoutEmptySections(blocks: readonly StoryBlock[]): StoryBlock[] {
  return blocks.filter((block, index) => {
    if (block.type !== 'heading') return true
    const next = blocks[index + 1]
    return next !== undefined && next.type !== 'heading'
  })
}

export function partnerFeedYml(feed: PartnerFeed): string {
  const currencies = [...new Set(feed.offers.map((offer) => offer.currency))]

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<yml_catalog date="${escapeXml(feed.generatedAt)}">`,
    '<shop>',
    element('name', feed.shop.name),
    element('company', feed.shop.company),
    element('url', feed.shop.url),
    '<currencies>',
    ...currencies.map((currency) => `<currency id="${escapeXml(currency)}" rate="1"/>`),
    '</currencies>',
    '<categories>',
    ...feed.categories.map(
      (category) => `<category id="${category.id}">${escapeXml(category.name)}</category>`,
    ),
    '</categories>',
    '<offers>',
    ...feed.offers.map(offerXml),
    '</offers>',
    '</shop>',
    '</yml_catalog>',
    '',
  ].join('\n')
}

function offerXml(offer: PartnerOffer): string {
  const lines = [
    element('price', offer.price),
    element('currencyId', offer.currency),
    element('categoryId', String(offer.categoryId)),
    ...offer.pictures.map((url) => element('picture', url)),
    element('name', offer.name),
    element('vendor', offer.vendor),
    element('vendorCode', offer.id),
    element('description', offer.description),
    ...offer.params.map(
      (param) => `<param name="${escapeXml(param.name)}">${escapeXml(param.value)}</param>`,
    ),
  ]

  return [
    `<offer id="${escapeXml(offer.id)}" available="${offer.isAvailable}">`,
    ...lines,
    '</offer>',
  ].join('\n')
}

function element(name: string, value: string): string {
  return `<${name}>${escapeXml(value)}</${name}>`
}
