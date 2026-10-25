import { cacheLife, cacheTag } from 'next/cache'
import {
  MERCHANT_FEED_CATEGORY_SLUGS,
  MERCHANT_FEED_FOX_PHOTO_SLUGS,
} from '@/config/merchant-feed'
import { META_CATALOG_CATEGORY_SLUGS } from '@/config/meta-catalog'
import { siteConfig } from '@/config/site'
import { effectiveGoogleCategory } from '@/features/catalog/model/google-category'
import {
  feedItemOf,
  feedListedProducts,
  feedListedVariants,
  materialOf,
  merchantFeedXml,
  metaCatalogItemOf,
  productIdCarrierOf,
  type FeedChoices,
  type FeedItem,
} from '@/features/catalog/model/merchant-feed'
import { colorOf, sizeOf } from '@/features/catalog/model/product-view'
import {
  catalogReadRepository,
  type FeedProductRow,
  type ProductImageRow,
  type ProductVariantRow,
} from '@/features/catalog/repository/product-repository'
import { env } from '@/lib/env'
import { publicUrl } from '@/lib/storage'

// One item per variant a shopper can buy, as Merchant Center lists them. The
// catalogue changes a few times a day at most, and every change drops the
// 'catalog' tag, so the file is rebuilt only when it would differ.
export async function getMerchantFeedXml(): Promise<string> {
  'use cache'
  cacheTag('catalog')
  cacheLife('hours')

  const products = await listedProductsIn(MERCHANT_FEED_CATEGORY_SLUGS)
  return feedXml(
    await feedItems(
      products.filter((product) => !MERCHANT_FEED_FOX_PHOTO_SLUGS.includes(product.slug)),
    ),
  )
}

// The same items for Meta's catalogue, cut to what the workshop sews and
// keyed by variant sku (model/merchant-feed.ts says why).
export async function getMetaCatalogXml(): Promise<string> {
  'use cache'
  cacheTag('catalog')
  cacheLife('hours')

  return feedXml(
    await feedItems(await listedProductsIn(META_CATALOG_CATEGORY_SLUGS), metaCatalogItemOf),
  )
}

async function listedProductsIn(categorySlugs: readonly string[]): Promise<FeedProductRow[]> {
  return feedListedProducts(await catalogReadRepository.findPublishedForFeed()).filter((product) =>
    categorySlugs.includes(product.categorySlug),
  )
}

type ItemIdRule = (item: FeedItem, variantSku: string) => FeedItem

const KEEP_ITEM_ID: ItemIdRule = (item) => item

async function feedItems(
  products: readonly FeedProductRow[],
  rekey: ItemIdRule = KEEP_ITEM_ID,
): Promise<FeedItem[]> {
  const productIds = products.map((product) => product.id)
  const [variants, images] = await Promise.all([
    catalogReadRepository.findVariantsByProductIds(productIds),
    catalogReadRepository.findImagesByProductIds(productIds),
  ])

  const variantsByProduct = groupByProduct(feedListedVariants(variants))
  const imagesByProduct = groupByProduct(images)
  return products.flatMap((product) =>
    itemsOf(
      product,
      variantsByProduct.get(product.id) ?? [],
      imagesByProduct.get(product.id) ?? [],
      rekey,
    ),
  )
}

function feedXml(items: readonly FeedItem[]): string {
  return merchantFeedXml(
    {
      title: siteConfig.name,
      link: `${env.NEXT_PUBLIC_SITE_URL}/`,
      description: siteConfig.description,
    },
    items,
  )
}

function itemsOf(
  product: FeedProductRow,
  variants: readonly ProductVariantRow[],
  images: readonly ProductImageRow[],
  rekey: ItemIdRule,
): FeedItem[] {
  const context = {
    ...choicesOf(variants),
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
    brand: product.brand ?? siteConfig.name,
    productIdCarrierSku: productIdCarrierOf(variants),
  }
  const feedProduct = {
    ...product,
    googleCategory: effectiveGoogleCategory(
      product.productGoogleCategory,
      product.categoryGoogleCategory,
    ),
    material: materialOf(product.specs),
    imageUrls: images.map((image) => publicUrl(image.storageKey)),
  }
  const imageUrlById = new Map(images.map((image) => [image.id, publicUrl(image.storageKey)]))

  return variants.map((variant) =>
    rekey(
      feedItemOf(
        feedProduct,
        {
          sku: variant.sku,
          color: colorOf(variant.options),
          size: sizeOf(variant.options),
          priceDeltaCents: variant.priceDeltaCents,
          stockQty: variant.stockQty,
          imageUrl: variant.coverImageId ? (imageUrlById.get(variant.coverImageId) ?? null) : null,
        },
        context,
      ),
      variant.sku,
    ),
  )
}

function choicesOf(variants: readonly ProductVariantRow[]): FeedChoices {
  const distinct = (read: (options: Record<string, string>) => string | null) =>
    new Set(variants.map((variant) => read(variant.options)).filter(Boolean)).size > 1

  return { hasColorChoice: distinct(colorOf), hasSizeChoice: distinct(sizeOf) }
}

function groupByProduct<T extends { readonly productId: string }>(
  rows: readonly T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const row of rows) groups.set(row.productId, [...(groups.get(row.productId) ?? []), row])
  return groups
}
