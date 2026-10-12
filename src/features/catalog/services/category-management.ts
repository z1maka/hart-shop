import type { FaqEntry } from '@/features/catalog/model/category-content'
import {
  categoryRepository,
  type CategoryCreateInput,
  type CategoryDetailsInput,
} from '@/features/catalog/repository/category-repository'
import {
  CategoryNotFoundError,
  CategoryOrderStaleError,
  CategorySlugTakenError,
} from '@/lib/errors'

export type CategoryDraft = CategoryCreateInput

export type VisibilityChange = {
  readonly slug: string
  readonly isVisible: boolean
  readonly productsAffected: number
}

export type CategoryVisibility = {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly description: string | null
  readonly seoTitle: string | null
  readonly seoDescription: string | null
  readonly seoText: string | null
  readonly faq: readonly FaqEntry[]
  readonly googleProductCategory: number | null
  readonly isVisible: boolean
}

export const categoryManagementService = {
  async setVisibility(slug: string, isVisible: boolean): Promise<VisibilityChange> {
    const productsAffected = await categoryRepository.setVisibility(slug, isVisible)

    return { slug, isVisible, productsAffected }
  },

  async create(input: CategoryDraft): Promise<CategoryVisibility> {
    const existing = await categoryRepository.findBySlug(input.slug)
    if (existing) throw new CategorySlugTakenError(input.slug)

    // Created hidden on purpose: an empty category in the header is the worst
    // thing a shopper can run into.
    const row = await categoryRepository.createHidden(input)

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      seoText: row.seoText,
      faq: row.faq,
      googleProductCategory: row.googleProductCategory,
      isVisible: row.isVisible,
    }
  },

  async updateDetails(categoryId: string, details: CategoryDetailsInput): Promise<void> {
    const updated = await categoryRepository.updateDetails(categoryId, details)
    if (!updated) throw new CategoryNotFoundError(categoryId)
  },

  async reorder(slugs: readonly string[]): Promise<void> {
    const isReordered = await categoryRepository.reorder(slugs)
    if (!isReordered) throw new CategoryOrderStaleError()
  },

  async listAll(): Promise<CategoryVisibility[]> {
    const rows = await categoryRepository.findAllWithVisibility()

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      seoText: row.seoText,
      faq: row.faq,
      googleProductCategory: row.googleProductCategory,
      isVisible: row.isVisible,
    }))
  },
}
