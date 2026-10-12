export const siteConfig = {
  name: 'FOX Armor',
  tagline: 'Тактичне спорядження від українського виробника',
  description:
    'Антитепловізійне й антидронове маскувальне спорядження українського виробництва: пончо, накидки, чохли для Starlink, шоломи, навушники, рюкзаки. Доставка Новою Поштою по Україні.',
  locale: 'uk',
  social: {
    instagram: '',
    facebook: '',
    youtube: 'https://www.youtube.com/@armedfox1833',
  },
} as const

// The shop front shows what we make ourselves; resold equipment lives in the
// catalogue but does not headline the home page. Slugs are the WordPress
// category slugs, carried over verbatim (AGENTS.md §1).
export const FEATURED_CATEGORY_SLUGS: readonly string[] = [
  'anti-dronovi-nakidki',
  'чохли-для-starlink',
  'noshi',
  'ryukzaki',
] as const
