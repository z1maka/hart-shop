import { cacheLife, cacheTag } from 'next/cache'
import { MERCHANT_FEED_CATEGORY_SLUGS, MERCHANT_FEED_FOX_PHOTO_SLUGS } from '@/config/merchant-feed'
import { COMPANY } from '@/config/company'
import { META_CATALOG_CATEGORY_SLUGS } from '@/config/meta-catalog'
import { PARTNER_FEED_CATEGORY_SLUGS } from '@/config/partner-feed'
import { siteConfig } from '@/config/site'
import { effectiveGoogleCategory } from '@/features/catalog/model/google-category'
import {
  feedItemOf,
  feedListedProducts,
  feedListedVariants,
  materialOf,
  merchantFeedXml,
  metaCatalogItemOf,
  offerIdLookupOf,
  productIdCarrierOf,
  type FeedChoices,
  type FeedItem,
} from '@/features/catalog/model/merchant-feed'
import {
  partnerCategoriesOf,
  partnerCategoryIdOf,
  partnerFeedYml,
  partnerOfferOf,
} from '@/features/catalog/model/partner-feed'
import { singleUnitPriceCents } from '@/features/catalog/model/pricing'
import { colorOf, sizeOf } from '@/features/catalog/model/product-view'
import {
  catalogReadRepository,
  type FeedProductRow,
  type ProductImageRow,
  type ProductVariantRow,
} from '@/features/catalog/repository/product-repository'
import { formatDateTimeIsoKyiv } from '@/lib/datetime'
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
      AS_IS,
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
    await feedItems(await listedProductsIn(META_CATALOG_CATEGORY_SLUGS), (item, variant) =>
      metaCatalogItemOf(item, variant.sku),
    ),
  )
}

// The YML file dropshipping partners import into their shops
// (model/partner-feed.ts says what it leaves out).
export async function getPartnerFeedYml(): Promise<string> {
  'use cache'
  cacheTag('catalog')
  cacheLife('hours')

  const products = await listedProductsIn(PARTNER_FEED_CATEGORY_SLUGS)
  const offers = await feedItems(products, (item, variant, product) =>
    partnerOfferOf(item, {
      sku: variant.sku,
      categoryId: partnerCategoryIdOf(PARTNER_FEED_CATEGORY_SLUGS, product.categorySlug),
      minimumPriceCents: singleUnitPriceCents(product) + variant.priceDeltaCents,
      currency: product.currency,
      description: product.description,
      weightGrams: product.weightGrams,
    }),
  )

  return partnerFeedYml({
    shop: {
      name: siteConfig.name,
      company: COMPANY.legalName,
      url: `${env.NEXT_PUBLIC_SITE_URL}/`,
    },
    generatedAt: formatDateTimeIsoKyiv(new Date()),
    categories: partnerCategoriesOf(PARTNER_FEED_CATEGORY_SLUGS, products),
    offers,
  })
}

// The feed's offer id for each of these variants (model/merchant-feed.ts,
// offerIdLookupOf).
export async function getMerchantOfferIdLookup(
  skus: readonly string[],
): Promise<(variantSku: string) => string> {
  const owners = await catalogReadRepository.findVariantOwnersBySkus(skus)
  const variants = await catalogReadRepository.findVariantsByProductIds([
    ...new Set(owners.map((owner) => owner.productId)),
  ])
  return offerIdLookupOf(owners, groupByProduct(feedListedVariants(variants)))
}

async function listedProductsIn(categorySlugs: readonly string[]): Promise<FeedProductRow[]> {
  return feedListedProducts(await catalogReadRepository.findPublishedForFeed()).filter((product) =>
    categorySlugs.includes(product.categorySlug),
  )
}

// What one listed variant becomes in a feed: Merchant Center's item as built,
// Meta's keyed by sku, a partner's offer.
type EntryRule<T> = (item: FeedItem, variant: ProductVariantRow, product: FeedProductRow) => T

const AS_IS: EntryRule<FeedItem> = (item) => item

async function feedItems<T>(
  products: readonly FeedProductRow[],
  toEntry: EntryRule<T>,
): Promise<T[]> {
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
      toEntry,
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

function itemsOf<T>(
  product: FeedProductRow,
  variants: readonly ProductVariantRow[],
  images: readonly ProductImageRow[],
  toEntry: EntryRule<T>,
): T[] {
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
    toEntry(
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
      variant,
      product,
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
