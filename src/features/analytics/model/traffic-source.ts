import { TrafficSource } from '@/db/enums'

// The channel of one visit and what tells it apart inside the channel: the
// campaign of an ad, the tag of a link.
export type TrafficTouch = {
  readonly source: TrafficSource
  readonly detail: string | null
}

export type Visit = {
  readonly url: URL
  // document.referrer: empty for a typed address, a bookmark, many apps.
  readonly referrer: string
}

export const TRAFFIC_COOKIE = 'fox_source'
// How long a visit keeps the credit for an order placed later.
export const TRAFFIC_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

const MAX_DETAIL_LENGTH = 120
const GOOGLE_CLICK_PARAMS = ['gclid', 'gbraid', 'wbraid']
// Google adds gad_source to free Shopping listings too (value 5); only 1 is
// an ad.
const GOOGLE_ADS_GAD_SOURCE = '1'
// Meta's own {{site_source_name}} values and the names people type by hand.
const META_UTM_SOURCES = new Set(['facebook', 'fb', 'ig', 'instagram', 'meta', 'msg', 'an'])
const PAID_UTM_MEDIA = new Set([
  'paid',
  'paid_social',
  'paidsocial',
  'paid-social',
  'cpc',
  'ppc',
  'cpm',
  'ads',
])
const SEARCH_UTM_MEDIA = new Set(['organic', 'seo'])
const REFERRAL_UTM_MEDIA = new Set(['referral', 'referer', 'link'])
// Where a buyer returns from mid-checkout: not a new visit.
const PAYMENT_HOSTS = ['wayforpay.com', 'monobank.ua', 'liqpay.ua']
const SEARCH_HOSTS = [
  /(^|\.)google\.[a-z.]+$/,
  /(^|\.)bing\.com$/,
  /(^|\.)yahoo\.com$/,
  /(^|\.)duckduckgo\.com$/,
  /(^|\.)yandex\.[a-z.]+$/,
  /(^|\.)ecosia\.org$/,
  /(^|\.)search\.brave\.com$/,
]
const SEARCH_APPS = ['com.google.android.googlequicksearchbox', 'com.google.android.gm']
const SOCIAL_HOSTS = [
  /(^|\.)facebook\.com$/,
  /(^|\.)fb\.com$/,
  /(^|\.)instagram\.com$/,
  /(^|\.)t\.me$/,
  /(^|\.)telegram\.org$/,
  /(^|\.)youtube\.com$/,
  /(^|\.)tiktok\.com$/,
  /(^|\.)x\.com$/,
  /(^|\.)t\.co$/,
  /(^|\.)linkedin\.com$/,
  /(^|\.)threads\.net$/,
]

// What brought this page load, or null when it is no new visit at all — a
// page reached from the shop itself or back from the payment page.
export function classifyVisit(visit: Visit): TrafficTouch | null {
  const params = visit.url.searchParams
  const tagged = taggedTouch(params)
  if (tagged) return tagged

  const referrer = parseReferrer(visit.referrer)
  if (!referrer) return { source: TrafficSource.Direct, detail: null }
  if (isInternal(referrer, visit.url.hostname)) return null

  return { source: channelOfReferrer(referrer), detail: referrer.hostname || referrer.protocol }
}

// The last visit that came from somewhere wins; a later direct visit — the
// buyer typing the address after an ad — keeps the earlier channel's credit.
export function shouldReplace(previous: TrafficTouch | null, next: TrafficTouch): boolean {
  return next.source !== TrafficSource.Direct || previous === null
}

// What one page load leaves in the cookie: the visit's channel, when it is a
// visit at all and outranks what the cookie holds; null to leave it alone.
export function touchToKeep(visit: Visit, storedCookie: string | undefined): TrafficTouch | null {
  const touch = classifyVisit(visit)
  if (!touch) return null

  return shouldReplace(parseTouch(storedCookie), touch) ? touch : null
}

