import { cacheLife, cacheTag } from 'next/cache'
import { categoryRepository } from '@/features/catalog/repository/category-repository'
import { catalogReadRepository } from '@/features/catalog/repository/product-repository'

export type SitemapEntry = {
  readonly slug: string
  readonly lastModified: Date
}

export type CatalogSitemap = {
  readonly categories: readonly SitemapEntry[]
  readonly products: readonly SitemapEntry[]
}

// Tagged with the catalog like every other read path, so publishing a product
// or unhiding a category rebuilds the sitemap on the same request that changed
// it — there is nothing separate to regenerate.
export async function getCatalogSitemap(): Promise<CatalogSitemap> {
  'use cache'
  cacheTag('catalog')
  cacheLife('days')

  const [categories, products] = await Promise.all([
    categoryRepository.findAll(),
    catalogReadRepository.findPublishedForSitemap(),
  ])

  return {
    categories: categories.map((row) => ({ slug: row.slug, lastModified: row.updatedAt })),
    products: products.map((row) => ({ slug: row.slug, lastModified: row.updatedAt })),
  }
}
