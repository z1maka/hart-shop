import {
  FEED_ADDITIONAL_IMAGES_MAX,
  FEED_APPAREL_AGE_GROUP,
  FEED_APPAREL_GENDER,
  FEED_DESCRIPTION_MAX_LENGTH,
  FEED_EXCLUDED_SLUGS,
  FEED_NO_PHOTO_VARIANT_SKUS,
  FEED_MATERIAL_MAX_LENGTH,
  FEED_MATERIAL_SPEC_LABEL,
  FEED_TITLE_MAX_LENGTH,
  LEGACY_OFFER_ID_PREFIX,
  NEW_OFFER_ID_PREFIX,
} from '@/config/merchant-feed'
import { parseStory, type StoryBlock } from '@/features/catalog/model/category-content'
import type { GoogleCategory } from '@/features/catalog/model/google-category'
import { COLOR_PARAM } from '@/features/catalog/model/requested-color'
import { decimalAmount } from '@/lib/money'

export type FeedProduct = {
  // The WordPress product id the import kept; null for products made in the
  // new admin.
  readonly sourceId: number | null
  readonly slug: string
  readonly sku: string
  // Set when the product is one colour of a model sold per colour: the
  // colours' offers form one group, as the variants of one product do.
  readonly colorGroup: string | null
  readonly title: string
  readonly description: string
  readonly priceCents: number
  readonly salePriceCents: number | null
  readonly currency: string
  readonly weightGrams: number
  readonly categoryName: string
  // Google's taxonomy entry, the product's own or its category's.
  readonly googleCategory: GoogleCategory | null
  readonly material: string | null
  readonly imageUrls: readonly string[]
}

export type FeedVariant = {
  readonly sku: string
  readonly color: string | null
  readonly size: string | null
  readonly priceDeltaCents: number
  readonly stockQty: number
  // The gallery shot chosen for this colour; null when it has none of its own.
  readonly imageUrl: string | null
}

export type FeedItem = {
  readonly id: string
  readonly itemGroupId: string
  readonly title: string
  readonly description: string
  readonly link: string
  readonly imageLink: string | null
  readonly additionalImageLinks: readonly string[]
  readonly availability: 'in_stock' | 'out_of_stock'
  readonly price: string
  readonly salePrice: string | null
  readonly shippingWeight: string
  readonly brand: string
  readonly color: string | null
  readonly size: string | null
  readonly productType: string
  readonly googleProductCategory: number | null
  readonly material: string | null
  // Only for worn goods, where Google reads them.
  readonly gender: string | null
  readonly ageGroup: string | null
}

// Which options tell this product's variants apart: only those go into an
// item's title, so a one-colour product is not named after its colour.
export type FeedChoices = {
  readonly hasColorChoice: boolean
  readonly hasSizeChoice: boolean
}

// The import wrote a WordPress variation's id into its variant sku and kept
// the product's own id as sourceId; the plugin's offer id is the variation id
// for a variable product and the product id for a simple one.
const VARIATION_SKU = /-V(\d+)$/
const SIMPLE_VARIANT_SKU = /-STD$/

export function feedListedProducts<T extends { readonly slug: string }>(
  products: readonly T[],
): T[] {
  return products.filter((product) => !FEED_EXCLUDED_SLUGS.includes(product.slug))
}

export function feedListedVariants<T extends { readonly sku: string }>(
  variants: readonly T[],
): T[] {
  return variants.filter((variant) => !FEED_NO_PHOTO_VARIANT_SKUS.includes(variant.sku))
}

// The plugin made one offer per simple WordPress product. Where the site now
// sells that product in several colours, one of them carries the product's
// id and its history: the untouched `-STD` variant, else the first colour.
// A product that was variable on WordPress has no such carrier — its new
// colours are new offers.
export function productIdCarrierOf(variants: readonly Pick<FeedVariant, 'sku'>[]): string | null {
  if (variants.some((variant) => VARIATION_SKU.test(variant.sku))) return null

  const simple = variants.find((variant) => SIMPLE_VARIANT_SKU.test(variant.sku))
  return simple?.sku ?? variants[0]?.sku ?? null
}

