'use client'

import {
  CURRENCY,
  toGa4Items,
  toGoogleUserData,
  toMajorUnits,
  toTikTokContents,
  totalOf,
  type AnalyticsEvent,
} from '@/features/analytics/model/events'
import {
  metaContentTypeOf,
  MetaRelayEventName,
  purchaseEventId,
  toMetaRelay,
  type MetaRelay,
} from '@/features/analytics/model/meta-capi'

type Gtag = (command: string, eventName: string, params: Record<string, unknown>) => void
type Fbq = (
  command: string,
  eventName: string,
  params?: Record<string, unknown>,
  options?: { readonly eventID: string },
) => void
type Ttq = { track: (eventName: string, params?: Record<string, unknown>) => void }

type TrackingWindow = Window & {
  gtag?: Gtag
  fbq?: Fbq
  ttq?: Ttq
  // Written by the same inline script that defines gtag (AnalyticsScripts), so
  // whenever gtag is callable the conversion target is already known.
  __googleAdsConversionSendTo?: string
}

const PROVIDER_RETRY_INTERVAL_MS = 500
const PROVIDER_RETRY_LIMIT = 20
// trailingSlash is on: the bare path would answer with a redirect first.
const META_RELAY_PATH = '/api/meta/events/'

// One entry point for the whole app: adding a provider happens here, never in a
// component. See AGENTS.md §9.
export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window === 'undefined') return

  deliver(window as TrackingWindow, event, 0)
}

type Delivered = { google: boolean; meta: boolean; tiktok: boolean }

// On a hard navigation React fires the page's events before the consent-gated
// tracker scripts have executed — an ad click landing on a product page is
// exactly this case. Each provider gets the event the moment its script is
// ready: the small TikTok/Meta loaders beat gtag.js by seconds, and waiting
// for "any" provider once lost the purchase for Google. With consent denied
// no script ever appears and the retries expire silently.
function deliver(
  scope: TrackingWindow,
  event: AnalyticsEvent,
  attempt: number,
  delivered: Delivered = { google: false, meta: false, tiktok: false },
): void {
  if (!delivered.google && scope.gtag) {
    sendToGoogle(scope, event)
    delivered.google = true
  }
  if (!delivered.meta && scope.fbq) {
    sendToMeta(scope.fbq, event)
    delivered.meta = true
  }
  if (!delivered.tiktok && scope.ttq) {
    sendToTikTok(scope.ttq, event)
    delivered.tiktok = true
  }

  const isComplete = delivered.google && delivered.meta && delivered.tiktok
  if (!isComplete && attempt < PROVIDER_RETRY_LIMIT) {
    setTimeout(() => deliver(scope, event, attempt + 1, delivered), PROVIDER_RETRY_INTERVAL_MS)
  }
}

function sendToGoogle(scope: TrackingWindow, event: AnalyticsEvent): void {
  const gtag = scope.gtag
  if (!gtag) return

  if (event.name === 'generate_lead') {
    gtag('event', 'generate_lead', { lead_type: event.leadType })
    return
  }

  if (event.name === 'compare_toggle') {
    gtag('event', 'compare_toggle', {
      product_slug: event.productSlug,
      compare_action: event.isAdded ? 'add' : 'remove',
    })
    return
  }

  if (event.name === 'view_item_list') {
    gtag('event', 'view_item_list', {
      item_list_name: event.listName,
      items: toGa4Items(event.items),
    })
    return
  }

  if (event.name === 'view_item' || event.name === 'add_to_cart') {
    gtag('event', event.name, {
      currency: CURRENCY,
      value: toMajorUnits(totalOf([event.item])),
      items: toGa4Items([event.item]),
    })
    return
  }

  if (event.name === 'begin_checkout') {
    gtag('event', 'begin_checkout', {
      currency: CURRENCY,
      value: toMajorUnits(event.valueCents),
      items: toGa4Items(event.items),
    })
    return
  }

  if (event.name === 'add_shipping_info') {
    gtag('event', 'add_shipping_info', {
      currency: CURRENCY,
      value: toMajorUnits(event.valueCents),
      shipping_tier: event.shippingTier,
      items: toGa4Items(event.items),
    })
    return
  }

  // Enhanced conversions: the Ads goals expect the buyer's email and phone
  // beside the sale (both goals had it switched on in the account, 26.09.2026).
  // Set before the events so the conversion below carries them.
  const userData = event.customer ? toGoogleUserData(event.customer) : null
  if (userData) gtag('set', 'user_data', userData)

  gtag('event', 'purchase', {
    transaction_id: event.orderNumber,
    currency: CURRENCY,
    value: toMajorUnits(event.valueCents),
    shipping: toMajorUnits(event.shippingCents),
    tax: toMajorUnits(event.taxCents),
    items: toGa4Items(event.items),
  })

  // Google Ads counts a sale only when it is addressed explicitly; the GA4
  // purchase above never reaches the Ads conversion on its own. The value is
  // the order total, as the WordPress site reported it (seen in the Ads
  // account on 25.09.2026: the action takes each sale's own value).
  if (scope.__googleAdsConversionSendTo) {
    gtag('event', 'conversion', {
      send_to: scope.__googleAdsConversionSendTo,
      transaction_id: event.orderNumber,
      currency: CURRENCY,
      value: toMajorUnits(event.valueCents),
    })
  }
}

