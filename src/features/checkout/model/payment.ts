import type { Money } from '@/lib/money'

export const PaymentStatus = {
  Created: 'created',
  Processing: 'processing',
  Success: 'success',
  Failure: 'failure',
  Expired: 'expired',
  Reversed: 'reversed',
} as const

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

export type PaymentLine = {
  readonly name: string
  // The shop's own article number. Mono's basket requires a code per line —
  // it is what a fiscal receipt prints against the item.
  readonly code: string
  readonly quantity: number
  readonly unitPrice: Money
  readonly imageUrl: string | null
}

export type CreatePaymentInput = {
  readonly reference: string
  readonly amount: Money
  readonly lines: readonly PaymentLine[]
  readonly customerEmail: string | null
  readonly returnUrl: string
  readonly webhookUrl: string
}

export type PaymentSession = {
  readonly providerRef: string
  readonly redirectUrl: string
}

export type PaymentEvent = {
  readonly providerRef: string
  readonly reference: string | null
  readonly status: PaymentStatus
  readonly amount: Money | null
}

// The storefront never talks to a payment vendor directly: swapping provider is
// a new implementation of this contract, not a rewrite of checkout. The
// webhook path is site-relative and per vendor — they sign and acknowledge
// differently; the buyer comes back to one shared return route.
export type PaymentProvider = {
  readonly id: string
  readonly webhookPath: string
  createPayment(input: CreatePaymentInput): Promise<PaymentSession>
  getStatus(providerRef: string): Promise<PaymentStatus>
  verifyWebhook(rawBody: string, signature: string | null): Promise<PaymentEvent | null>
}
