import { cacheLife, cacheTag } from 'next/cache'
import { categoryRepository } from '@/features/catalog/repository/category-repository'
import { catalogReadRepository } from '@/features/catalog/repository/product-repository'
import { publicUrl } from '@/lib/storage'

export type SitemapEntry = {
  readonly slug: string
  readonly lastModified: Date
}

export type ProductSitemapEntry = SitemapEntry & {
  // Gear is searched by picture too: the photos go into the sitemap so Google
  // Images finds them with their product page.
  readonly imageUrls: readonly string[]
}

export type CatalogSitemap = {
  readonly categories: readonly SitemapEntry[]
  readonly products: readonly ProductSitemapEntry[]
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
  const images = await catalogReadRepository.findImagesByProductIds(products.map((row) => row.id))
  const imageUrlsByProduct = new Map<string, string[]>()
  for (const image of images) {
    imageUrlsByProduct.set(image.productId, [
      ...(imageUrlsByProduct.get(image.productId) ?? []),
      publicUrl(image.storageKey),
    ])
  }

  return {
    categories: categories.map((row) => ({ slug: row.slug, lastModified: row.updatedAt })),
    products: products.map((row) => ({
      slug: row.slug,
      lastModified: row.updatedAt,
      imageUrls: imageUrlsByProduct.get(row.id) ?? [],
    })),
  }
}
