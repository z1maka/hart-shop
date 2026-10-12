import { describe, expect, it } from 'vitest'
import type { AnalyticsItem } from '@/features/analytics/model/events'
import {
  fbcOf,
  isOwnPage,
  metaContentTypeOf,
  MetaRelayEventName,
  purchaseEventId,
  toMetaRelay,
  toMetaServerEvent,
  type MetaVisitor,
} from '@/features/analytics/model/meta-capi'
import { metaRelaySchema } from '@/features/analytics/schema/meta-relay-schema'

const PAGE = 'https://fox-armor.com.ua/product/poncho/'
const NOW_MS = 1_791_620_000_123

const poncho: AnalyticsItem = {
  sku: 'FOX-UA-39224',
  title: 'Пончо Multi 1',
  priceCents: 220_000,
  quantity: 2,
  categorySlug: null,
}

const visitor: MetaVisitor = {
  ipAddress: '93.170.10.1',
  userAgent: 'Mozilla/5.0',
  fbp: 'fb.1.1791000000000.123456789',
  fbc: undefined,
}

describe('toMetaRelay', () => {
  it('carries the SKU and the line value of an add to cart, as the pixel reports it', () => {
    expect(toMetaRelay({ name: 'add_to_cart', item: poncho }, 'id-1', PAGE)).toEqual({
      eventName: MetaRelayEventName.AddToCart,
      eventId: 'id-1',
      eventSourceUrl: PAGE,
      contentIds: ['FOX-UA-39224'],
      valueCents: 440_000,
    })
  })

  it('reports a purchase by its order token, without the token in the page address', () => {
    const relay = toMetaRelay(
      {
        name: 'purchase',
        orderNumber: 'FOX-2026-000123',
        items: [poncho],
        valueCents: 440_000,
        shippingCents: 0,
        taxCents: 0,
        orderToken: 'token-abc',
      },
      purchaseEventId('FOX-2026-000123'),
      'https://fox-armor.com.ua/order/token-abc/',
    )

    expect(relay).toEqual({
      eventName: MetaRelayEventName.Purchase,
      eventId: 'order-FOX-2026-000123',
      eventSourceUrl: 'https://fox-armor.com.ua/order/',
      orderToken: 'token-abc',
    })
  })

  it('keeps a purchase without its order token browser-only', () => {
    const relay = toMetaRelay(
      {
        name: 'purchase',
        orderNumber: 'FOX-2026-000123',
        items: [poncho],
        valueCents: 440_000,
        shippingCents: 0,
        taxCents: 0,
      },
      'id-1',
      PAGE,
    )

    expect(relay).toBeNull()
  })

  it('has nothing to relay for events Meta never receives', () => {
    expect(
      toMetaRelay({ name: 'compare_toggle', productSlug: 'poncho', isAdded: true }, 'id-1', PAGE),
    ).toBeNull()
  })

  it('produces what the relay endpoint accepts', () => {
    const relay = toMetaRelay({ name: 'view_item', item: poncho }, 'id-1', PAGE)
    expect(metaRelaySchema.safeParse(relay).success).toBe(true)
  })
})

describe('metaContentTypeOf', () => {
  it('matches product-page events to item groups and cart events to variants', () => {
    expect(metaContentTypeOf(MetaRelayEventName.ViewContent)).toBe('product_group')
    expect(metaContentTypeOf(MetaRelayEventName.AddToCart)).toBe('product_group')
    expect(metaContentTypeOf(MetaRelayEventName.InitiateCheckout)).toBe('product')
    expect(metaContentTypeOf(MetaRelayEventName.Purchase)).toBe('product')
  })
})

describe('metaRelaySchema', () => {
  it('refuses an event name outside the relayed set', () => {
    const parsed = metaRelaySchema.safeParse({
      eventName: 'CompleteRegistration',
      eventId: 'id-1',
      eventSourceUrl: PAGE,
    })
    expect(parsed.success).toBe(false)
  })

  it('refuses a purchase that brings its own value instead of an order token', () => {
    const parsed = metaRelaySchema.safeParse({
      eventName: MetaRelayEventName.Purchase,
      eventId: 'id-1',
      eventSourceUrl: PAGE,
      contentIds: ['FOX-UA-39224'],
      valueCents: 1,
    })
    expect(parsed.success).toBe(false)
  })
})

describe('isOwnPage', () => {
  it('accepts a page on one of the shop origins', () => {
    expect(isOwnPage(PAGE, ['https://fox-armor.com.ua'])).toBe(true)
  })

  it('refuses another site and a malformed address', () => {
    expect(isOwnPage('https://fox-armor.com.ua.evil.test/', ['https://fox-armor.com.ua'])).toBe(
      false,
    )
    expect(isOwnPage('not a url', ['https://fox-armor.com.ua'])).toBe(false)
  })
})

describe('fbcOf', () => {
  it('prefers the click id the pixel stored', () => {
    expect(fbcOf('fb.1.1.stored', `${PAGE}?fbclid=fresh`, NOW_MS)).toBe('fb.1.1.stored')
  })

  it('rebuilds the click id from the landing URL when the pixel never ran', () => {
    expect(fbcOf(undefined, `${PAGE}?fbclid=IwAR0abc`, NOW_MS)).toBe(`fb.1.${NOW_MS}.IwAR0abc`)
  })

  it('is absent without an ad click', () => {
    expect(fbcOf(undefined, PAGE, NOW_MS)).toBeUndefined()
  })
})

describe('toMetaServerEvent', () => {
  it('describes a purchase by the order, whatever the browser sent', () => {
    const event = toMetaServerEvent(
      {
        eventName: MetaRelayEventName.Purchase,
        eventId: 'order-FOX-2026-000123',
        eventSourceUrl: PAGE,
        orderToken: 'token-abc',
      },
      visitor,
      { skus: ['FOX-UA-39224'], valueCents: 440_000 },
      NOW_MS,
    )

    expect(event).toEqual({
      event_name: 'Purchase',
      event_time: 1_791_620_000,
      event_id: 'order-FOX-2026-000123',
      event_source_url: PAGE,
      action_source: 'website',
      user_data: {
        client_ip_address: '93.170.10.1',
        client_user_agent: 'Mozilla/5.0',
        fbp: 'fb.1.1791000000000.123456789',
      },
      custom_data: {
        content_ids: ['FOX-UA-39224'],
        content_type: 'product',
        currency: 'UAH',
        value: 4400,
      },
    })
  })

  it('names a viewed product by its group, as the catalogue lists its variants', () => {
    const event = toMetaServerEvent(
      {
        eventName: MetaRelayEventName.ViewContent,
        eventId: 'id-1',
        eventSourceUrl: PAGE,
        contentIds: ['FOX-UA-39224'],
        valueCents: 220_000,
      },
      visitor,
      null,
      NOW_MS,
    )

    expect(event.custom_data).toEqual({
      content_ids: ['FOX-UA-39224'],
      content_type: 'product_group',
      currency: 'UAH',
      value: 2200,
    })
  })

  it('sends a lead without product data and leaves out unknown visitor fields', () => {
    const event = toMetaServerEvent(
      { eventName: MetaRelayEventName.Lead, eventId: 'id-1', eventSourceUrl: PAGE },
      { ipAddress: undefined, userAgent: undefined, fbp: undefined, fbc: undefined },
      null,
      NOW_MS,
    )

    expect(event.user_data).toEqual({})
    expect(event).not.toHaveProperty('custom_data')
  })
})
