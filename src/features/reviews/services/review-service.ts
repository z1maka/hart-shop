import { ReviewSource, type ReviewStatus } from '@/db/enums'
import { reviewPhoneDigitsOf } from '@/features/reviews/model/review-phone'
import {
  reviewRepository,
  type ImportedReviewInput,
} from '@/features/reviews/repository/review-repository'
import type { SubmitReviewInput } from '@/features/reviews/schema/review-schema'
import { ProductNotFoundError, ReviewNotFoundError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export type ImportReviewInput = Omit<ImportedReviewInput, 'source'>

export const reviewService = {
  // Every site review waits for the shop: nothing goes public unread. The
  // phone stays hidden and serves one purpose — the «Купив у нас» mark when
  // an order from that number carried this product.
  async submit(input: SubmitReviewInput): Promise<void> {
    const product = await reviewRepository.findProductBySlug(input.productSlug)
    if (!product) throw new ProductNotFoundError(input.productSlug)

    const phoneDigits = reviewPhoneDigitsOf(input.phone)
    const isVerifiedPurchase = phoneDigits
      ? await reviewRepository.hasOrderFor(phoneDigits, product.slug)
      : false

    await reviewRepository.create({
      productId: product.id,
      authorName: input.authorName,
      rating: input.rating,
      body: input.body,
      color: null,
      phoneDigits,
      isVerifiedPurchase,
    })

    logger.info('Review received', { productSlug: product.slug, isVerifiedPurchase })
  },

  async moderate(reviewId: string, status: ReviewStatus): Promise<void> {
    const wasUpdated = await reviewRepository.setStatus(reviewId, status)
    if (!wasUpdated) throw new ReviewNotFoundError(reviewId)

    logger.info('Review moderated', { reviewId, status })
  },

  async reply(reviewId: string, body: string): Promise<void> {
    const wasUpdated = await reviewRepository.setReply(reviewId, body)
    if (!wasUpdated) throw new ReviewNotFoundError(reviewId)

    logger.info('Review answered', { reviewId })
  },

  // Reviews carried over from the shop's Prom.ua page arrive published: the
  // marketplace had already shown them under the shop's name.
  async importFromProm(rows: readonly ImportReviewInput[]): Promise<number> {
    return reviewRepository.insertImported(
      rows.map((row) => ({ ...row, source: ReviewSource.Prom })),
    )
  },
}
