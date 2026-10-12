import { cacheLife, cacheTag } from 'next/cache'
import { catalogReadRepository } from '@/features/catalog/repository/product-repository'

export async function getCategoryCounts(): Promise<Record<string, number>> {
  'use cache'
  cacheTag('catalog')
  cacheLife('days')

  const rows = await catalogReadRepository.countByCategory()

  return Object.fromEntries(rows.map((row) => [row.categorySlug, row.total]))
}
