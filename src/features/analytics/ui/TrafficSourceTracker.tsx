'use client'

import { useEffect } from 'react'
import { CONSENT_POLICY } from '@/config/consent'
import { shouldLoadTags } from '@/features/analytics/model/consent'
import {
  TRAFFIC_COOKIE,
  TRAFFIC_MAX_AGE_SECONDS,
  serializeTouch,
  touchToKeep,
  type Visit,
} from '@/features/analytics/model/traffic-source'
import { useConsent } from '@/features/analytics/ui/use-consent'

// One page load is one visit; client-side navigation inside the shop is not.
let isVisitRecorded = false
// The page the visitor landed on, read once: a consent given later, from
// another page, still describes the landing and not that page.
let landing: Visit | null = null

// Notes which channel brought the visitor, for the order they may place: an
// ad click, a search, a post, a tagged link or the address typed in. Nothing
// is kept for a visitor who refused tracking.
export function TrafficSourceTracker() {
  const { state, isResolved } = useConsent()

  useEffect(() => {
    landing ??= { url: new URL(window.location.href), referrer: document.referrer }
    if (!isResolved || isVisitRecorded || !shouldLoadTags(state, CONSENT_POLICY)) return
    isVisitRecorded = true
    recordVisit(landing)
  }, [isResolved, state])

  return null
}

function recordVisit(visit: Visit): void {
  const touch = touchToKeep(visit, readCookie(TRAFFIC_COOKIE))
  if (!touch) return

  const secure = window.location.protocol === 'https:' ? '; secure' : ''
  document.cookie = `${TRAFFIC_COOKIE}=${serializeTouch(touch)}; path=/; max-age=${TRAFFIC_MAX_AGE_SECONDS}; samesite=lax${secure}`
}

function readCookie(name: string): string | undefined {
  return document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1]
}
