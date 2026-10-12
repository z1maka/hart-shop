import { cacheLife, cacheTag } from 'next/cache'
import { getProductRatings } from '@/features/reviews'
import { announcedWholesale, wholesaleTierOf } from '@/features/catalog/model/pricing'
import { createMoney, Currency } from '@/lib/money'
import {
  FEATURED_MODE_KEY,
  FeaturedMode,
  parseFeaturedMode,
} from '@/config/storefront'
import { readShopSetting } from '@/lib/shop-settings'
import { COMPANIONS } from '@/config/catalog'
import { FEATURED_CATEGORY_SLUGS } from '@/config/site'
import { interleaveByCategory, pickCompanions } from '@/features/catalog/model/companions'
import {
  buildMetaLine,
  colorOf,
  effectivePrice,
  isVariantAvailable,
  struckPrice,
  type ProductCardView,
  type ProductImageView,
} from '@/features/catalog/model/product-view'
import {
  catalogReadRepository,
  type CatalogFilters,
  type CatalogProductRow,
  type CatalogSort,
  type CatalogWeightBand,
  type ProductImageRow,
  type ProductVariantRow,
} from '@/features/catalog/repository/product-repository'
import { publicUrl } from '@/lib/storage'
import { getTranslations } from 'next-intl/server'
import { FEATURED_EXCLUDED_SLUGS } from '@/config/catalog'

export type CatalogQuery = {
  readonly categorySlug: string | null
  readonly colors: readonly string[]
  readonly weightBand: CatalogWeightBand | null
  readonly sort: CatalogSort
  readonly page: number
}

export type CatalogPage = {
  readonly items: readonly ProductCardView[]
  readonly total: number
  readonly pageCount: number
  readonly page: number
}

export const CATALOG_PAGE_SIZE = 12

export async function getCatalogPage(query: CatalogQuery): Promise<CatalogPage> {
  'use cache'
  cacheTag('catalog')
  cacheLife('days')

  const filters: CatalogFilters = {
    categorySlug: query.categorySlug,
    colors: query.colors,
    weightBand: query.weightBand,
    sort: query.sort,
    limit: CATALOG_PAGE_SIZE,
    offset: (query.page - 1) * CATALOG_PAGE_SIZE,
  }

  const [rows, total] = await Promise.all([
    catalogReadRepository.findPublished(filters),
    catalogReadRepository.countPublished(filters),
  ])

  return {
    items: await toCardViews(rows),
    total,
    pageCount: Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE)),
    page: query.page,
  }
}

// The owner curates the rail through featured_order; while nothing is curated
// the shop falls back to a per-category mix — price-ordered alone would fill
// the row with ponchos, taking the categories in turn keeps every product
// family on the shelf.
export async function getFeaturedProducts(limit: number): Promise<ProductCardView[]> {
  'use cache'
  cacheTag('catalog')
  cacheLife('days')

  // The owner can hand the rail back to the shop without losing the list
  // they arranged: the switch lives in settings, the order stays in place.
  const mode = parseFeaturedMode(await readShopSetting<string>(FEATURED_MODE_KEY))
  const curated = mode === FeaturedMode.Auto ? [] : await catalogReadRepository.findCurated(limit)
  if (curated.length > 0) return toCardViews(curated)

  const rows = await catalogReadRepository.findFeatured(
    FEATURED_CATEGORY_SLUGS,
    limit * FEATURED_CATEGORY_SLUGS.length,
  )
  const eligible = rows.filter((row) => !FEATURED_EXCLUDED_SLUGS.includes(row.slug))

  return toCardViews(interleaveByCategory(eligible, FEATURED_CATEGORY_SLUGS).slice(0, limit))
}

// "З цим купують": what completes the viewed product rather than more of the
// same shelf. The rules live in config; the product's own category tops up.
export async function getCompanionProducts(
  categorySlug: string,
  excludeSlug: string,
  limit: number,
): Promise<ProductCardView[]> {
  'use cache'
  cacheTag('catalog')
  cacheLife('days')

  const rule = COMPANIONS[categorySlug] ?? { productSlugs: [], categorySlugs: [] }
  const [pinned, fromCategories, sameCategory] = await Promise.all([
    catalogReadRepository.findBySlugs(rule.productSlugs),
    rule.categorySlugs.length > 0
      ? catalogReadRepository.findFeatured(rule.categorySlugs, limit * rule.categorySlugs.length)
      : Promise.resolve([]),
    catalogReadRepository.findRelated(categorySlug, excludeSlug, limit + 1),
  ])

  const rows = pickCompanions<CatalogProductRow>({
    excludeSlug,
    limit,
    pinnedOrder: rule.productSlugs,
    pinned,
    categoryOrder: rule.categorySlugs,
    fromCategories,
    sameCategory,
  })
  return toCardViews(rows)
}

