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
  'komplekt-oryhinalnyy-aktyvni-navushnyky-walkers-razor-usa-z-povorotnymy-kriplennyamy',
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
  'anty-teploviziyna-nakydka-poncho-a6286',
  'anty-teploviziyne-odeyalo-zakhysna-nakydka-vid-droniv-zakhyshchaye-vid-teploviziynoho-sposterezhennya',
  'anty-teploviziynyy-tent-multi-a6286-nakydka-vid-droniv-zakhyst-vid-teplovizora-anty-teplovizor',
  'anty-teploviziynyy-tent-multi-vt-6370-nakydka-vid-droniv-zakhyst-vid-teplovizora-anty-teplovizor',
  'antydron-poncho-predator-class-a-uv-em-zakhyst',
  'antydron-poncho-predator-class-c-uv-em-zakhyst',
  'antyteploviziynyi-tent-250x150-khaki',
  'antyteploviziynyi-tent-250x150-zymovyi',
  'chokhly-nakydni-predator-dlya-ruk-uv-em-zakhyst',
  'chokhly-ponozhni-predator-dlya-nih-uv-em-zakhyst',
  'plashch-nakidka-poncho-s-trekhsharovoy-tkanyu-antiteploviziyniy-zakhist',
  'poncho-z-posylenym-zakhystom-vid-teplovizoriv-ta-droniv-model-fx-2-iz-dodatkovymy-kriplennyamy-elementiv-maskuvannya-molle-molle-anty-teplovizor-poncho',
  'copy-case-anti-thermal-vision-and-anti-dr',
  'чохол-антитепловізор-та-антидрон-для',
]
