// When the analytics and ad tags run. The engine supports both; the market
// picks one.
export const ConsentPolicy = {
  // Nothing loads until the visitor says yes (the EU storefront, ePrivacy).
  OptIn: 'opt-in',
  // Tags run for every visitor and stop only for one who refuses.
  OptOut: 'opt-out',
} as const

export type ConsentPolicy = (typeof ConsentPolicy)[keyof typeof ConsentPolicy]

// Owner's decision (24.09.2026): the Ads tag and the Meta Pixel run for every
// visitor, with their identifiers, as they did on WordPress — waiting for a
// yes left most purchases out of the Ads conversions. A visitor who presses
// «Лише необхідні» is not tracked.
export const CONSENT_POLICY: ConsentPolicy = ConsentPolicy.OptOut
