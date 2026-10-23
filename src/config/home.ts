// The home page's hand-picked parts. Product slugs are URLs: one that is no
// longer published drops out of its block (and is logged), so a stale entry
// never turns into a dead link. Each key names its words in uk.json `home`.

// The first screen's photo, chosen by the owner (17.10.2026) and shown as
// taken: a person in the 3D-leaf poncho. A file of its own, not a product
// cover, so a product's gallery and the hero never move together.
export const HERO_PHOTO = {
  url: '/home/hero-poncho-3d.webp',
  alt: 'Маскувальне пончо з 3D-листям у осінній посадці',
} as const

// The owner's photo for the home page: the range blending into terrain says
// more than one product's studio frame. The file lives in public/home.
const FIELD_PHOTO = {
  url: '/home/role-maskuvannya.webp',
  alt: 'Маскувальне пончо з 3D-листям зі спини в осінній посадці',
} as const

export const BLANKET_SLUG = 'antyteploviziyna-kovdra-z-molle'

// The multicam tent, the former pixel card (owner, 22.10.2026): its cover is
// the tent over a quad bike in autumn brush.
export const TENT_SLUG = 'antyteploviziynyi-tent-250x150-multykam'

// Where a tile's picture comes from: the owner's own photo, one product's
// cover, or the dearest product of a category.
export type HomeTileImage =
  | { readonly kind: 'photo'; readonly url: string; readonly alt: string }
  | { readonly kind: 'product'; readonly slug: string }
  | { readonly kind: 'category'; readonly slug: string }

// «Маскування для…»: one photo tile per thing a buyer hides. The first tile
// is the large one in the mosaic.
export const HOME_TILES = [
  {
    key: 'person',
    href: '/product-category/anti-dronovi-nakidki/',
    image: { kind: 'photo', ...FIELD_PHOTO },
  },
  { key: 'position', href: `/product/${TENT_SLUG}/`, image: { kind: 'product', slug: TENT_SLUG } },
  {
    key: 'starlink',
    href: '/product-category/chokhly-dlya-starlink/',
    image: { kind: 'category', slug: 'chokhly-dlya-starlink' },
  },
  { key: 'gear', href: `/product/${BLANKET_SLUG}/`, image: { kind: 'product', slug: BLANKET_SLUG } },
] as const satisfies readonly { key: string; href: string; image: HomeTileImage }[]

const STARLINK_3D_AUTUMN_SLUG = 'samookholodzhuvalnyi-chokhol-na-starlink-z-3d-sitkoiu-osinnii'

// «Чохол на Starlink за три питання»: the category text's three questions,
// each answer pointing at the cover that fits it. Where one of the shop's own
// 3D-mesh covers fits, it is the answer (owner, 19.10.2026) — the autumn one
// answers two questions; terminal models and the all-season vent stay on the
// shaped covers. Gen 2, 3 and 4 share one card, the model picked by the
// colour (owner, 20.10.2026).
export const HOME_STARLINK_CHOOSER = [
  {
    key: 'terminal',
    options: [
      { key: 'gen2to4', slug: 'chekhol-antiteplovizor-i-antidron-dlya-starlink' },
      { key: 'mini', slug: 'antyteploviziynyi-chokhol-na-starlink-mini' },
      { key: 'adaptis', slug: 'antyteploviziynyi-chokhol-na-antenu-adaptis' },
      { key: 'avenger', slug: 'antyteploviziynyi-chokhol-na-avenger-big-hulk' },
      { key: 'acasom', slug: 'antyteploviziynyi-chokhol-na-acasom-roc-6' },
      { key: 'acasomRoc4', slug: 'antyteploviziynyi-chokhol-na-acasom-roc-4' },
    ],
  },
  {
    key: 'mode',
    options: [
      { key: 'selfCooling', slug: STARLINK_3D_AUTUMN_SLUG },
    ],
  },
  {
    key: 'place',
    options: [
      { key: 'snow', slug: 'winter-cover-anti-thermal-vision-and-anti' },
      { key: 'snowLong', slug: 'zymovyi-chokhol-na-starlink-z-3d-sitkoiu' },
      { key: 'grass', slug: STARLINK_3D_AUTUMN_SLUG },
    ],
  },
] as const

export const HOME_STARLINK_GUIDE_HREF = '/guides/chokhol-dlya-starlink-navishcho-i-yakyi/'
export const HOME_FABRIC_GUIDE_HREF = '/guides/yak-pratsyuye-antyteploviziyna-tkanyna/'

export const HOME_FEATURED_COUNT = 6

// Order of the buyers' questions at the foot of the page.
export const HOME_FAQ_KEYS = ['cod', 'dispatch', 'warranty', 'wholesale', 'custom'] as const

export const HOME_FACT_KEYS = ['dispatch', 'transit', 'cod', 'warranty', 'wholesale'] as const
