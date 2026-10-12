import { PaymentStatus } from '@/features/checkout/model/payment'

// https://api.monobank.ua/docs/acquiring.html — invoice statuses.
const MONO_STATUSES: Readonly<Record<string, PaymentStatus>> = {
  created: PaymentStatus.Created,
  processing: PaymentStatus.Processing,
  hold: PaymentStatus.Processing,
  success: PaymentStatus.Success,
  failure: PaymentStatus.Failure,
  expired: PaymentStatus.Expired,
  reversed: PaymentStatus.Reversed,
}

// https://wiki.wayforpay.com — transactionStatus values.
const WAYFORPAY_STATUSES: Readonly<Record<string, PaymentStatus>> = {
  Created: PaymentStatus.Created,
  InProcessing: PaymentStatus.Processing,
  WaitingAuthComplete: PaymentStatus.Processing,
  Pending: PaymentStatus.Processing,
  Approved: PaymentStatus.Success,
  Declined: PaymentStatus.Failure,
  Expired: PaymentStatus.Expired,
  Refunded: PaymentStatus.Reversed,
  Voided: PaymentStatus.Reversed,
  RefundInProcessing: PaymentStatus.Reversed,
}

// A status we have never seen is treated as still in progress: telling the
// buyer the money did not go through, when it might have, invites a second
// charge.
export function monoStatusOf(raw: string): PaymentStatus {
  return MONO_STATUSES[raw] ?? PaymentStatus.Processing
}

// WayForPay answers a status check for an order nobody has started paying
// without any transactionStatus: there is no transaction yet, so the buyer
// left the payment page without paying — not a payment in progress.
export function wayforpayStatusOf(raw: string | undefined): PaymentStatus {
  if (!raw) return PaymentStatus.Created

  return WAYFORPAY_STATUSES[raw] ?? PaymentStatus.Processing
}