// Each pixel event is also posted to our server, which repeats it through the
// Conversions API. Both copies carry one id, so Meta counts the event once.
function sendToMeta(fbq: Fbq | undefined, event: AnalyticsEvent): void {
  if (!fbq) return

  const pixelEvent = toPixelEvent(event)
  if (!pixelEvent) return

  const eventID = event.name === 'purchase' ? purchaseEventId(event.orderNumber) : randomEventId()
  // The options argument is read only in fourth place, so a Lead without
  // parameters still passes an empty object before it.
  fbq('track', pixelEvent.name, pixelEvent.params ?? {}, { eventID })
  relayToServer(toMetaRelay(event, eventID, window.location.href))
}

function toPixelEvent(
  event: AnalyticsEvent,
): { readonly name: string; readonly params?: Record<string, unknown> } | null {
  if (event.name === 'generate_lead') return { name: MetaRelayEventName.Lead }

  if (event.name === 'view_item') {
    return {
      name: MetaRelayEventName.ViewContent,
      params: {
        content_ids: [event.item.sku],
        content_type: metaContentTypeOf(MetaRelayEventName.ViewContent),
        currency: CURRENCY,
        value: toMajorUnits(event.item.priceCents),
      },
    }
  }

  if (event.name === 'add_to_cart') {
    return {
      name: MetaRelayEventName.AddToCart,
      params: {
        content_ids: [event.item.sku],
        content_type: metaContentTypeOf(MetaRelayEventName.AddToCart),
        currency: CURRENCY,
        value: toMajorUnits(totalOf([event.item])),
      },
    }
  }

  if (event.name === 'begin_checkout') {
    return {
      name: MetaRelayEventName.InitiateCheckout,
      params: {
        content_ids: event.items.map((item) => item.sku),
        content_type: metaContentTypeOf(MetaRelayEventName.InitiateCheckout),
        currency: CURRENCY,
        value: toMajorUnits(event.valueCents),
      },
    }
  }

  if (event.name === 'purchase') {
    return {
      name: MetaRelayEventName.Purchase,
      params: {
        content_ids: event.items.map((item) => item.sku),
        content_type: metaContentTypeOf(MetaRelayEventName.Purchase),
        currency: CURRENCY,
        value: toMajorUnits(event.valueCents),
      },
    }
  }

  return null
}

function randomEventId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// A beacon outlives the navigation that often follows the event (add to cart,
// checkout); fetch with keepalive covers browsers that refuse the beacon.
function relayToServer(relay: MetaRelay | null): void {
  if (!relay) return

  const body = JSON.stringify(relay)
  const isQueued = navigator.sendBeacon?.(
    META_RELAY_PATH,
    new Blob([body], { type: 'application/json' }),
  )
  if (isQueued) return

  fetch(META_RELAY_PATH, {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => {
    // The pixel's own copy still stands.
  })
}

function sendToTikTok(ttq: Ttq | undefined, event: AnalyticsEvent): void {
  if (!ttq) return

  if (event.name === 'generate_lead') {
    ttq.track('SubmitForm')
    return
  }

  if (event.name === 'view_item') {
    ttq.track('ViewContent', {
      contents: toTikTokContents([event.item]),
      currency: CURRENCY,
      value: toMajorUnits(event.item.priceCents),
    })
    return
  }

  if (event.name === 'add_to_cart') {
    ttq.track('AddToCart', {
      contents: toTikTokContents([event.item]),
      currency: CURRENCY,
      value: toMajorUnits(totalOf([event.item])),
    })
    return
  }

  if (event.name === 'begin_checkout') {
    ttq.track('InitiateCheckout', {
      contents: toTikTokContents(event.items),
      currency: CURRENCY,
      value: toMajorUnits(event.valueCents),
    })
    return
  }

  if (event.name === 'purchase') {
    // A COD order is confirmed, not paid, at this point — TikTok's event for
    // that is PlaceAnOrder, not CompletePayment.
    ttq.track('PlaceAnOrder', {
      contents: toTikTokContents(event.items),
      currency: CURRENCY,
      value: toMajorUnits(event.valueCents),
    })
  }
}
