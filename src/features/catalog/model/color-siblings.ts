import { COLOR_PARAM } from '@/features/catalog/model/requested-color'

export type ColorSiblingRow = {
  readonly slug: string
  readonly color: string | null
}

export type ColorLink = {
  readonly color: string
  readonly href: string
}

// The other colours of the same model, each sold on a page of its own. A
// colour this product sells itself stays with its own tile, and a colour two
// siblings share links to the first of them, so every colour shows once. The
// link names its colour: a sibling selling several opens on the one clicked.
export function colorLinksOf(
  currentSlug: string,
  ownColors: readonly string[],
  siblings: readonly ColorSiblingRow[],
): ColorLink[] {
  return siblings.reduce<ColorLink[]>((links, sibling) => {
    const { color } = sibling
    if (sibling.slug === currentSlug || color === null) return links
    if (ownColors.includes(color) || links.some((link) => link.color === color)) return links
    const href = `/product/${sibling.slug}/?${COLOR_PARAM}=${encodeURIComponent(color)}`
    return [...links, { color, href }]
  }, [])
}
