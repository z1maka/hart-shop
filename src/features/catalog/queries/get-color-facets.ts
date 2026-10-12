import { cacheLife, cacheTag } from 'next/cache'
import { catalogReadRepository } from '@/features/catalog/repository/product-repository'

const HIDDEN_COLORS: readonly string[] = ['Standard']

export async function getColorFacets(): Promise<string[]> {
  'use cache'
  cacheTag('catalog')
  cacheLife('days')

  const colors = await catalogReadRepository.findColors()

  return colors.filter((color) => !HIDDEN_COLORS.includes(color)).sort()
}
