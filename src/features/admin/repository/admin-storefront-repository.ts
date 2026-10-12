import { and, asc, eq, ilike, isNotNull, ne, or, sql } from 'drizzle-orm'
import { ProductStatus } from '@/db/enums'
import { categories, productImages, products } from '@/db/schema'
import { db } from '@/lib/db'
import { escapeLikePattern } from '@/lib/sql'

export type FeaturedProductRow = {
  readonly id: string
  readonly slug: string
  readonly title: string
  // Null only for a product whose category was removed under it.
  readonly categoryName: string | null
  readonly priceCents: number
  readonly imageStorageKey: string | null
  readonly featuredOrder: number | null
}

const coverImage = db
  .select({
    productId: productImages.productId,
    storageKey: sql<string>`min(coalesce(${productImages.squareStorageKey}, ${productImages.storageKey}))`.as(
      'storage_key',
    ),
  })
  .from(productImages)
  .groupBy(productImages.productId)
  .as('cover_image')

const boardColumns = {
  id: products.id,
  slug: products.slug,
  // The list shows the name a list should show.
  title: sql<string>`coalesce(${products.shortTitle}, ${products.title})`,
  categoryName: categories.name,
  priceCents: products.priceCents,
  imageStorageKey: coverImage.storageKey,
  featuredOrder: products.featuredOrder,
}

export const adminStorefrontRepository = {
  // The curated rail, in the order the owner arranged it.
  async findFeatured(): Promise<FeaturedProductRow[]> {
    return db
      .select(boardColumns)
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(coverImage, eq(coverImage.productId, products.id))
      .where(isNotNull(products.featuredOrder))
      .orderBy(asc(products.featuredOrder))
  },

  // Candidates for the rail: published, not already on it.
  async searchCandidates(term: string, limit: number): Promise<FeaturedProductRow[]> {
    const pattern = `%${escapeLikePattern(term.trim())}%`

    return db
      .select(boardColumns)
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(coverImage, eq(coverImage.productId, products.id))
      .where(
        and(
          eq(products.status, ProductStatus.Published),
          sql`${products.featuredOrder} is null`,
          term.trim() === ''
            ? undefined
            : or(
                ilike(products.title, pattern),
                ilike(products.shortTitle, pattern),
                ilike(products.sku, pattern),
              ),
        ),
      )
      .orderBy(asc(products.title))
      .limit(limit)
  },

  // The whole rail is written at once: an order is only meaningful as a
  // sequence, and a half-applied move would leave two products in one slot.
  async replaceFeatured(slugs: readonly string[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(products)
        .set({ featuredOrder: null, updatedAt: new Date() })
        .where(isNotNull(products.featuredOrder))

      for (const [index, slug] of slugs.entries()) {
        await tx
          .update(products)
          .set({ featuredOrder: index + 1, updatedAt: new Date() })
          .where(and(eq(products.slug, slug), ne(products.status, ProductStatus.Archived)))
      }
    })
  },
}
