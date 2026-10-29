import { OWN_PRODUCTION_CATEGORY_SLUGS } from '@/config/catalog'

// The product file dropshipping partners import into their own shops (owner,
// 29.10.2026). Our Merchant Center and Meta feeds are not handed out: they
// carry our offer ids, our wholesale lines and links to our pages.

// What a partner may resell: what the workshop sews, as the dropshipping
// offer lists it.
export const PARTNER_FEED_CATEGORY_SLUGS: readonly string[] = OWN_PRODUCTION_CATEGORY_SLUGS

// Prom and Rozetka take up to ten photos of an offer.
export const PARTNER_FEED_PICTURES_MAX = 10
