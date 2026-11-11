// The shapes Google's Data Manager API takes, apart from its transport
// (lib/google-data-manager.ts): a pure model builds an event from these
// without loading the environment the transport reads.

// Google's own spelling of a consent answer.
export const DataManagerConsent = {
  Granted: 'CONSENT_GRANTED',
  Denied: 'CONSENT_DENIED',
} as const
export type DataManagerConsent = (typeof DataManagerConsent)[keyof typeof DataManagerConsent]

export const DataManagerEventSource = {
  Web: 'WEB',
} as const
export type DataManagerEventSource =
  (typeof DataManagerEventSource)[keyof typeof DataManagerEventSource]

// One conversion as events:ingest takes it.
export type DataManagerConversionEvent = {
  readonly adIdentifiers: Readonly<Partial<Record<'gclid' | 'gbraid' | 'wbraid', string>>>
  // RFC 3339, with its offset.
  readonly eventTimestamp: string
  readonly transactionId: string
  readonly conversionValue: number
  readonly currency: string
  readonly eventSource: DataManagerEventSource
  readonly consent: {
    readonly adUserData: DataManagerConsent
    readonly adPersonalization: DataManagerConsent
  }
}
