import { z } from 'zod'
import { MetaRelayEventName, type MetaRelay } from '@/features/analytics/model/meta-capi'

const MAX_CONTENT_IDS = 50
const MAX_VALUE_CENTS = 100_000_000

const eventId = z
  .string()
  .regex(/^[\w:.-]+$/)
  .max(80)
const eventSourceUrl = z.url().max(2_000)

// What the browser posts to /api/meta/events. A purchase names its order and
// nothing else: the value and the items are read from the order on the
// server, so a forged request cannot report a sale that did not happen.
export const metaRelaySchema = z.discriminatedUnion('eventName', [
  z.object({
    eventName: z.enum([
      MetaRelayEventName.ViewContent,
      MetaRelayEventName.AddToCart,
      MetaRelayEventName.InitiateCheckout,
    ]),
    eventId,
    eventSourceUrl,
    contentIds: z.array(z.string().trim().min(1).max(100)).min(1).max(MAX_CONTENT_IDS),
    valueCents: z.number().int().min(0).max(MAX_VALUE_CENTS),
  }),
  z.object({ eventName: z.literal(MetaRelayEventName.Lead), eventId, eventSourceUrl }),
  z.object({
    eventName: z.literal(MetaRelayEventName.Purchase),
    eventId,
    eventSourceUrl,
    orderToken: z.string().trim().min(1).max(200),
  }),
]) satisfies z.ZodType<MetaRelay>
