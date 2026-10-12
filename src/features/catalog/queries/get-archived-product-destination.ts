import { cacheLife, cacheTag } from 'next/cache'
import { archivedProductDestination } from '@/features/catalog/model/archived-product'
import { catalogReadRepository } from '@/features/catalog/repository/product-repository'

// Null when the slug names no archived product: the page then answers 404.
export async function getArchivedProductDestination(slug: string): Promise<string | null> {
  'use cache'
  cacheTag('catalog')
  cacheTag(`product:${slug}`)
  cacheLife('days')

  const row = await catalogReadRepository.findArchivedBySlug(slug)

  return row ? archivedProductDestination(row) : null
}