async function toCardViews(rows: readonly CatalogProductRow[]): Promise<ProductCardView[]> {
  const productT = await getTranslations('product')
  const productIds = rows.map((row) => row.id)
  const [variants, images, ratings] = await Promise.all([
    catalogReadRepository.findVariantsByProductIds(productIds),
    catalogReadRepository.findImagesByProductIds(productIds),
    getProductRatings(productIds),
  ])

  const variantsByProduct = groupByProduct(variants)
  const imagesByProduct = groupByProduct(images)

  return rows.map((row) => {
    const productImages = imagesByProduct.get(row.id) ?? []
    const [cover] = productImages
    const productVariants = variantsByProduct.get(row.id) ?? []
    const inStock = productVariants.filter((variant) => isVariantAvailable(variant.stockQty))

    return {
      slug: row.slug,
      sku: row.sku,
      title: row.shortTitle ?? row.title,
      badge: row.badge,
      categorySlug: row.categorySlug,
      metaLine: buildMetaLine(
        row.weightGrams,
        row.layers > 1 ? productT('layersMeta', { count: row.layers }) : null,
        productT('kgUnit'),
      ),
      price: effectivePrice(row.priceCents, row.salePriceCents),
      regularPrice: struckPrice(row.priceCents, row.salePriceCents),
      image: cover ? toCardImage(cover) : null,
      imagesByColor: imagesByColorOf(productVariants, productImages),
      colors: [
        ...new Set(
          productVariants
            .map((variant) => colorOf(variant.options))
            .filter((color): color is string => color !== null),
        ),
      ],
      // The card adds the first available variant and opens the mini cart, where
      // the chosen option is spelled out; the product page is for changing it.
      quickAddVariantId: inStock[0]?.id ?? null,
      quickAddVariantLabel: inStock[0] ? variantLabelOf(inStock[0].options) : null,
      variantChoiceCount: inStock.length,
      rating: ratingOf(ratings.get(row.id)),
      wholesale: wholesaleOf(row),
    }
  })
}

function wholesaleOf(row: CatalogProductRow): ProductCardView['wholesale'] {
  const tier = announcedWholesale({
    priceCents: row.priceCents,
    salePriceCents: row.salePriceCents,
    wholesale: wholesaleTierOf(row.wholesaleMinQty, row.wholesalePriceCents),
  })
  return tier ? { minQuantity: tier.minQuantity, price: createMoney(tier.priceCents, Currency.Uah) } : null
}

function ratingOf(
  rating: { readonly average: number; readonly count: number } | undefined,
): ProductCardView['rating'] {
  return rating && rating.count > 0 ? { average: rating.average, count: rating.count } : null
}

function variantLabelOf(options: Record<string, string>): string {
  return Object.values(options).join(' · ')
}

// The square crop: every card in a grid shares one shape.
function toCardImage(image: ProductImageRow): ProductImageView {
  return {
    url: publicUrl(image.squareStorageKey ?? image.storageKey),
    alt: image.alt,
    width: image.width,
    height: image.height,
  }
}

// The shot each colour named for itself; sizes of one colour share it, so
// the first variant to name one speaks for the colour.
function imagesByColorOf(
  variants: readonly ProductVariantRow[],
  images: readonly ProductImageRow[],
): Record<string, ProductImageView> {
  const byColor: Record<string, ProductImageView> = {}

  for (const variant of variants) {
    const color = colorOf(variant.options)
    if (color === null || variant.coverImageId === null || Object.hasOwn(byColor, color)) continue

    const image = images.find((candidate) => candidate.id === variant.coverImageId)
    if (image) byColor[color] = toCardImage(image)
  }

  return byColor
}

function groupByProduct<T extends { readonly productId: string }>(
  rows: readonly T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>()

  for (const row of rows) {
    const existing = grouped.get(row.productId)
    if (existing) {
      existing.push(row)
      continue
    }
    grouped.set(row.productId, [row])
  }

  return grouped
}

export type { ProductImageRow, ProductVariantRow }
