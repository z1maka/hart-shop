import { cacheLife, cacheTag } from 'next/cache'
import { parseStory, type FaqEntry, type StoryBlock } from '@/features/catalog/model/category-content'
import { categoryRepository } from '@/features/catalog/repository/category-repository'

export type CategoryView = {
  readonly slug: string
  readonly name: string
  readonly description: string
  // The search snippet; falls back to the name and the description.
  readonly seoTitle: string
  readonly seoDescription: string
  // The long read under the grid and the buyers' questions; both empty
  // until written in the admin.
  readonly story: readonly StoryBlock[]
  readonly faq: readonly FaqEntry[]
}

export async function getCategories(): Promise<CategoryView[]> {
  'use cache'
  cacheTag('catalog')
  cacheLife('days')

  const rows = await categoryRepository.findAll()

  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description ?? '',
    seoTitle: row.seoTitle ?? row.name,
    seoDescription: row.seoDescription ?? row.description ?? '',
    story: parseStory(row.seoText ?? ''),
    faq: row.faq,
  }))
}
