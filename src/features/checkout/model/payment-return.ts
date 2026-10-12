import { PaymentStatus } from '@/features/checkout/model/payment'

// What the buyer is told on coming back from the acquirer's page. A payment
// still being processed is its own state: read as a failure, it sends the
// buyer to pay a second time.
export const ReturnOutcome = {
  Paid: 'paid',
  Processing: 'processing',
  Expired: 'expired',
  Unpaid: 'unpaid',
  Unknown: 'unknown',
} as const

export type ReturnOutcome = (typeof ReturnOutcome)[keyof typeof ReturnOutcome]

const OUTCOME_BY_STATUS: Record<PaymentStatus, ReturnOutcome> = {
  [PaymentStatus.Success]: ReturnOutcome.Paid,
  [PaymentStatus.Processing]: ReturnOutcome.Processing,
  [PaymentStatus.Expired]: ReturnOutcome.Expired,
  // The buyer left the payment page without paying, the bank declined, or
  // the charge was reversed: in every case the order waits for its money.
  [PaymentStatus.Created]: ReturnOutcome.Unpaid,
  [PaymentStatus.Failure]: ReturnOutcome.Unpaid,
  [PaymentStatus.Reversed]: ReturnOutcome.Unpaid,
}

export function returnOutcomeOf(status: PaymentStatus): ReturnOutcome {
  return OUTCOME_BY_STATUS[status]
}

// Both acquirers send the buyer here: mono with a GET, WayForPay with a POST.
// The order is named by its access token — unguessable, unlike the order
// number, which would let anyone walk through other buyers' orders.
export const PAYMENT_RETURN_PATH = '/api/payments/return/'
export const RETURN_PAGE_PATH = '/checkout/return/'

// A bank usually confirms within seconds; a minute of rechecks covers the slow
// cases without leaving the buyer on a page that reloads forever.
export const RECHECK_DELAY_SECONDS = 3
export const MAX_RECHECKS = 20

export function paymentReturnPath(accessToken: string, attempt = 0): string {
  return `${PAYMENT_RETURN_PATH}${returnQuery(accessToken, attempt)}`
}

export function returnPagePath(accessToken: string, attempt = 0): string {
  return `${RETURN_PAGE_PATH}${returnQuery(accessToken, attempt)}`
}

// An order access token is 24 random bytes in base64url.
const ACCESS_TOKEN = /^[\w-]{16,64}$/
const APPENDED_QUERY = /[?&#]/

// An acquirer that appends its own parameters by plain concatenation turns
// `?order=abc` into `?order=abc?invoiceId=…`; whatever follows the token is
// theirs, not part of it.
export function readReturnToken(raw: unknown): string | null {
  if (typeof raw !== 'string') return null

  const [token = ''] = raw.split(APPENDED_QUERY)
  return ACCESS_TOKEN.test(token) ? token : null
}

export function parseRecheckAttempt(raw: unknown): number {
  const attempt = typeof raw === 'string' ? Number.parseInt(raw, 10) : 0
  if (!Number.isFinite(attempt) || attempt < 0) return 0

  return Math.min(attempt, MAX_RECHECKS)
}

export function canRecheck(attempt: number): boolean {
  return attempt < MAX_RECHECKS
}

// What the return page shows. A payment the bank has not confirmed after a
// minute of rechecks gets its own screen: still no reason to pay again, but
// no point in reloading either.
export const ReturnScreen = {
  ...ReturnOutcome,
  Slow: 'slow',
} as const

export type ReturnScreen = (typeof ReturnScreen)[keyof typeof ReturnScreen]

export function returnScreenOf(outcome: ReturnOutcome, attempt: number): ReturnScreen {
  return outcome === ReturnOutcome.Processing && !canRecheck(attempt) ? ReturnScreen.Slow : outcome
}

// One poll of a waiting page: keep waiting, or leave — through the return
// route when the money arrived (it settles the order and ends the cart), back
// to the page for any other answer or once the minute of waiting is over.
export type PollStep = { readonly isDone: false } | { readonly isDone: true; readonly path: string }

export function nextPollStep(outcome: ReturnOutcome, checks: number, token: string): PollStep {
  if (outcome === ReturnOutcome.Paid) return { isDone: true, path: paymentReturnPath(token) }
  if (outcome !== ReturnOutcome.Processing || !canRecheck(checks)) {
    return { isDone: true, path: returnPagePath(token, checks) }
  }

  return { isDone: false }
}

function returnQuery(accessToken: string, attempt: number): string {
  const token = `?order=${encodeURIComponent(accessToken)}`
  return attempt > 0 ? `${token}&attempt=${attempt}` : token
}
