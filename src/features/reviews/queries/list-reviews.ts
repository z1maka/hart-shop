import { ReviewSource, type ReviewStatus } from '@/db/enums'
import { looksLikeLocation } from '@/features/reviews/model/review-checks'
import { maskPhoneDigits } from '@/features/reviews/model/review-phone'
import {
  reviewRepository,
  type AdminReviewRow,
} from '@/features/reviews/repository/review-repository'
import { formatDateTime } from '@/lib/datetime'

// How the buyer is vouched for, in the admin's words.
export const PurchaseProof = {
  OrderMatched: 'order_matched',
  OrderNotFound: 'order_not_found',
  NoPhone: 'no_phone',
  Marketplace: 'marketplace',
} as const

export type PurchaseProof = (typeof PurchaseProof)[keyof typeof PurchaseProof]

export type AdminReviewView = {
  readonly id: string
  readonly productSlug: string
  readonly productTitle: string
  readonly authorName: string
  readonly rating: number
  readonly body: string
  readonly tags: readonly string[]
  readonly status: ReviewStatus
  readonly proof: PurchaseProof
  readonly phoneMasked: string | null
  readonly receivedAt: string
  readonly warning: string | null
  readonly reply: string | null
}

export type AdminReviewPage = {
  readonly rows: readonly AdminReviewView[]
  readonly page: number
  readonly pageCount: number
  readonly total: number
  readonly counts: Record<ReviewStatus, number>
}

const LOCATION_WARNING = 'Похоже на геолокацию — лучше отклонить или попросить переписать'

export async function listReviewsForAdmin(input: {
  readonly status: ReviewStatus
  readonly search: string | null
  readonly page: number
  readonly perPage: number
}): Promise<AdminReviewPage> {
  const [total, counts] = await Promise.all([
    reviewRepository.countMatching(input.status, input.search),
    reviewRepository.countByStatus(),
  ])
  const pageCount = Math.max(1, Math.ceil(total / input.perPage))
  const page = Math.min(Math.max(1, input.page), pageCount)
  const rows = await reviewRepository.findPage({
    status: input.status,
    search: input.search,
    limit: input.perPage,
    offset: (page - 1) * input.perPage,
  })

  return { rows: rows.map(toAdminView), page, pageCount, total, counts }
}

function toAdminView({ review, product }: AdminReviewRow): AdminReviewView {
  return {
    id: review.id,
    productSlug: product.slug,
    productTitle: product.title,
    authorName: review.authorName,
    rating: review.rating,
    body: review.body,
    tags: review.tags,
    status: review.status,
    proof: proofOf(review),
    phoneMasked: review.phoneDigits ? maskPhoneDigits(review.phoneDigits) : null,
    receivedAt: formatDateTime(review.createdAt),
    warning: looksLikeLocation(review.body) ? LOCATION_WARNING : null,
    reply: review.replyBody,
  }
}

function proofOf(review: AdminReviewRow['review']): PurchaseProof {
  if (review.source === ReviewSource.Prom) return PurchaseProof.Marketplace
  if (review.isVerifiedPurchase) return PurchaseProof.OrderMatched
  return review.phoneDigits ? PurchaseProof.OrderNotFound : PurchaseProof.NoPhone
}
