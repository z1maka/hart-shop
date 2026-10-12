import { CURRENCY, toMajorUnits, type AnalyticsEvent } from '@/features/analytics/model/events'

// The Conversions API repeats each pixel event from the server, so a sale is
// still counted when an ad blocker or Safari's tracking prevention stops the
// browser's copy. Both copies carry one event_id and Meta keeps only one.

export const MetaRelayEventName = {
  ViewContent: 'ViewContent',
  AddToCart: 'AddToCart',
  InitiateCheckout: 'InitiateCheckout',
  Lead: 'Lead',
  Purchase: 'Purchase',
} as const

export type MetaRelayEventName = (typeof MetaRelayEventName)[keyof typeof MetaRelayEventName]

export type MetaContentType = 'product' | 'product_group'

// How Meta finds the catalogue item an event names. A product page and its
// add-to-cart report the product's sku — the item_group_id of its variants
// in the catalogue feed — while the cart and the order report variant skus,
// which are the items' own ids.
export function metaContentTypeOf(eventName: MetaRelayEventName): MetaContentType {
  return eventName === MetaRelayEventName.ViewContent || eventName === MetaRelayEventName.AddToCart
    ? 'product_group'
    : 'product'
}

const ORDER_PAGE_PATH = '/order/'

// What the browser posts to /api/meta/events; schema/meta-relay-schema.ts
// checks it on arrival. Written out here rather than inferred from that
// schema so the browser's tracking code imports no Zod.
type MetaRelayBase = {
  readonly eventId: string
  readonly eventSourceUrl: string
}

export type MetaRelay =
  | (MetaRelayBase & {
      readonly eventName:
        | typeof MetaRelayEventName.ViewContent
        | typeof MetaRelayEventName.AddToCart
        | typeof MetaRelayEventName.InitiateCheckout
      readonly contentIds: readonly string[]
      readonly valueCents: number
    })
  | (MetaRelayBase & { readonly eventName: typeof MetaRelayEventName.Lead })
  | (MetaRelayBase & {
      readonly eventName: typeof MetaRelayEventName.Purchase
      readonly orderToken: string
    })

// A purchase keeps the same id however often it is reported: the order page
// can be opened again in another browser, and Meta then drops the repeat.
export function purchaseEventId(orderNumber: string): string {
  return `order-${orderNumber}`
}

// The relay copy of an event the pixel tracks; null for events Meta does not
// receive. A purchase without its order token cannot be checked, so it stays
// browser-only.
export function toMetaRelay(event: AnalyticsEvent, id: string, pageUrl: string): MetaRelay | null {
  const base = { eventId: id, eventSourceUrl: pageUrl }

  if (event.name === 'generate_lead') return { ...base, eventName: MetaRelayEventName.Lead }

  if (event.name === 'view_item') {
    return {
      ...base,
      eventName: MetaRelayEventName.ViewContent,
      contentIds: [event.item.sku],
      valueCents: event.item.priceCents,
    }
  }

  if (event.name === 'add_to_cart') {
    return {
      ...base,
      eventName: MetaRelayEventName.AddToCart,
      contentIds: [event.item.sku],
      valueCents: event.item.priceCents * event.item.quantity,
    }
  }

  if (event.name === 'begin_checkout') {
    return {
      ...base,
      eventName: MetaRelayEventName.InitiateCheckout,
      contentIds: event.items.map((item) => item.sku),
      valueCents: event.valueCents,
    }
  }

  if (event.name === 'purchase' && event.orderToken) {
    return {
      ...base,
      eventName: MetaRelayEventName.Purchase,
      eventSourceUrl: withoutOrderToken(pageUrl),
      orderToken: event.orderToken,
    }
  }

  return null
}

// The order page's address is its access token: whoever holds it reads the
// buyer's name, phone and address. Meta gets the page without it.
function withoutOrderToken(pageUrl: string): string {
  try {
    return new URL(ORDER_PAGE_PATH, pageUrl).href
  } catch {
    return pageUrl
  }
}

// Only the site's own pages are reported: anything else in event_source_url
// would let a stranger attribute events to pages we do not serve.
export function isOwnPage(url: string, origins: readonly string[]): boolean {
  try {
    const { origin } = new URL(url)
    return origins.some((allowed) => new URL(allowed).origin === origin)
  } catch {
    return false
  }
}

// The click id Meta matches an ad click on. The pixel writes it to the _fbc
// cookie; when the pixel never ran (blocked), the fbclid still sits in the
// landing URL and is rebuilt in the documented fb.1.<ms>.<fbclid> form.
export function fbcOf(
  cookie: string | undefined,
  pageUrl: string,
  nowMs: number,
): string | undefined {
  if (cookie) return cookie

  try {
    const fbclid = new URL(pageUrl).searchParams.get('fbclid')
    return fbclid ? `fb.1.${nowMs}.${fbclid}` : undefined
  } catch {
    return undefined
  }
}

export type MetaVisitor = {
  readonly ipAddress: string | undefined
  readonly userAgent: string | undefined
  readonly fbp: string | undefined
  readonly fbc: string | undefined
}

export type MetaSale = {
  readonly skus: readonly string[]
  readonly valueCents: number
}

export type MetaServerEvent = {
  readonly event_name: MetaRelayEventName
  readonly event_time: number
  readonly event_id: string
  readonly event_source_url: string
  readonly action_source: 'website'
  readonly user_data: {
    readonly client_ip_address?: string
    readonly client_user_agent?: string
    readonly fbp?: string
    readonly fbc?: string
  }
  readonly custom_data?: {
    readonly content_ids: readonly string[]
    readonly content_type: MetaContentType
    readonly currency: string
    readonly value: number
  }
}

// One event in the shape the Conversions API takes. A purchase is described
// by the order (sale), never by what the browser claimed.
export function toMetaServerEvent(
  relay: MetaRelay,
  visitor: MetaVisitor,
  sale: MetaSale | null,
  nowMs: number,
): MetaServerEvent {
  const userData = {
    ...(visitor.ipAddress ? { client_ip_address: visitor.ipAddress } : {}),
    ...(visitor.userAgent ? { client_user_agent: visitor.userAgent } : {}),
    ...(visitor.fbp ? { fbp: visitor.fbp } : {}),
    ...(visitor.fbc ? { fbc: visitor.fbc } : {}),
  }

  const product = productOf(relay, sale)

  return {
    event_name: relay.eventName,
    event_time: Math.floor(nowMs / 1000),
    event_id: relay.eventId,
    event_source_url: relay.eventSourceUrl,
    action_source: 'website',
    user_data: userData,
    ...(product
      ? {
          custom_data: {
            content_ids: product.skus,
            content_type: metaContentTypeOf(relay.eventName),
            currency: CURRENCY,
            value: toMajorUnits(product.valueCents),
          },
        }
      : {}),
  }
}

function productOf(relay: MetaRelay, sale: MetaSale | null): MetaSale | null {
  if (relay.eventName === MetaRelayEventName.Purchase) return sale
  if (relay.eventName === MetaRelayEventName.Lead) return null
  return { skus: relay.contentIds, valueCents: relay.valueCents }
}
