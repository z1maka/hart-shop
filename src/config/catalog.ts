export const MAX_COMPARED_PRODUCTS = 4

// The categories the workshop sews itself. Their pages carry the maker's
// note (own production, no foil, maker's prices) that used to open every
// description in capitals; bought-in gear does not make that claim.
export const OWN_PRODUCTION_CATEGORY_SLUGS: readonly string[] = [
  'anti-dronovi-nakidki',
  'chokhly-dlya-starlink',
  'antyteploviziyni-tenty',
]

// WooCommerce's colour terms (pa_color) by slug, as the WordPress shop listed
// them. Links from those days — Google Ads final URLs among them — open a
// colour with ?attribute_pa_color=<slug>; the new pages name it in ?color=.
export const LEGACY_COLOR_SLUGS: Readonly<Record<string, string>> = {
  white: 'Білий',
  green: 'Зелений',
  zimoviy: 'Зимовий',
  camouflage: 'Камуфляж',
  carbon: 'Карбон',
  coyote: 'Койот',
  cryptek: 'Криптек',
  leo: 'Леопард',
  multikam: 'Мультикам',
  oliva: 'Олива',
  pixel: 'Піксель',
  khaki: 'Хакі',
  black: 'Чорний',
  'black-multicam': 'Чорний мультикам',
}

// Kept off the best-sellers rail because its photo already fronts a category
// card on the same page.
export const FEATURED_EXCLUDED_SLUGS: readonly string[] = []

export type CompanionRule = {
  // Specific products that complete the one being viewed — a poncho's hand
  // and leg covers — shown before anything else.
  readonly productSlugs: readonly string[]
  // Categories bought alongside, taken in turn so each is represented.
  readonly categorySlugs: readonly string[]
}

// "З цим купують" on the product page, keyed by the viewed product's
// category (owner's review, 17.09.2026). A category without a rule, or a rule
// that runs short, is topped up from the product's own category.
export const COMPANIONS: Readonly<Record<string, CompanionRule>> = {
  'anti-dronovi-nakidki': {
    productSlugs: [
      'antyteploviziyni-chokhly-na-ruky-uv-em',
      'antyteploviziyni-chokhly-na-nohy-uv-em',
    ],
    categorySlugs: ['antyteploviziyni-tenty', 'chokhly-dlya-starlink', 'ryukzaki'],
  },
  'chokhly-dlya-starlink': { productSlugs: [], categorySlugs: ['anti-dronovi-nakidki'] },
  // Tents left the cloaks' shelf on 25.10.2026; the blanket covers what the
  // tent does not, and the ponchos are what the people under it wear.
  'antyteploviziyni-tenty': {
    productSlugs: ['antyteploviziyna-kovdra-z-molle'],
    categorySlugs: ['anti-dronovi-nakidki', 'chokhly-dlya-starlink'],
  },
  'sholomi-bronepliti': { productSlugs: [], categorySlugs: ['navushniki-taktichni-kreplenya'] },
  'navushniki-taktichni-kreplenya': { productSlugs: [], categorySlugs: ['sholomi-bronepliti'] },
  ryukzaki: { productSlugs: [], categorySlugs: ['noshi', 'taktichna-forma'] },
  noshi: { productSlugs: [], categorySlugs: ['ryukzaki', 'taktichna-forma'] },
  'taktichna-forma': { productSlugs: [], categorySlugs: ['ryukzaki', 'anti-dronovi-nakidki'] },
}
