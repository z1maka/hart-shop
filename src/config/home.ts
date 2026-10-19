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

export const BLANKET_SLUG =
  'anty-teploviziyne-odeyalo-zakhysna-nakydka-vid-droniv-zakhyshchaye-vid-teploviziynoho-sposterezhennya'

export const TENT_SLUG =
  'anty-teploviziynyy-tent-multi-vt-6370-nakydka-vid-droniv-zakhyst-vid-teplovizora-anty-teplovizor'

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
    href: '/product-category/чохли-для-starlink/',
    image: { kind: 'category', slug: 'чохли-для-starlink' },
  },
  { key: 'gear', href: `/product/${BLANKET_SLUG}/`, image: { kind: 'product', slug: BLANKET_SLUG } },
] as const satisfies readonly { key: string; href: string; image: HomeTileImage }[]

const STARLINK_3D_AUTUMN_SLUG = 'samookholodzhuvalnyi-chokhol-na-starlink-z-3d-sitkoiu-osinnii'

// «Чохол на Starlink за три питання»: the category text's three questions,
// each answer pointing at the cover that fits it. Where one of the shop's own
// 3D-mesh covers fits, it is the answer (owner, 19.10.2026) — the autumn one
// answers two questions; terminal models and the all-season vent stay on the
// shaped covers.
export const HOME_STARLINK_CHOOSER = [
  {
    key: 'terminal',
    options: [
      { key: 'gen2', slug: 'chekhol-antiteplovizor-i-antidron-dlya-starlink' },
      { key: 'gen3', slug: 'chokhol-antiteplovizor-i-antidron-dlya-starlinka-starlink-gen-3' },
      { key: 'mini', slug: 'copy-case-anti-thermal-vision-and-anti-dr' },
      { key: 'adaptis', slug: 'чохол-антитепловізор-та-антидрон-для' },
      { key: 'avenger', slug: 'чохол-антитепловізор-та-антидрон-для-2' },
    ],
  },
  {
    key: 'mode',
    options: [
      {
        key: 'ventilated',
        slug: 'polozheniya-antiteplovogo-rezhima-na-starlink-iz-sistemy-okhlazhdeniya-bud-yaka-model',
      },
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
