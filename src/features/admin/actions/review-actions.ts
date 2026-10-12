'use server'

import { updateTag } from 'next/cache'
import { readAdminSession } from '@/features/admin/session-cookie'
import { REVIEWS_TAG, ReviewReplySchema, ReviewStatusSchema, reviewService } from '@/features/reviews'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'

// A published review changes the product page and the card ratings in the
// catalogue, so both caches go.
function refreshReviews(): void {
  updateTag(REVIEWS_TAG)
  updateTag('catalog')
}

export async function moderateReviewAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = ReviewStatusSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Unknown review or status.')

  try {
    await reviewService.moderate(parsed.data.reviewId, parsed.data.status)
    refreshReviews()
    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

export async function replyToReviewAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = ReviewReplySchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Write a reply first.')

  try {
    await reviewService.reply(parsed.data.reviewId, parsed.data.body)
    refreshReviews()
    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}
