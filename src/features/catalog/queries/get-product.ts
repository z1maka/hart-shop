import { cacheLife, cacheTag } from 'next/cache'
import {
  parseStory,
  type FaqEntry,
  type StoryBlock,
} from '@/features/catalog/model/category-content'
import type { ProductVideo } from '@/features/catalog/model/product-video'
import {
  colorOf,
  sizeOf,
  formatWeight,
  isVariantAvailable,
  effectivePrice,
  mergeSpecs,
  metaDescription,
  struckPrice,
  type ProductImageView,
  type ProductVariantView,
} from '@/features/catalog/model/product-view'
import {
  announcedWholesale,
  wholesaleTierOf,
  type PricedProduct,
} from '@/features/catalog/model/pricing'
import { catalogReadRepository } from '@/features/catalog/repository/product-repository'
import { createMoney, Currency, type Money } from '@/lib/money'
import { publicUrl } from '@/lib/storage'
import { getTranslations } from 'next-intl/server'

export type SpecRowView = {
  readonly label: string
  readonly value: string
}

export type WholesaleView = {
  readonly minQuantity: number
  readonly price: Money
  readonly discountPercent: number
}

export type ProductDetailView = {
  readonly slug: string
  readonly sku: string
  readonly title: string
  readonly badge: string | null
  readonly kicker: string
  readonly description: string
  // The description as the page prints it: «## » headings and «- » lists.
  readonly descriptionBlocks: readonly StoryBlock[]
  // The short lead under the price; empty until someone writes one.
  readonly summary: string
  readonly price: Money
  readonly regularPrice: Money | null
  // The volume price, when the product has one.
  readonly wholesale: WholesaleView | null
  readonly layers: number
  readonly weightGrams: number
  readonly categorySlug: string
  readonly categoryName: string
  readonly images: readonly ProductImageView[]
  readonly variants: readonly ProductVariantView[]
  readonly specs: readonly SpecRowView[]
  readonly videos: readonly ProductVideo[]
  readonly included: readonly string[]
  readonly careNotes: readonly string[]
  readonly stockTotal: number
  readonly seoTitle: string
  readonly seoDescription: string
  // Null carries the shop's name: its own sewing, or goods without a brand.
  readonly brand: string | null
  readonly colorGroup: string | null
  readonly faq: readonly FaqEntry[]
}

export async function getProductBySlug(slug: string): Promise<ProductDetailView | null> {
  'use cache'
  cacheTag('catalog')
  cacheTag(`product:${slug}`)
  cacheLife('days')

  const row = await catalogReadRepository.findDetailBySlug(slug)

  if (!row) return null

  const productT = await getTranslations('product')
  const colorsT = await getTranslations('colors')
  const categoryName = row.categoryName

  const [variants, images] = await Promise.all([
    catalogReadRepository.findVariantsByProductIds([row.id]),
    catalogReadRepository.findImagesByProductIds([row.id]),
  ])

  const colors = [
    ...new Set(
      variants
        .map((variant) => colorOf(variant.options))
        .filter((color): color is string => color !== null),
    ),
  ]

  return {
    slug: row.slug,
    sku: row.sku,
    title: row.title,
    badge: row.badge,
    // The bare article number sat directly above the price and read as a
    // second price; it is labelled now.
    kicker:
      row.layers > 1
        ? `${categoryName} · ${productT('skuMeta', { sku: row.sku })} · ${productT('layersMeta', { count: row.layers })}`
        : `${categoryName} · ${productT('skuMeta', { sku: row.sku })}`,
    description: row.description,
    descriptionBlocks: parseStory(row.description),
    price: effectivePrice(row.priceCents, row.salePriceCents),
    regularPrice: struckPrice(row.priceCents, row.salePriceCents),
    wholesale: wholesaleViewOf({
      priceCents: row.priceCents,
      salePriceCents: row.salePriceCents,
      wholesale: wholesaleTierOf(row.wholesaleMinQty, row.wholesalePriceCents),
    }),
    layers: row.layers,
    weightGrams: row.weightGrams,
    categorySlug: row.categorySlug,
    categoryName,
    // Every photo of a product carries the same alt in the database; the
    // page tells them apart so an image search can name the second and the
    // third.
    images: images.map((image, index) => ({
      url: publicUrl(image.storageKey),
      alt: index === 0 ? image.alt : `${image.alt} — фото ${index + 1}`,
      width: image.width,
      height: image.height,
    })),
    variants: variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      color: colorOf(variant.options) ?? 'Standard',
      size: sizeOf(variant.options),
      label: Object.values(variant.options).join(' · '),
      stockQty: variant.stockQty,
      isAvailable: isVariantAvailable(variant.stockQty),
      imageIndex: galleryIndexOf(images, variant.coverImageId),
    })),
    videos: row.videos,
    specs: mergeSpecs(
      [
        ...(row.weightGrams > 0
          ? [
              {
                label: productT('specWeight'),
                value: formatWeight(row.weightGrams, productT('kgUnit')),
              },
            ]
          : []),
        ...(row.layers > 1 ? [{ label: productT('specLayers'), value: String(row.layers) }] : []),
      ],
      row.specs.map((spec) => ({ label: spec.label, value: spec.value })),
      colors.length > 0 && (colors.length > 1 || colors[0] !== 'Standard')
        ? [
            {
              label: productT('specColours'),
              value: colors
                .map((color) => (colorsT.has(color) ? colorsT(color) : color))
                .join(' · '),
            },
          ]
        : [],
    ),
    summary: (row.summary ?? '').trim(),
    included: row.included,
    careNotes: row.careNotes,
    stockTotal: variants.reduce((total, variant) => total + variant.stockQty, 0),
    seoTitle: row.seoTitle ?? row.title,
    seoDescription: metaDescription(row.summary, row.seoDescription, row.description),
    brand: row.brand,
    colorGroup: row.colorGroup,
    faq: row.faq,
  }
}

// The gallery is handed over in position order, so a row's place in the list
// is the index the gallery understands.
function galleryIndexOf(
  images: readonly { readonly id: string }[],
  imageId: string | null,
): number | null {
  if (imageId === null) return null
  const index = images.findIndex((image) => image.id === imageId)
  return index === -1 ? null : index
}

export async function getPublishedProductSlugs(): Promise<string[]> {
  'use cache'
  cacheTag('catalog')
  cacheLife('days')

  return catalogReadRepository.findPublishedSlugs()
}

function wholesaleViewOf(product: PricedProduct): WholesaleView | null {
  const tier = announcedWholesale(product)
  if (!tier) return null

  return {
    minQuantity: tier.minQuantity,
    price: createMoney(tier.priceCents, Currency.Uah),
    discountPercent: tier.discountPercent,
  }
}
