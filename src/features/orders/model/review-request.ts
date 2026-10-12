import { daysAgo } from '@/lib/datetime'

export type ReviewRequestWindow = {
  readonly deliveredFrom: Date
  readonly deliveredTo: Date
}

// Orders handed over inside this window are due an ask: at least
// `afterDays` ago, at most `withinDays` ago.
export function reviewRequestWindow(
  now: Date,
  afterDays: number,
  withinDays: number,
): ReviewRequestWindow {
  return { deliveredFrom: daysAgo(now, withinDays), deliveredTo: daysAgo(now, afterDays) }
}

// The product page's review form, for a slug the WordPress import left in
// Cyrillic as much as for a Latin one.
export function reviewFormUrl(siteUrl: string, productSlug: string): string {
  return `${siteUrl}/product/${encodeURIComponent(productSlug)}/#reviews`
}
