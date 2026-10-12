import { cookies } from 'next/headers'
import { after } from 'next/server'
import { CONSENT_POLICY } from '@/config/consent'
import { CONSENT_COOKIE, parseConsent, shouldLoadTags } from '@/features/analytics/model/consent'
import {
  fbcOf,
  isOwnPage,
  MetaRelayEventName,
  toMetaServerEvent,
  type MetaSale,
} from '@/features/analytics/model/meta-capi'
import { metaRelaySchema } from '@/features/analytics/schema/meta-relay-schema'
import { getOrderByToken } from '@/features/orders'
import { env } from '@/lib/env'
import { isConversionsApiConfigured, sendToConversionsApi } from '@/lib/meta-capi'
import { createFixedWindowLimiter } from '@/lib/rate-limit'
import { clientAddress, requestOrigin } from '@/lib/request-context'

// A shopper browsing fast sends a handful of events a minute; this only stops
// a script replaying the endpoint.
const isThrottled = createFixedWindowLimiter({ windowMs: 60_000, maxPerWindow: 60 })

// The server half of the Meta pixel: the browser posts each event here with
// the id the pixel used, and the copy goes to the Conversions API after the
// response, so the page never waits on Meta.
export async function POST(request: Request): Promise<Response> {
  if (!isConversionsApiConfigured()) return new Response(null, { status: 204 })

  const address = await clientAddress()
  if (isThrottled(address)) return new Response(null, { status: 429 })

  const parsed = metaRelaySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return new Response('bad request', { status: 400 })
  const relay = parsed.data

  if (!isOwnPage(relay.eventSourceUrl, [await requestOrigin(), env.NEXT_PUBLIC_SITE_URL])) {
    return new Response('bad request', { status: 400 })
  }

  // The browser only calls while its tags may run; the cookie is checked
  // again here so a refusal holds even for a stale page.
  const store = await cookies()
  if (!shouldLoadTags(parseConsent(store.get(CONSENT_COOKIE)?.value), CONSENT_POLICY)) {
    return new Response(null, { status: 204 })
  }

  const nowMs = Date.now()
  const visitor = {
    ipAddress: address === 'unknown' ? undefined : address,
    userAgent: request.headers.get('user-agent') ?? undefined,
    fbp: store.get('_fbp')?.value,
    fbc: fbcOf(store.get('_fbc')?.value, relay.eventSourceUrl, nowMs),
  }

  after(async () => {
    let sale: MetaSale | null = null
    if (relay.eventName === MetaRelayEventName.Purchase) {
      const order = await getOrderByToken(relay.orderToken)
      if (!order) return
      sale = { skus: order.analyticsItems.map((item) => item.sku), valueCents: order.totalCents }
    }

    await sendToConversionsApi(toMetaServerEvent(relay, visitor, sale, nowMs))
  })

  return new Response(null, { status: 202 })
}
