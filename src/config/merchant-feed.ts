import { OWN_PRODUCTION_CATEGORY_SLUGS } from '@/config/catalog'

// The Google Merchant Center product feed the new site serves in place of the
// Google for WooCommerce plugin, which pushed the catalogue from WordPress
// through the Content API and stops the day WordPress does.

// The offer ids that plugin gave each product: its prefix followed by the
// WordPress product id (a simple product) or variation id. Keeping them keeps
// every item's history in Merchant Center and in the Ads campaigns.
export const LEGACY_OFFER_ID_PREFIX = 'gla_'

// Variants the new admin added after the move have no WordPress id; they get
// ids of their own, distinct from any the plugin could have used.
export const NEW_OFFER_ID_PREFIX = 'hart_'

export const FEED_PATH = '/feeds/merchant-center.xml'

// The country and language the feed's data source is registered under in
// Merchant Center; a sale reported with cart data names them to find the
// offers.
export const FEED_TARGET_COUNTRY = 'UA'
export const FEED_CONTENT_LANGUAGE = 'uk'

// Merchant Center reads up to this many characters of a description and ten
// additional images; the rest would only be cut.
export const FEED_DESCRIPTION_MAX_LENGTH = 5000
export const FEED_ADDITIONAL_IMAGES_MAX = 10
export const FEED_TITLE_MAX_LENGTH = 150

// The spec row the product pages already carry for the fabric; its value is
// the feed's material. Merchant Center reads up to 200 characters of it.
export const FEED_MATERIAL_SPEC_LABEL = 'Тканина'
export const FEED_MATERIAL_MAX_LENGTH = 200

// Everything worn in the catalogue is cut for adults of either sex.
export const FEED_APPAREL_GENDER = 'unisex'
export const FEED_APPAREL_AGE_GROUP = 'adult'

// Published products kept out of both feeds while they stay on the site. The
// owner does not advertise the ARC helmet mounts (14.10.2026), on their own or
// in the headset kit.
export const FEED_EXCLUDED_SLUGS: readonly string[] = [
  'kriplennya-povorotni-na-reytsi-arc-na-sholom',
  'komplekt-walkers-razor-z-kriplenniamy-arc',
]

// Gallery shots kept out of the feeds while they stay on the site, because
// Google Shopping and Meta reject them. Storage keys.
export const FEED_EXCLUDED_IMAGE_KEYS: readonly string[] = [
  // Weapons in the frame (owner, 3.11.2026). MOLLE blanket: a soldier lies
  // under it with a rifle.
  'products/antyteploviziyna-kovdra-z-molle/5-a530d2ef.webp',
  // Winter tent: a machine gunner lies under it.
  'products/antyteploviziynyi-tent-250x150-zymovyi/8-80b32f51.webp',
  // Collages of several shots with captions and badges over them, which
  // Merchant Center treats as text overlays (owner, 7.11.2026). Starlink
  // 3-layer covers: multicam, olive, pixel, winter.
  'products/antyteploviziynyi-chokhol-na-starlink-multykam/5-7076f8e9.webp',
  'products/antyteploviziynyi-chokhol-na-starlink-olyva/5-683f70d3.webp',
  'products/chekhol-antiteplovizor-i-antidron-dlya-starlink/14-8878b32f.webp',
  'products/winter-cover-anti-thermal-vision-and-anti/16-eea02122.webp',
]

// Colours on sale with no photos of their own yet: choosing one keeps the
// card's gallery, which shows another colour, so their offers stay out of
// both feeds until they are shot (owner, 25.10.2026). Variant skus.
export const FEED_NO_PHOTO_VARIANT_SKUS: readonly string[] = [
  '3600-2-PIXEL',
  '3600-2-OLIVE',
  // FX14 winter multicam: the gallery is multicam only (3.11.2026).
  '3600-2-WINTER',
  // MOLLE blanket khaki: multicam, winter blot and pixel have photos (3.11.2026).
  'HART-37564-KHAKI',
  // Starlink Mini: reshot in multicam only (25.10.2026).
  'HART-38686-V38688',
  'HART-38686-V38689',
  // Smooth Starlink Mini: shot in pixel only (25.10.2026).
  'HART-SL-MINI-MULTICAM',
  'HART-SL-MINI-OLIVE',
  // Acasom ROC-6 olive: multicam and pixel have photos (25.10.2026).
  'HART-39064-V39066',
  // Self-cooling Starlink Mini 3D-net: winter blot not shot yet (27.10.2026).
  'HART-SL-MINI-3D-WINTER',
  // UV+EM cloak with sleeves: reshot in multicam only (27.10.2026).
  'HART-37688-WINTER',
  'HART-37688-PIXEL',
  'HART-37688-OLIVE',
]

// The Google feed carries what the workshop sews — ponchos, tents and Starlink
// covers — and only the cards with the owner's own photos (owner, 21.10.2026):
// Merchant Center suspended the account for misrepresentation on 20.10.2026,
// and a card whose gallery is byte-for-byte FOX Armor's reads as a copy of
// another shop. Bought-in goods stay out for the same reason.
export const MERCHANT_FEED_CATEGORY_SLUGS: readonly string[] = OWN_PRODUCTION_CATEGORY_SLUGS

// Own-production cards whose cover is still a FOX Armor photo. A card leaves
// this list once its gallery is reshot.
export const MERCHANT_FEED_FOX_PHOTO_SLUGS: readonly string[] = [
  'anty-teploviziynyy-tent-multi-vt-6370-nakydka-vid-droniv-zakhyst-vid-teplovizora-anty-teplovizor',
  'antydronove-poncho-uv-em',
  'antyteploviziyni-chokhly-na-ruky-uv-em',
  'antyteploviziyni-chokhly-na-nohy-uv-em',
  'plashch-nakidka-poncho-s-trekhsharovoy-tkanyu-antiteploviziyniy-zakhist',
  'antydronove-poncho-z-molle-4-shary',
  'antyteploviziynyi-chokhol-na-antenu-adaptis',
]
