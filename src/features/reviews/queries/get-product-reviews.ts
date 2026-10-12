import { cacheLife, cacheTag } from 'next/cache'
import { OWN_REVIEWS_SINCE } from '@/config/reviews'
import { hasReviewText, isCollectedHere } from '@/features/reviews/model/review-checks'
import { summarizeRatings, type ReviewSummary } from '@/features/reviews/model/review-summary'
import {
  reviewRepository,
  type ProductRating,
  type ReviewRow,
} from '@/features/reviews/repository/review-repository'
import { formatDateIsoKyiv, formatDateUk } from '@/lib/datetime'
import { logger } from '@/lib/logger'

export const REVIEWS_TAG = 'reviews'

export type ReviewView = {
  readonly id: string
  readonly authorName: string
  readonly rating: number
  readonly body: string
  readonly tags: readonly string[]
  readonly color: string | null
  readonly isVerifiedPurchase: boolean
  readonly dateLabel: string
  readonly dateIso: string
  readonly reply: { readonly body: string; readonly dateLabel: string } | null
}

type ReviewSet = {
  readonly summary: ReviewSummary
  // Only the reviews with words; the rest live in the summary.
  readonly reviews: readonly ReviewView[]
}

export type ProductReviewsView = ReviewSet & {
  // What the structured data may carry: the reviews collected on this site.
  readonly collectedHere: ReviewSet
}

export async function getProductReviews(slug: string): Promise<ProductReviewsView> {
  'use cache'
  cacheTag(REVIEWS_TAG)
  cacheTag(`${REVIEWS_TAG}:${slug}`)
  cacheLife('days')

  const rows = await reviewRepository.findPublishedBySlug(slug)

  return {
    ...reviewSetOf(rows),
    collectedHere: reviewSetOf(rows.filter((row) => isCollectedHere(row, OWN_REVIEWS_SINCE))),
  }
}

function reviewSetOf(rows: readonly ReviewRow[]): ReviewSet {
  return {
    summary: summarizeRatings(rows.map((row) => row.rating)),
    reviews: rows.filter((row) => hasReviewText(row.body)).map(toReviewView),
  }
}

const EMPTY_SET: ReviewSet = { summary: summarizeRatings([]), reviews: [] }
const EMPTY_REVIEWS: ProductReviewsView = { ...EMPTY_SET, collectedHere: EMPTY_SET }

// What the product page calls. Reviews decorate the page; a failure of their
// query is logged and leaves the page standing without them, rather than
// taking the product down with it.
export async function getProductReviewsOrNone(slug: string): Promise<ProductReviewsView> {
  try {
    return await getProductReviews(slug)
  } catch (error) {
    logger.error('Reviews could not be loaded for the product page', { slug, error })
    return EMPTY_REVIEWS
  }
}

// For the catalogue cards, called from inside their own cached queries: the
// ratings change with moderation, which refreshes the catalogue too. As on
// the product page, a failure costs the cards their stars, not the catalogue.
export async function getProductRatings(
  productIds: readonly string[],
): Promise<ReadonlyMap<string, ProductRating>> {
  try {
    const ratings = await reviewRepository.ratingsForProducts(productIds)
    return new Map(ratings.map((rating) => [rating.productId, rating]))
  } catch (error) {
    logger.error('Ratings could not be loaded for the catalogue', { error })
    return new Map()
  }
}

function toReviewView(row: ReviewRow): ReviewView {
  return {
    id: row.id,
    authorName: row.authorName,
    rating: row.rating,
    body: row.body,
    tags: row.tags,
    color: row.color,
    isVerifiedPurchase: row.isVerifiedPurchase,
    dateLabel: formatDateUk(row.createdAt),
    dateIso: formatDateIsoKyiv(row.createdAt),
    reply:
      row.replyBody && row.repliedAt
        ? { body: row.replyBody, dateLabel: formatDateUk(row.repliedAt) }
        : null,
  }
}
