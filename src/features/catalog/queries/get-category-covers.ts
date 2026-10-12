import { cacheLife, cacheTag } from 'next/cache'
import { catalogReadRepository } from '@/features/catalog/repository/product-repository'
import { publicUrl } from '@/lib/storage'
import type { ProductImageView } from '@/features/catalog/model/product-view'

export async function getCategoryCover(categorySlug: string): Promise<ProductImageView | null> {
  'use cache'
  cacheTag('catalog')
  cacheLife('days')

  const [product] = await catalogReadRepository.findPublished({
    categorySlug,
    colors: [],
    weightBand: null,
    sort: 'price-desc',
    limit: 1,
    offset: 0,
  })

  if (!product) return null

  return coverOf(product.id)
}

export async function getProductCover(productSlug: string): Promise<ProductImageView | null> {
  'use cache'
  cacheTag('catalog')
  cacheLife('days')

  const [product] = await catalogReadRepository.findBySlugs([productSlug])

  if (!product) return null

  return coverOf(product.id)
}

async function coverOf(productId: string): Promise<ProductImageView | null> {
  const [image] = await catalogReadRepository.findImagesByProductIds([productId])

  if (!image) return null

  return {
    // The square rendition: these covers are cropped into wide boxes, and the
    // contained version would put white letterbox bars there instead of photo.
    url: publicUrl(image.squareStorageKey ?? image.storageKey),
    alt: image.alt,
    width: image.width,
    height: image.height,
  }
}
