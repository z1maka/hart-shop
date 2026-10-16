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

// A status we have never seen is treated as still in progress: telling the
// buyer the money did not go through, when it might have, invites a second
// charge.
export function monoStatusOf(raw: string): PaymentStatus {
  return MONO_STATUSES[raw] ?? PaymentStatus.Processing
}
