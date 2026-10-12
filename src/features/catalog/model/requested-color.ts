import { LEGACY_COLOR_SLUGS } from '@/config/catalog'

// The parameter product cards and the Merchant Center feed put in their links.
export const COLOR_PARAM = 'color'
const LEGACY_COLOR_PARAM = 'attribute_pa_color'

type ProductSearchParams = Readonly<Record<string, string | string[] | undefined>>

// The colour a link asks the product page to open on, among the colours the
// product actually has. A WordPress-era link names it by WooCommerce slug;
// the page's own ?color= wins when it names a real colour.
export function requestedColorOf(
  searchParams: ProductSearchParams,
  colors: readonly string[],
): string | null {
  const own = searchParams[COLOR_PARAM]
  if (typeof own === 'string' && colors.includes(own)) return own

  const legacySlug = searchParams[LEGACY_COLOR_PARAM]
  if (typeof legacySlug !== 'string') return null

  const name = legacyColorName(legacySlug)
  if (name === null) return null

  // WordPress had one «Зимовий»; some ponchos here name it «Зимовий
  // мультикам», so a colour that begins with the old name still counts.
  return (
    colors.find((color) => color === name) ?? colors.find((color) => color.startsWith(name)) ?? null
  )
}

// The slug comes from the address bar: `constructor` or `__proto__` must not
// reach what every object inherits.
function legacyColorName(slug: string): string | null {
  const key = slug.toLowerCase()

  return Object.hasOwn(LEGACY_COLOR_SLUGS, key) ? (LEGACY_COLOR_SLUGS[key] ?? null) : null
}
