import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

// Marketing API versions live about two years; v26.0 came out 29.07.2026.
const GRAPH_API = 'https://graph.facebook.com/v26.0'
const SEND_TIMEOUT_MS = 5_000

// One server event as the Conversions API takes it; built by the analytics
// feature, which knows what each event means.
export type ConversionsApiEvent = { readonly event_name: string } & Record<string, unknown>

export function isConversionsApiConfigured(): boolean {
  return Boolean(env.NEXT_PUBLIC_META_PIXEL_ID && env.META_CAPI_ACCESS_TOKEN)
}

// Hands one event to the Conversions API. Failures are logged, never thrown:
// the browser's pixel copy still counts, and a shopper's request must not wait
// on Meta. The token travels in the body so it never lands in a URL log.
export async function sendToConversionsApi(event: ConversionsApiEvent): Promise<void> {
  if (!isConversionsApiConfigured()) return

  try {
    const response = await fetch(`${GRAPH_API}/${env.NEXT_PUBLIC_META_PIXEL_ID}/events`, {
      method: 'POST',
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [event],
        access_token: env.META_CAPI_ACCESS_TOKEN,
        // Routes events to Events Manager → Test events while set; leave it
        // empty in normal operation.
        ...(env.META_CAPI_TEST_EVENT_CODE
          ? { test_event_code: env.META_CAPI_TEST_EVENT_CODE }
          : {}),
      }),
    })

    if (!response.ok) {
      logger.warn('Meta Conversions API refused an event', {
        eventName: event.event_name,
        status: response.status,
        detail: (await response.text()).slice(0, 500),
      })
    }
  } catch (error) {
    logger.warn('Meta Conversions API is unreachable', { eventName: event.event_name, error })
  }
}
