export const siteConfig = {
  name: 'Гарт',
  tagline: 'Екіпірування для сильних',
  description:
    'Антитепловізійне й антидронове маскувальне спорядження українського виробництва: пончо, накидки, чохли для Starlink, шоломи, навушники, рюкзаки. Доставка Новою Поштою по Україні.',
  locale: 'uk',
} as const

// The shop front shows what we make ourselves; resold equipment lives in the
// catalogue but does not headline the home page. Slugs as in the categories
// table: the WordPress ones, the Starlink shelf renamed to Latin (22.10.2026).
export const FEATURED_CATEGORY_SLUGS: readonly string[] = [
  'anti-dronovi-nakidki',
  'chokhly-dlya-starlink',
  'noshi',
  'ryukzaki',
] as const