export function offerIdOf(
  variantSku: string,
  productSourceId: number | null,
  carrierSku: string | null,
): string {
  const variationId = VARIATION_SKU.exec(variantSku)?.[1]
  if (variationId) return `${LEGACY_OFFER_ID_PREFIX}${variationId}`

  if (productSourceId !== null && variantSku === carrierSku) {
    return `${LEGACY_OFFER_ID_PREFIX}${productSourceId}`
  }

  return `${NEW_OFFER_ID_PREFIX}${variantSku}`
}

export type VariantOwner = {
  readonly sku: string
  readonly productId: string
  readonly sourceId: number | null
}

// Offer ids for the variants of a sale, by the feed's own rules, so Google
// Ads can match the sale's products to the feed. The owners say whose each
// sku is; the product's listed variants say which one carries its WordPress
// id. A sku without an owner (its variant is gone) gets the id its sku alone
// gives.
export function offerIdLookupOf(
  owners: readonly VariantOwner[],
  listedVariantsByProduct: ReadonlyMap<string, readonly Pick<FeedVariant, 'sku'>[]>,
): (variantSku: string) => string {
  const ownerBySku = new Map(owners.map((owner) => [owner.sku, owner]))

  return (variantSku) => {
    const owner = ownerBySku.get(variantSku)
    if (!owner) return offerIdOf(variantSku, null, null)

    const carrierSku = productIdCarrierOf(listedVariantsByProduct.get(owner.productId) ?? [])
    return offerIdOf(variantSku, owner.sourceId, carrierSku)
  }
}

export type FeedItemContext = FeedChoices & {
  readonly siteUrl: string
  readonly brand: string
  readonly productIdCarrierSku: string | null
}

export function feedItemOf(
  product: FeedProduct,
  variant: FeedVariant,
  context: FeedItemContext,
): FeedItem {
  // A colour's own shot leads its offer, so the ad shows the pattern the
  // shopper is buying; the rest of the gallery follows it.
  const imageLink = variant.imageUrl ?? product.imageUrls[0] ?? null
  const moreImages = product.imageUrls.filter((url) => url !== imageLink)
  const distinguishing = [
    context.hasColorChoice ? variant.color : null,
    context.hasSizeChoice ? variant.size : null,
  ]

  return {
    id: offerIdOf(variant.sku, product.sourceId, context.productIdCarrierSku),
    itemGroupId: product.colorGroup ?? product.sku,
    title: feedTitle(product.title, distinguishing),
    description: feedDescription(product.description, product.title),
    link: productLink(context.siteUrl, product.slug, context.hasColorChoice ? variant.color : null),
    imageLink,
    additionalImageLinks: moreImages.slice(0, FEED_ADDITIONAL_IMAGES_MAX),
    availability: variant.stockQty > 0 ? 'in_stock' : 'out_of_stock',
    // The cart charges the product price plus the variant's delta; the feed
    // quotes the same sum, or Merchant Center finds the page disagreeing.
    price: feedPrice(product.priceCents + variant.priceDeltaCents, product.currency),
    salePrice:
      product.salePriceCents === null
        ? null
        : feedPrice(product.salePriceCents + variant.priceDeltaCents, product.currency),
    // The account's shipping rates in Merchant Center are weight-based, so
    // every item says what it weighs or its shipping cost cannot be quoted.
    shippingWeight: `${product.weightGrams} g`,
    brand: context.brand,
    color: variant.color,
    size: variant.size,
    productType: product.categoryName,
    googleProductCategory: product.googleCategory?.id ?? null,
    material: product.material,
    gender: product.googleCategory?.isApparel ? FEED_APPAREL_GENDER : null,
    ageGroup: product.googleCategory?.isApparel ? FEED_APPAREL_AGE_GROUP : null,
  }
}

// The fabric as the product page's spec table names it; products without
// that row simply carry no material.
export function materialOf(specs: readonly { label: string; value: string }[]): string | null {
  const value = specs.find((spec) => spec.label === FEED_MATERIAL_SPEC_LABEL)?.value.trim()
  if (!value) return null
  return value.slice(0, FEED_MATERIAL_MAX_LENGTH)
}

export function feedPrice(cents: number, currency: string): string {
  return `${decimalAmount(cents)} ${currency}`
}

