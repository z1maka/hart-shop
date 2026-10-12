import { cacheLife, cacheTag } from 'next/cache'
import { colorLinksOf, type ColorLink } from '@/features/catalog/model/color-siblings'
import { catalogReadRepository } from '@/features/catalog/repository/product-repository'

// The colour tiles that lead to the model's other pages; none for a product
// outside a colour group.
export async function getColorLinks(
  slug: string,
  colorGroup: string | null,
  ownColors: readonly string[],
): Promise<ColorLink[]> {
  'use cache'
  cacheTag('catalog')
  cacheLife('days')

  if (colorGroup === null) return []

  const siblings = await catalogReadRepository.findColorSiblings(colorGroup)
  return colorLinksOf(slug, ownColors, siblings)
}
