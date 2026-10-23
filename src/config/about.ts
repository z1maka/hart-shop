import { TENT_SLUG } from '@/config/home'

const ANTENNA_COVER_SLUG = 'antyteploviziynyi-chokhol-na-acasom-roc-6'

// «Про нас» opens on four photos that show the range at a glance (owner,
// 18.10.2026): copies in public/about, so editing a product's gallery never
// breaks this page. Each key names its label in uk.json `about.collage`; the
// focus keeps the subject in a tile cut wider than the photo. Since 23.10
// they are the workshop's own shots; the blanket made way for the antenna
// covers, as it has no photos of its own yet.
export const ABOUT_COLLAGE = [
  {
    key: 'poncho',
    url: '/about/poncho-olyva.webp',
    alt: 'Антитепловізійне пончо в оливі серед осінніх кущів',
    href: '/product-category/anti-dronovi-nakidki/',
    focus: 'object-[center_30%]',
  },
  {
    key: 'tent',
    url: '/about/tent-multykam.webp',
    alt: 'Антитепловізійний тент у мультикамі над траншеєю в осінньому лісі',
    href: `/product/${TENT_SLUG}/`,
    focus: 'object-center',
  },
  {
    key: 'starlink',
    url: '/about/starlink-multykam.webp',
    alt: 'Антитепловізійний чохол на Starlink у мультикамі на терміналі в осінньому лісі',
    href: '/product-category/chokhly-dlya-starlink/',
    focus: 'object-[center_60%]',
  },
  {
    key: 'antenna',
    url: '/about/antenna-acasom.webp',
    alt: 'Антитепловізійний чохол з 3D-листям на антені Acasom на тринозі',
    href: `/product/${ANTENNA_COVER_SLUG}/`,
    focus: 'object-[center_45%]',
  },
] as const