// The page opens on the colour the item stands for, so the photo and the
// choice a shopper lands on match the ad they clicked. Cyrillic slugs are
// percent-encoded by URL: Merchant Center wants RFC 3986 links.
function productLink(siteUrl: string, slug: string, color: string | null): string {
  const base = new URL(`/product/${slug}/`, siteUrl).href
  return color ? `${base}?${COLOR_PARAM}=${encodeURIComponent(color)}` : base
}

function feedTitle(title: string, distinguishing: readonly (string | null)[]): string {
  const parts = distinguishing.filter((part): part is string => part !== null)
  const full = parts.length > 0 ? `${title} — ${parts.join(', ')}` : title
  return full.length <= FEED_TITLE_MAX_LENGTH
    ? full
    : `${full.slice(0, FEED_TITLE_MAX_LENGTH - 1)}…`
}

function feedDescription(description: string, title: string): string {
  const source = description.trim() ? plainTextOf(description) : title
  const text = source.replace(/\s+/g, ' ').trim()
  return text.length <= FEED_DESCRIPTION_MAX_LENGTH
    ? text
    : `${text.slice(0, FEED_DESCRIPTION_MAX_LENGTH - 1)}…`
}

// Merchant Center and Meta show the description as plain text, where the
// page's «## » headings and «- » bullets would print as literal marks. A
// heading or a bullet becomes a sentence of its own; paragraphs stay as typed.
function plainTextOf(description: string): string {
  return parseStory(description).map(blockText).join(' ')
}

function blockText(block: StoryBlock): string {
  if (block.type === 'list') return block.items.map(asSentence).join(' ')
  return block.type === 'heading' ? asSentence(block.text) : block.text
}

const SENTENCE_END = /[.!?:;…]$/

function asSentence(text: string): string {
  return SENTENCE_END.test(text) ? text : `${text}.`
}

// Meta matches pixel events to a catalogue item by its id: the cart and the
// order report the variant's sku, so that is the item id there. The legacy
// gla_ ids carry history only Merchant Center keeps.
export function metaCatalogItemOf(item: FeedItem, variantSku: string): FeedItem {
  return { ...item, id: variantSku }
}

export type FeedChannel = {
  readonly title: string
  readonly link: string
  readonly description: string
}

// RSS 2.0 with Google's namespace — the format Merchant Center fetches from a
// URL on a schedule.
export function merchantFeedXml(channel: FeedChannel, items: readonly FeedItem[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '<channel>',
    tag('title', channel.title),
    tag('link', channel.link),
    tag('description', channel.description),
    ...items.map(itemXml),
    '</channel>',
    '</rss>',
    '',
  ].join('\n')
}

function itemXml(item: FeedItem): string {
  const lines = [
    tag('g:id', item.id),
    tag('g:item_group_id', item.itemGroupId),
    tag('title', item.title),
    tag('description', item.description),
    tag('link', item.link),
    item.imageLink ? tag('g:image_link', item.imageLink) : null,
    ...item.additionalImageLinks.map((url) => tag('g:additional_image_link', url)),
    tag('g:availability', item.availability),
    tag('g:price', item.price),
    item.salePrice ? tag('g:sale_price', item.salePrice) : null,
    tag('g:shipping_weight', item.shippingWeight),
    tag('g:brand', item.brand),
    tag('g:condition', 'new'),
    // Hand-made goods: no barcode exists, and saying so keeps Merchant Center
    // from asking for one.
    tag('g:identifier_exists', 'no'),
    item.color ? tag('g:color', item.color) : null,
    item.size ? tag('g:size', item.size) : null,
    tag('g:product_type', item.productType),
    item.googleProductCategory === null
      ? null
      : tag('g:google_product_category', String(item.googleProductCategory)),
    item.material ? tag('g:material', item.material) : null,
    item.gender ? tag('g:gender', item.gender) : null,
    item.ageGroup ? tag('g:age_group', item.ageGroup) : null,
  ].filter((line): line is string => line !== null)

  return `<item>\n${lines.join('\n')}\n</item>`
}

function tag(name: string, value: string): string {
  return `<${name}>${escapeXml(value)}</${name}>`
}

// Characters XML 1.0 forbids outright are dropped; the five that carry
// meaning are escaped.
const FORBIDDEN_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g

export function escapeXml(value: string): string {
  return value
    .replace(FORBIDDEN_XML_CHARS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
