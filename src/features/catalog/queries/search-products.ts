import { cacheLife, cacheTag } from 'next/cache'
import { buildMetaLine, effectivePrice } from '@/features/catalog/model/product-view'
import {
  catalogReadRepository,
  type CatalogProductRow,
} from '@/features/catalog/repository/product-repository'
import { formatMoney } from '@/lib/money'
import { publicUrl } from '@/lib/storage'
import { getTranslations } from 'next-intl/server'

export type SearchResultView = {
  readonly slug: string
  readonly title: string
  readonly meta: string
  readonly priceLabel: string
  readonly imageUrl: string | null
}

export const SEARCH_RESULT_LIMIT = 6
export async function searchProducts(term: string): Promise<SearchResultView[]> {
  const trimmed = term.trim()

  if (!trimmed) return getPopularProducts()

  return toResultViews(await catalogReadRepository.search(trimmed, SEARCH_RESULT_LIMIT))
}

// Only the term-free list is cached: caching by search term would key the cache
// store on arbitrary visitor input.
async function getPopularProducts(): Promise<SearchResultView[]> {
  'use cache'
  cacheTag('catalog')
  cacheLife('days')

  return toResultViews(
    await catalogReadRepository.findPublished({
      categorySlug: null,
      colors: [],
      weightBand: null,
      sort: 'price-desc',
      limit: SEARCH_RESULT_LIMIT,
      offset: 0,
    }),
  )
}

async function toResultViews(rows: readonly CatalogProductRow[]): Promise<SearchResultView[]> {
  const productT = await getTranslations('product')
  const images = await catalogReadRepository.findImagesByProductIds(rows.map((row) => row.id))
  const coverByProduct = new Map(
    images.filter((image) => image.position === 0).map((image) => [image.productId, image]),
  )

  return rows.map((row) => {
    const cover = coverByProduct.get(row.id)

    return {
      slug: row.slug,
      title: row.title,
      meta: buildMetaLine(
        row.weightGrams,
        row.layers > 1 ? productT('layersMeta', { count: row.layers }) : null,
        productT('kgUnit'),
      ),
      priceLabel: formatMoney(effectivePrice(row.priceCents, row.salePriceCents)),
      imageUrl: cover ? publicUrl(cover.squareStorageKey ?? cover.storageKey) : null,
    }
  })
}
