'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { CONSENT_POLICY } from '@/config/consent'
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  ConsentState,
  parseConsent,
  shouldLoadTags,
} from '@/features/analytics/model/consent'
import { TRAFFIC_COOKIE } from '@/features/analytics/model/traffic-source'

type ConsentApi = {
  readonly state: ConsentState
  // False until the stored answer has been read in the browser. The server
  // cannot know it, and a tag rendered on a guess would already have run for
  // a visitor who said no.
  readonly isResolved: boolean
  readonly accept: () => void
  readonly reject: () => void
}

let snapshot: ConsentState | null = null
const listeners = new Set<() => void>()

function readStored(): ConsentState {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`))
  const fromCookie = parseConsent(match?.[1])
  if (fromCookie !== ConsentState.Unknown) return fromCookie

  // Cookies get cleared more often than site data; the localStorage copy keeps
  // the banner from reappearing every time that happens.
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_COOKIE) ?? undefined)
  } catch {
    return ConsentState.Unknown
  }
}

// Read once, on the first client render after hydration; cached after, as
// useSyncExternalStore requires a stable value between changes.
function getSnapshot(): ConsentState {
  if (snapshot === null) snapshot = readStored()
  return snapshot
}

function getServerSnapshot(): null {
  return null
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function publish(next: ConsentState): void {
  snapshot = next
  document.cookie = `${CONSENT_COOKIE}=${next}; path=/; max-age=${CONSENT_MAX_AGE_SECONDS}; samesite=lax`
  // A visitor who refuses is not kept as anyone's traffic either.
  if (!shouldLoadTags(next, CONSENT_POLICY)) {
    document.cookie = `${TRAFFIC_COOKIE}=; path=/; max-age=0; samesite=lax`
  }
  try {
    window.localStorage.setItem(CONSENT_COOKIE, next)
  } catch {
    // Storage can be blocked (private mode); the cookie alone still works.
  }
  listeners.forEach((listener) => listener())
}

export function useConsent(): ConsentApi {
  const stored = useSyncExternalStore<ConsentState | null>(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )

  const accept = useCallback(() => publish(ConsentState.Granted), [])
  // Tags already on the page keep running until it reloads, so a refusal that
  // stops them reloads it; the answer then holds from the next page on.
  const reject = useCallback(() => {
    const wereRunning = snapshot !== null && shouldLoadTags(snapshot, CONSENT_POLICY)
    publish(ConsentState.Denied)
    if (wereRunning) window.location.reload()
  }, [])

  return {
    state: stored ?? ConsentState.Unknown,
    isResolved: stored !== null,
    accept,
    reject,
  }
}
