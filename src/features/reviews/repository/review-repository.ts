import { and, count, desc, eq, ilike, inArray, or, sql, type InferSelectModel, type SQL } from 'drizzle-orm'
import { orderPhoneVariantsOf } from '@/features/reviews/model/review-phone'
import { orderItems, orders, productReviews, products } from '@/db/schema'
import { ReviewStatus, type ReviewSource } from '@/db/enums'
import { db } from '@/lib/db'

export type ReviewRow = InferSelectModel<typeof productReviews>

export type ReviewProductRow = {
  readonly id: string
  readonly slug: string
  readonly title: string
}

export type AdminReviewRow = {
  readonly review: ReviewRow
  readonly product: { readonly slug: string; readonly title: string }
}

export type ReviewCreateInput = {
  readonly productId: string
  readonly authorName: string
  readonly rating: number
  readonly body: string
  readonly color: string | null
  readonly phoneDigits: string | null
  readonly isVerifiedPurchase: boolean
}

export type ImportedReviewInput = {
  readonly productId: string
  readonly source: ReviewSource
  readonly sourceId: string
  readonly authorName: string
  readonly rating: number
  readonly body: string
  readonly tags: readonly string[]
  readonly isVerifiedPurchase: boolean
  readonly createdAt: Date
}

export type ProductRating = {
  readonly productId: string
  readonly average: number
  readonly count: number
}

export type ReviewPageQuery = {
  readonly status: ReviewStatus
  readonly search: string | null
  readonly limit: number
  readonly offset: number
}

const IMPORT_BATCH_SIZE = 100

export const reviewRepository = {
  async findProductBySlug(slug: string): Promise<ReviewProductRow | null> {
    const [row] = await db
      .select({ id: products.id, slug: products.slug, title: products.title })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1)

    return row ?? null
  },

  async findPublishedBySlug(slug: string): Promise<ReviewRow[]> {
    const rows = await db
      .select({ review: productReviews })
      .from(productReviews)
      .innerJoin(products, eq(products.id, productReviews.productId))
      .where(and(eq(products.slug, slug), eq(productReviews.status, ReviewStatus.Published)))
      .orderBy(desc(productReviews.createdAt))

    return rows.map((row) => row.review)
  },

  async ratingsForProducts(productIds: readonly string[]): Promise<ProductRating[]> {
    if (productIds.length === 0) return []

    const rows = await db
      .select({
        productId: productReviews.productId,
        average: sql<number>`avg(${productReviews.rating})::float`,
        total: count(),
      })
      .from(productReviews)
      .where(
        and(
          inArray(productReviews.productId, [...productIds]),
          eq(productReviews.status, ReviewStatus.Published),
        ),
      )
      .groupBy(productReviews.productId)

    return rows.map((row) => ({
      productId: row.productId,
      average: Number(row.average),
      count: row.total,
    }))
  },

  async create(input: ReviewCreateInput): Promise<ReviewRow> {
    const [row] = await db
      .insert(productReviews)
      .values({ ...input, status: ReviewStatus.Pending })
      .returning()

    if (!row) throw new Error('Review could not be stored')

    return row
  },

  async findPage(query: ReviewPageQuery): Promise<AdminReviewRow[]> {
    return db
      .select({ review: productReviews, product: { slug: products.slug, title: products.title } })
      .from(productReviews)
      .innerJoin(products, eq(products.id, productReviews.productId))
      .where(and(eq(productReviews.status, query.status), searchCondition(query.search)))
      .orderBy(desc(productReviews.createdAt))
      .limit(query.limit)
      .offset(query.offset)
  },

  async countMatching(status: ReviewStatus, search: string | null): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(productReviews)
      .innerJoin(products, eq(products.id, productReviews.productId))
      .where(and(eq(productReviews.status, status), searchCondition(search)))

    return row?.total ?? 0
  },

  async countByStatus(): Promise<Record<ReviewStatus, number>> {
    const rows = await db
      .select({ status: productReviews.status, total: count() })
      .from(productReviews)
      .groupBy(productReviews.status)

    const counts: Record<ReviewStatus, number> = {
      [ReviewStatus.Pending]: 0,
      [ReviewStatus.Published]: 0,
      [ReviewStatus.Rejected]: 0,
    }
    for (const row of rows) counts[row.status] = row.total

    return counts
  },

  async setStatus(reviewId: string, status: ReviewStatus): Promise<boolean> {
    const updated = await db
      .update(productReviews)
      // publishedAt is the first publication and stays through a rejection:
      // a review brought back keeps its place in time.
      .set({
        status,
        ...(status === ReviewStatus.Published
          ? { publishedAt: sql`coalesce(${productReviews.publishedAt}, now())` }
          : {}),
      })
      .where(eq(productReviews.id, reviewId))
      .returning({ id: productReviews.id })

    return updated.length > 0
  },

  async setReply(reviewId: string, body: string): Promise<boolean> {
    const updated = await db
      .update(productReviews)
      .set({ replyBody: body, repliedAt: new Date() })
      .where(eq(productReviews.id, reviewId))
      .returning({ id: productReviews.id })

    return updated.length > 0
  },

  // Re-runnable: a review already carried over (same source and identity)
  // keeps its moderation and gets its tags refreshed; the count is what was
  // written either way.
  async insertImported(rows: readonly ImportedReviewInput[]): Promise<number> {
    let inserted = 0

    for (let start = 0; start < rows.length; start += IMPORT_BATCH_SIZE) {
      const batch = rows.slice(start, start + IMPORT_BATCH_SIZE)
      const written = await db
        .insert(productReviews)
        .values(
          batch.map((row) => ({
            ...row,
            tags: [...row.tags],
            status: ReviewStatus.Published,
            publishedAt: row.createdAt,
            color: null,
            phoneDigits: null,
          })),
        )
        .onConflictDoUpdate({
          target: [productReviews.source, productReviews.sourceId],
          set: { tags: sql`excluded.tags` },
        })
        .returning({ id: productReviews.id })

      inserted += written.length
    }

    return inserted
  },

  // The «Купив у нас» check: an order placed from this phone that carried
  // this product. Any status counts — a refused parcel is still a purchase
  // the buyer can talk about.
  async hasOrderFor(phoneDigits: string, productSlug: string): Promise<boolean> {
    const [row] = await db
      .select({ id: orders.id })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(
          inArray(orders.recipientPhone, [...orderPhoneVariantsOf(phoneDigits)]),
          eq(orderItems.productSlug, productSlug),
        ),
      )
      .limit(1)

    return row !== undefined
  },
}

function searchCondition(search: string | null): SQL | undefined {
  if (!search) return undefined

  const pattern = `%${search}%`
  return or(
    ilike(products.title, pattern),
    ilike(productReviews.authorName, pattern),
    ilike(productReviews.body, pattern),
  )
}
