import { cookies } from 'next/headers'
import { CONSENT_POLICY } from '@/config/consent'
import { CONSENT_COOKIE, parseConsent, shouldLoadTags } from '@/features/analytics/model/consent'
import { GOOGLE_CLICK_COOKIE, parseGoogleClickId } from '@/features/analytics/model/google-click'
import {
  TRAFFIC_COOKIE,
  parseTouch,
  type TrafficTouch,
} from '@/features/analytics/model/traffic-source'

// The channel the shopper came from, for the order being placed; null
// without one, and for a shopper who has refused tracking since — the
// consent is read again here, not trusted from the visit.
export async function readTrafficTouch(): Promise<TrafficTouch | null> {
  const store = await cookies()
  if (!isTrackingAllowed(store.get(CONSENT_COOKIE)?.value)) return null

  return parseTouch(store.get(TRAFFIC_COOKIE)?.value)
}

// The Google Ads click behind the order being placed, under the same consent
// rule as the channel.
export async function readGoogleClickId(): Promise<string | null> {
  const store = await cookies()
  if (!isTrackingAllowed(store.get(CONSENT_COOKIE)?.value)) return null

  return parseGoogleClickId(store.get(GOOGLE_CLICK_COOKIE)?.value)
}

function isTrackingAllowed(consentCookie: string | undefined): boolean {
  return shouldLoadTags(parseConsent(consentCookie), CONSENT_POLICY)
}
