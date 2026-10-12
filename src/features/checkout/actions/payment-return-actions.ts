'use server'

import { z } from 'zod'
import { readReturnToken, type ReturnOutcome } from '@/features/checkout/model/payment-return'
import { paymentReturnService } from '@/features/checkout/services/payment-return'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'
import { createFixedWindowLimiter } from '@/lib/rate-limit'
import { clientAddress } from '@/lib/request-context'

const MINUTE_MS = 60_000
// A waiting page polls every few seconds for a minute; a household behind one
// address may wait on a couple of payments at once, a script hammering the
// acquirer through us may not.
const isPollThrottled = createFixedWindowLimiter({ windowMs: MINUTE_MS, maxPerWindow: 60 })

const PollSchema = z.object({ token: z.string().max(200) })

export async function checkPaymentAction(input: unknown): Promise<ActionResult<ReturnOutcome>> {
  const parsed = PollSchema.safeParse(input)
  const token = parsed.success ? readReturnToken(parsed.data.token) : null
  if (!token) return actionError('VALIDATION_FAILED', 'Unknown order.')

  if (isPollThrottled(await clientAddress())) {
    return actionError('RATE_LIMITED', 'Too many checks. Try again in a minute.')
  }

  try {
    return actionOk(await paymentReturnService.check(token))
  } catch (error) {
    return toActionError(error)
  }
}
