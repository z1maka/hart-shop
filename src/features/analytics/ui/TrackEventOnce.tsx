'use client'

import { useEffect } from 'react'
import type { AnalyticsEvent } from '@/features/analytics/model/events'
import { trackEvent } from '@/features/analytics/services/track'

type TrackEventOnceProps = {
  readonly event: AnalyticsEvent
  // With a key the event fires once per browser, ever — a purchase reported on
  // every revisit of the order page would inflate revenue.
  readonly dedupeKey?: string
}

export function TrackEventOnce({ event, dedupeKey }: TrackEventOnceProps) {
  useEffect(() => {
    if (dedupeKey) {
      try {
        if (window.localStorage.getItem(dedupeKey)) return
        window.localStorage.setItem(dedupeKey, '1')
      } catch {
        // Blocked storage never blocks the event itself.
      }
    }

    trackEvent(event)
    // The event object is built fresh each render; firing is keyed by mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
