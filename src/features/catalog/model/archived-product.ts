const SHOP_PATH = '/shop/'

export type ArchivedProductCategory = {
  readonly categorySlug: string | null
  readonly isCategoryVisible: boolean | null
}

// A product taken off sale keeps the search equity of its address: it moves
// permanently to the shelf it stood on, or to the shop when that shelf is
// gone or hidden. A not-found page in its place is a lost indexed URL, and a
// WordPress-era one breaks the migration contract (AGENTS.md §1).
export function archivedProductDestination(product: ArchivedProductCategory): string {
  if (!product.categorySlug || !product.isCategoryVisible) return SHOP_PATH

  // Encoded: the address goes out as a Location header, which takes ASCII
  // only — a Cyrillic shelf («чохли-для-starlink») made the redirect a 500.
  return `/product-category/${encodeURIComponent(product.categorySlug)}/`
}
