import { BLANKET_SLUG, TENT_SLUG } from '@/config/home'

// «Про нас» opens on four photos that show the range at a glance (owner,
// 18.10.2026): copies in public/about, so editing a product's gallery never
// breaks this page. Each key names its label in uk.json `about.collage`; the
// focus keeps the subject in a tile cut wider than the photo.
export const ABOUT_COLLAGE = [
  {
    key: 'poncho',
    url: '/about/poncho.webp',
    alt: 'Маскувальне пончо з 3D-листям ззаду, в осінній траві',
    href: '/product-category/anti-dronovi-nakidki/',
    focus: 'object-[center_35%]',
  },
  {
    key: 'tent',
    url: '/about/tent.webp',
    alt: 'Антитепловізійний тент навісом і варіанти його розмірів',
    href: `/product/${TENT_SLUG}/`,
    focus: 'object-top',
  },
  {
    key: 'starlink',
    url: '/about/starlink.webp',
    alt: 'Чохли на Starlink у мультикамі, пікселі й зеленому камуфляжі поруч із терміналом',
    href: '/product-category/чохли-для-starlink/',
    focus: 'object-center',
  },
  {
    key: 'blanket',
    url: '/about/blanket.webp',
    alt: 'Антитепловізійна ковдра накриває позицію зі зброєю на сошках',
    href: `/product/${BLANKET_SLUG}/`,
    focus: 'object-[center_60%]',
  },
] as const
