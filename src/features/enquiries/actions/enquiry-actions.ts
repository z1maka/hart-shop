'use server'

import { ContactMessageSchema, CustomOrderSchema } from '@/features/enquiries/schema/enquiry-schema'
import { enquiryService } from '@/features/enquiries/services/enquiry-service'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'
import { createFixedWindowLimiter } from '@/lib/rate-limit'
import { clientAddress } from '@/lib/request-context'
import { logger } from '@/lib/logger'

const MINUTE_MS = 60_000
const isFormThrottled = createFixedWindowLimiter({ windowMs: MINUTE_MS, maxPerWindow: 3 })

// The bot gets a success it cannot distinguish from the real thing; telling it
// the trap fired would only teach it which field to skip.
type SpamVerdict =
  { readonly isSpam: true } | { readonly isSpam: false; readonly throttled: boolean }

async function checkSpamGate(honeypot: string | undefined, form: string): Promise<SpamVerdict> {
  if (honeypot) {
    logger.warn('Honeypot tripped on a public form', { form })
    return { isSpam: true }
  }

  return { isSpam: false, throttled: isFormThrottled(`${form}:${await clientAddress()}`) }
}

export async function submitContactMessageAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = ContactMessageSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('VALIDATION_FAILED', 'Pick a topic and leave an email and a message.')
  }

  const gate = await checkSpamGate(parsed.data.website, 'contact')
  if (gate.isSpam) return actionOk(null)
  if (gate.throttled)
    return actionError('RATE_LIMITED', 'Too many messages. Try again in a minute.')

  try {
    await enquiryService.submitContactMessage(parsed.data)
    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}

export async function submitCustomOrderAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = CustomOrderSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('VALIDATION_FAILED', 'Leave a phone number and say what to sew.')
  }

  const gate = await checkSpamGate(parsed.data.website, 'custom-order')
  if (gate.isSpam) return actionOk(null)
  if (gate.throttled)
    return actionError('RATE_LIMITED', 'Too many requests. Try again in a minute.')

  try {
    await enquiryService.submitCustomOrder(parsed.data)
    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}
