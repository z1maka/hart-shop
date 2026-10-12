'use server'

import { SubmitReviewSchema } from '@/features/reviews/schema/review-schema'
import { reviewService } from '@/features/reviews/services/review-service'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'
import { createFixedWindowLimiter } from '@/lib/rate-limit'
import { clientAddress } from '@/lib/request-context'
import { logger } from '@/lib/logger'

const MINUTE_MS = 60_000
const isReviewThrottled = createFixedWindowLimiter({ windowMs: MINUTE_MS, maxPerWindow: 3 })

export async function submitReviewAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = SubmitReviewSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('VALIDATION_FAILED', 'Pick a rating, write a few sentences and sign them.')
  }

  // The bot gets a success it cannot distinguish from the real thing; telling
  // it the trap fired would only teach it which field to skip.
  if (parsed.data.website) {
    logger.warn('Honeypot tripped on a public form', { form: 'review' })
    return actionOk(null)
  }
  if (isReviewThrottled(`review:${await clientAddress()}`)) {
    return actionError('RATE_LIMITED', 'Too many reviews. Try again in a minute.')
  }

  try {
    // Nothing public changes yet: the review waits for moderation, and the
    // admin's queue reads live counts. Publishing is what refreshes caches.
    await reviewService.submit(parsed.data)
    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}
