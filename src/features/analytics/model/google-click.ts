// The Google Ads click a visitor arrived on (the gclid of the landing URL),
// kept for the order they may place: the server reports the sale to Google
// Ads by this id, so a browser that blocks Google's own tag still credits the
// ad that brought the buyer.

export const GOOGLE_CLICK_COOKIE = 'hart_gclid'
// Google Ads credits a sale to a click for up to 90 days.
export const GOOGLE_CLICK_MAX_AGE_SECONDS = 60 * 60 * 24 * 90

const GCLID_PARAM = 'gclid'
// Google's click ids are URL-safe base64; anything else is not a click of ours
// and must not reach the upload file.
const GOOGLE_CLICK_ID = /^[\w-]{20,256}$/

// The click id of a landing URL, or null when the visit is no ad click.
export function googleClickIdOf(url: URL): string | null {
  return parseGoogleClickId(url.searchParams.get(GCLID_PARAM) ?? undefined)
}

// The cookie comes back from the browser: only a well-formed id is trusted.
export function parseGoogleClickId(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return GOOGLE_CLICK_ID.test(trimmed) ? trimmed : null
}
