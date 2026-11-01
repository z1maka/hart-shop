// The order page reports the sale to analytics only when the buyer lands on
// it from checkout. The SMS and the mail link to the same page, and opened in
// another browser it counted the sale a second time in GA4 (1.11.2026).
const JUST_PLACED_PARAM = 'placed'
const JUST_PLACED_VALUE = '1'

type QueryParams = Readonly<Record<string, string | string[] | undefined>>

export function placedOrderPath(accessToken: string): string {
  return `/order/${accessToken}/?${JUST_PLACED_PARAM}=${JUST_PLACED_VALUE}`
}

export function isJustPlaced(query: QueryParams): boolean {
  return query[JUST_PLACED_PARAM] === JUST_PLACED_VALUE
}

// The address left in the bar once the sale is reported: a link copied from
// there opens the order without reporting the sale again.
export function withoutPlacedMarker(href: string): string {
  const url = new URL(href)
  url.searchParams.delete(JUST_PLACED_PARAM)
  return url.href
}
