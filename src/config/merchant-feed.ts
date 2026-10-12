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
