import { FEED_CONTENT_LANGUAGE, FEED_TARGET_COUNTRY } from '@/config/merchant-feed'

export type AnalyticsItem = {
  readonly sku: string
  readonly title: string
  readonly priceCents: number
  readonly quantity: number
  readonly categorySlug: string | null
}

export type AnalyticsEvent =
  | {
      readonly name: 'view_item_list'
      readonly listName: string
      readonly items: readonly AnalyticsItem[]
    }
  | { readonly name: 'view_item'; readonly item: AnalyticsItem }
  | { readonly name: 'add_to_cart'; readonly item: AnalyticsItem }
  | {
      readonly name: 'begin_checkout'
      readonly items: readonly AnalyticsItem[]
      readonly valueCents: number
    }
  | {
      readonly name: 'add_shipping_info'
      readonly items: readonly AnalyticsItem[]
      readonly valueCents: number
      readonly shippingTier: string
    }
  | { readonly name: 'generate_lead'; readonly leadType: 'quote' | 'contact' | 'custom_order' }
  // Measures whether anyone compares products at all — the feature stays or
  // goes on this number (owner's review, 17.09.2026).
  | { readonly name: 'compare_toggle'; readonly productSlug: string; readonly isAdded: boolean }
  | {
      readonly name: 'purchase'
      readonly orderNumber: string
      readonly items: readonly AnalyticsItem[]
      readonly valueCents: number
      readonly shippingCents: number
      readonly taxCents: number
      readonly customer?: ConversionCustomer
      // Lets the server look the sale up for the Conversions API instead of
      // trusting a value posted from the browser.
      readonly orderToken?: string
      readonly adsCart?: AdsCart
    }

// Google Ads conversions with cart data: the bought lines under the ids the
// Merchant Center feed gives the products, so Ads can tell which products
// its clicks sold.
export type AdsCart = {
  readonly merchantId: number
  readonly lines: readonly AdsCartLine[]
}

export type AdsCartLine = {
  readonly offerId: string
  readonly quantity: number
  readonly priceCents: number
}

// What Google Ads enhanced conversions match a sale on. Only the two strong
// identifiers: a name split from one free-form field and a Nova Poshta branch
// without a postal code would not match anyway. Raw values: the Google tag
// normalises and hashes them in the browser before anything leaves the page.
export type ConversionCustomer = {
  readonly email: string | null
  // E.164 (+380…) or null when the number is not a dialable Ukrainian one.
  readonly phone: string | null
}

export const CURRENCY = 'UAH'

const CENTS_PER_UNIT = 100

export function toMajorUnits(cents: number): number {
  return Number((cents / CENTS_PER_UNIT).toFixed(2))
}

export function toGa4Items(items: readonly AnalyticsItem[]) {
  return items.map((item) => ({
    item_id: item.sku,
    item_name: item.title,
    item_category: item.categorySlug ?? undefined,
    price: toMajorUnits(item.priceCents),
    quantity: item.quantity,
    currency: CURRENCY,
  }))
}

export function toTikTokContents(items: readonly AnalyticsItem[]) {
  return items.map((item) => ({
    content_id: item.sku,
    content_type: 'product',
    content_name: item.title,
    price: toMajorUnits(item.priceCents),
    quantity: item.quantity,
  }))
}

export type AdsCartData = {
  readonly aw_merchant_id: number
  readonly aw_feed_country: string
  readonly aw_feed_language: string
  readonly items: readonly {
    readonly id: string
    readonly quantity: number
    readonly price: number
  }[]
}

// The cart data parameters of a Google Ads purchase conversion.
export function toAdsCartData(cart: AdsCart): AdsCartData {
  return {
    aw_merchant_id: cart.merchantId,
    aw_feed_country: FEED_TARGET_COUNTRY,
    aw_feed_language: FEED_CONTENT_LANGUAGE,
    items: cart.lines.map((line) => ({
      id: line.offerId,
      quantity: line.quantity,
      price: toMajorUnits(line.priceCents),
    })),
  }
}

// The shape gtag('set', 'user_data', …) expects; null when there is nothing
// to match on, so the tag is never handed an empty object.
export function toGoogleUserData(
  customer: ConversionCustomer,
): { readonly email?: string; readonly phone_number?: string } | null {
  if (!customer.email && !customer.phone) return null

  return {
    ...(customer.email ? { email: customer.email } : {}),
    ...(customer.phone ? { phone_number: customer.phone } : {}),
  }
}

export function totalOf(items: readonly AnalyticsItem[]): number {
  return items.reduce((total, item) => total + item.priceCents * item.quantity, 0)
}
