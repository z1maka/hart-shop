// The parameter the Merchant Center and Meta feeds put in a link to one size
// of a product: «Gen 3 / Gen 4» of a Starlink cover is an offer of its own.
export const SIZE_PARAM = 'size'

type ProductSearchParams = Readonly<Record<string, string | string[] | undefined>>

// The size a link asks the product page to open on, among the sizes the
// product actually has.
export function requestedSizeOf(
  searchParams: ProductSearchParams,
  sizes: readonly string[],
): string | null {
  const requested = searchParams[SIZE_PARAM]
  return typeof requested === 'string' && sizes.includes(requested) ? requested : null
}