function taggedTouch(params: URLSearchParams): TrafficTouch | null {
  const utmSource = params.get('utm_source')?.trim().toLowerCase() ?? ''
  const utmMedium = params.get('utm_medium')?.trim().toLowerCase() ?? ''
  const campaign = detailOf(params.get('utm_campaign'))

  const isGoogleClick =
    GOOGLE_CLICK_PARAMS.some((name) => params.has(name)) ||
    params.get('gad_source') === GOOGLE_ADS_GAD_SOURCE
  if (isGoogleClick) return { source: TrafficSource.GoogleAds, detail: campaign }
  if (utmSource === 'google' && PAID_UTM_MEDIA.has(utmMedium)) {
    return { source: TrafficSource.GoogleAds, detail: campaign }
  }
  if (META_UTM_SOURCES.has(utmSource)) {
    const source = PAID_UTM_MEDIA.has(utmMedium) ? TrafficSource.Meta : TrafficSource.Social
    return { source, detail: campaign }
  }
  if (utmSource) return taggedByMedium(utmSource, utmMedium, campaign)
  // Facebook and Instagram add fbclid to every link they open, a post's as
  // much as an ad's: without the ad's utm tags it cannot be told apart.
  if (params.has('fbclid')) return { source: TrafficSource.Social, detail: null }
  return null
}

// A tag that names its medium is read as that channel — the Google Business
// Profile link comes as google/organic, a partner's as site/referral; any
// other medium is its own tag.
function taggedByMedium(
  utmSource: string,
  utmMedium: string,
  campaign: string | null,
): TrafficTouch {
  if (SEARCH_UTM_MEDIA.has(utmMedium)) return { source: TrafficSource.Search, detail: utmSource }
  if (REFERRAL_UTM_MEDIA.has(utmMedium)) {
    return { source: TrafficSource.Referral, detail: utmSource }
  }
  return {
    source: TrafficSource.Tagged,
    detail: detailOf([utmSource, campaign].filter(Boolean).join(' · ')),
  }
}

function channelOfReferrer(referrer: URL): TrafficSource {
  if (referrer.protocol === 'android-app:') {
    return SEARCH_APPS.includes(referrer.hostname) ? TrafficSource.Search : TrafficSource.Referral
  }
  if (SEARCH_HOSTS.some((host) => host.test(referrer.hostname))) return TrafficSource.Search
  if (SOCIAL_HOSTS.some((host) => host.test(referrer.hostname))) return TrafficSource.Social
  return TrafficSource.Referral
}

// The shop's own domain with every subdomain (www, the old site, media):
// a step inside it is no new visit.
function isInternal(referrer: URL, ownHost: string): boolean {
  const host = referrer.hostname
  return [ownHost.replace(/^www\./, ''), ...PAYMENT_HOSTS].some(
    (own) => host === own || host.endsWith(`.${own}`),
  )
}

function parseReferrer(referrer: string): URL | null {
  if (!referrer) return null
  try {
    return new URL(referrer)
  } catch {
    // A referrer the browser could not form is as good as none.
    return null
  }
}

// No percent sign and no control characters: the cookie is percent-encoded
// once by the browser side and may be decoded twice on the way back.
function detailOf(value: string | null): string | null {
  const cleaned = (value ?? '').replace(/[%\u0000-\u001f]/g, '').trim()
  return cleaned === '' ? null : cleaned.slice(0, MAX_DETAIL_LENGTH)
}

// The cookie carries the channel and its detail; anything else in it is
// dropped, as it is read back on the server from the browser.
export function serializeTouch(touch: TrafficTouch): string {
  return encodeURIComponent(JSON.stringify([touch.source, touch.detail]))
}

export function parseTouch(value: string | undefined): TrafficTouch | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value))
    if (!Array.isArray(parsed)) return null
    const [source, detail] = parsed
    if (!isTrafficSource(source)) return null
    return { source, detail: typeof detail === 'string' ? detailOf(detail) : null }
  } catch {
    // A cookie that is not ours, or was cut, carries no channel.
    return null
  }
}

function isTrafficSource(value: unknown): value is TrafficSource {
  return Object.values(TrafficSource).some((source) => source === value)
}
