import { cookies } from 'next/headers'
import { CONSENT_POLICY } from '@/config/consent'
import { CONSENT_COOKIE, parseConsent, shouldLoadTags } from '@/features/analytics/model/consent'
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
  const consent = parseConsent(store.get(CONSENT_COOKIE)?.value)
  if (!shouldLoadTags(consent, CONSENT_POLICY)) return null

  return parseTouch(store.get(TRAFFIC_COOKIE)?.value)
}
