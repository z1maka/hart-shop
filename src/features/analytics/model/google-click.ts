// The Google Ads click a visitor arrived on, kept for the order they may
// place: the server reports the sale to Google Ads by this click, so a
// browser that blocks Google's own tag still credits the ad that brought the
// buyer.

export const GOOGLE_CLICK_COOKIE = 'hart_gclid'
// Google Ads credits a sale to a click for up to 90 days.
export const GOOGLE_CLICK_MAX_AGE_SECONDS = 60 * 60 * 24 * 90

// Google tags an ad click with a gclid; a click from an iPhone may carry a
// gbraid or a wbraid in its place. Google Ads takes each kind in its own
// upload field.
export const GoogleClickKind = {
  Gclid: 'gclid',
  Gbraid: 'gbraid',
  Wbraid: 'wbraid',
} as const
export type GoogleClickKind = (typeof GoogleClickKind)[keyof typeof GoogleClickKind]

export type GoogleClick = {
  readonly kind: GoogleClickKind
  readonly id: string
}

// A landing URL may carry more than one; the gclid is the one Google matches
// best.
const KINDS_BY_PRIORITY: readonly GoogleClickKind[] = [
  GoogleClickKind.Gclid,
  GoogleClickKind.Gbraid,
  GoogleClickKind.Wbraid,
]
type PrefixedKind = typeof GoogleClickKind.Gbraid | typeof GoogleClickKind.Wbraid
const PREFIXED_KINDS: ReadonlySet<string> = new Set<PrefixedKind>([
  GoogleClickKind.Gbraid,
  GoogleClickKind.Wbraid,
])
const KIND_SEPARATOR = ':'
// Google's click ids are URL-safe base64; anything else is not a click of ours
// and must not reach the upload file.
const GOOGLE_CLICK_ID = /^[\w-]{20,256}$/

// The click of a landing URL, or null when the visit is no ad click.
export function googleClickOf(url: URL): GoogleClick | null {
  const clicks = KINDS_BY_PRIORITY.flatMap((kind) => {
    const id = parseClickId(url.searchParams.get(kind))
    return id ? [{ kind, id }] : []
  })
  return clicks[0] ?? null
}

// How a click is kept in the cookie and on the order. A gclid stays bare: the
// cookies and orders written before iPhone clicks were kept hold one so.
export function serializeGoogleClick(click: GoogleClick): string {
  return click.kind === GoogleClickKind.Gclid ? click.id : `${click.kind}${KIND_SEPARATOR}${click.id}`
}

// The cookie comes back from the browser: only a well-formed click is trusted.
export function parseGoogleClick(value: string | undefined): GoogleClick | null {
  const trimmed = value?.trim() ?? ''
  const separatorAt = trimmed.indexOf(KIND_SEPARATOR)
  if (separatorAt < 0) {
    const id = parseClickId(trimmed)
    return id ? { kind: GoogleClickKind.Gclid, id } : null
  }

  const kind = trimmed.slice(0, separatorAt)
  const id = parseClickId(trimmed.slice(separatorAt + KIND_SEPARATOR.length))
  return id && isPrefixedKind(kind) ? { kind, id } : null
}

function parseClickId(value: string | null): string | null {
  const trimmed = value?.trim() ?? ''
  return GOOGLE_CLICK_ID.test(trimmed) ? trimmed : null
}

function isPrefixedKind(kind: string): kind is PrefixedKind {
  return PREFIXED_KINDS.has(kind)
}
