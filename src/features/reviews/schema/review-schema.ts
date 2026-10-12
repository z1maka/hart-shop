import { z } from 'zod'
import { ReviewStatus } from '@/db/enums'
import { MAX_BODY_LENGTH, MIN_BODY_LENGTH } from '@/features/reviews/model/review-body'
import { MAX_RATING, MIN_RATING } from '@/features/reviews/model/review-summary'

// The name is what the page shows beside the stars.
const MIN_NAME_LENGTH = 2
const MAX_NAME_LENGTH = 60
const MAX_PHONE_LENGTH = 32
const MAX_REPLY_LENGTH = 1000

export const SubmitReviewSchema = z.object({
  productSlug: z.string().trim().min(1).max(200),
  rating: z.coerce.number().int().min(MIN_RATING).max(MAX_RATING),
  body: z.string().trim().min(MIN_BODY_LENGTH).max(MAX_BODY_LENGTH),
  authorName: z.string().trim().min(MIN_NAME_LENGTH).max(MAX_NAME_LENGTH),
  phone: z.string().trim().max(MAX_PHONE_LENGTH).optional(),
  // The honeypot: a real visitor never sees this field, so a value means a bot.
  website: z.string().max(200).optional(),
})

export type SubmitReviewInput = z.infer<typeof SubmitReviewSchema>

export const ReviewStatusSchema = z.object({
  reviewId: z.uuid(),
  status: z.enum(Object.values(ReviewStatus) as [ReviewStatus, ...ReviewStatus[]]),
})

export const ReviewReplySchema = z.object({
  reviewId: z.uuid(),
  body: z.string().trim().min(MIN_NAME_LENGTH).max(MAX_REPLY_LENGTH),
})

