import { ConsentPolicy } from '@/config/consent'

export const ConsentState = {
  Unknown: 'unknown',
  Granted: 'granted',
  Denied: 'denied',
} as const

export type ConsentState = (typeof ConsentState)[keyof typeof ConsentState]

export const CONSENT_COOKIE = 'fox_consent'
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180

export function parseConsent(value: string | undefined): ConsentState {
  if (value === ConsentState.Granted) return ConsentState.Granted
  if (value === ConsentState.Denied) return ConsentState.Denied
  return ConsentState.Unknown
}

// Whether the analytics and ad tags may run for a visitor in this state.
export function shouldLoadTags(state: ConsentState, policy: ConsentPolicy): boolean {
  return policy === ConsentPolicy.OptOut
    ? state !== ConsentState.Denied
    : state === ConsentState.Granted
}
