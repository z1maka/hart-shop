import type { FaqEntry } from '@/features/catalog/model/category-content'
import { and, asc, eq, notInArray, type InferSelectModel } from 'drizzle-orm'
import { categories, products } from '@/db/schema'
import { ProductStatus } from '@/db/enums'
import { db } from '@/lib/db'

export type CategoryRow = InferSelectModel<typeof categories>

export type CategoryUpsertInput = {
  readonly slug: string
  readonly name: string
  readonly description: string
  readonly position: number
}

export type CategoryDetailsInput = {
  readonly name: string
  readonly description: string | null
  readonly seoTitle: string | null
  readonly seoDescription: string | null
  readonly seoText: string | null
  readonly faq: readonly FaqEntry[]
  readonly googleProductCategory: number | null
}

export type CategoryCreateInput = {
  readonly slug: string
  readonly name: string
  readonly description: string
  readonly position: number
}

export const categoryRepository = {
  async createHidden(input: CategoryCreateInput): Promise<CategoryRow> {
    const [row] = await db
      .insert(categories)
      .values({ ...input, isVisible: false })
      .returning()

    if (!row) throw new Error(`Category "${input.slug}" could not be created`)

    return row
  },

  async upsert(input: CategoryUpsertInput): Promise<CategoryRow> {
    const [row] = await db
      .insert(categories)
      .values(input)
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          name: input.name,
          description: input.description,
          position: input.position,
          updatedAt: new Date(),
        },
      })
      .returning()

    if (!row) {
      throw new Error(`Category "${input.slug}" could not be written`)
    }

    return row
  },

  // The shop only ever lists visible categories; findAllWithVisibility is for the
  // switch itself, so a hidden category can be found and turned back on.
  async findAll(): Promise<CategoryRow[]> {
    return db
      .select()
      .from(categories)
      .where(eq(categories.isVisible, true))
      .orderBy(asc(categories.position))
  },

  // Hiding a category takes its products out of the shop but keeps every row, so
  // the switch is reversible and order history stays intact.
  async setVisibility(slug: string, isVisible: boolean): Promise<number> {
    return db.transaction(async (tx) => {
      const [category] = await tx
        .update(categories)
        .set({ isVisible, updatedAt: new Date() })
        .where(eq(categories.slug, slug))
        .returning({ id: categories.id })

      if (!category) return 0

      // Hiding archives only what was actually on sale and marks each row, so
      // re-publishing restores exactly set — a product archived by hand
      // before the category was hidden stays archived.
      const affected = isVisible
        ? await tx
            .update(products)
            .set({
              status: ProductStatus.Published,
              archivedByCategory: false,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(products.categoryId, category.id),
                eq(products.status, ProductStatus.Archived),
                eq(products.archivedByCategory, true),
              ),
            )
            .returning({ id: products.id })
        : await tx
            .update(products)
            .set({
              status: ProductStatus.Archived,
              archivedByCategory: true,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(products.categoryId, category.id),
                eq(products.status, ProductStatus.Published),
              ),
            )
            .returning({ id: products.id })

      return affected.length
    })
  },

  // The whole order at once, as the admin dropped it: accepted only when it
  // names exactly the categories there are, so a stale list cannot lose one.
  async reorder(slugs: readonly string[]): Promise<boolean> {
    return db.transaction(async (tx) => {
      const rows = await tx
        .select({ id: categories.id, slug: categories.slug })
        .from(categories)
        .orderBy(asc(categories.position))

      const idBySlug = new Map(rows.map((row) => [row.slug, row.id]))
      const isSameSet = slugs.length === rows.length && slugs.every((slug) => idBySlug.has(slug))
      if (!isSameSet || new Set(slugs).size !== slugs.length) return false

      for (const [position, slug] of slugs.entries()) {
        const id = idBySlug.get(slug)
        if (!id) return false
        await tx
          .update(categories)
          .set({ position, updatedAt: new Date() })
          .where(eq(categories.id, id))
      }
      return true
    })
  },

  async updateDetails(categoryId: string, details: CategoryDetailsInput): Promise<boolean> {
    const updated = await db
      .update(categories)
      .set({ ...details, faq: [...details.faq], updatedAt: new Date() })
      .where(eq(categories.id, categoryId))
      .returning({ id: categories.id })

    return updated.length > 0
  },

  async findAllWithVisibility(): Promise<CategoryRow[]> {
    return db.select().from(categories).orderBy(asc(categories.position))
  },

  async deleteMissing(keepSlugs: readonly string[]): Promise<string[]> {
    const removed = await db
      .delete(categories)
      .where(notInArray(categories.slug, [...keepSlugs]))
      .returning({ slug: categories.slug })

    return removed.map((row) => row.slug)
  },

  async isVisible(slug: string): Promise<boolean> {
    const [row] = await db
      .select({ isVisible: categories.isVisible })
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1)

    return row?.isVisible ?? true
  },

  async findBySlug(slug: string): Promise<CategoryRow | null> {
    const [row] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1)
    return row ?? null
  },
}
