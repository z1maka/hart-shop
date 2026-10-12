import { describe, expect, it } from 'vitest'
import { PaymentStatus } from '@/features/checkout/model/payment'
import {
  canRecheck,
  MAX_RECHECKS,
  nextPollStep,
  parseRecheckAttempt,
  paymentReturnPath,
  readReturnToken,
  returnOutcomeOf,
  ReturnOutcome,
  returnPagePath,
  ReturnScreen,
  returnScreenOf,
} from '@/features/checkout/model/payment-return'

describe('returnOutcomeOf', () => {
  it('keeps a payment in progress apart from a failed one', () => {
    // Shown as a failure, a payment the bank is still confirming sends the
    // buyer to pay a second time.
    expect(returnOutcomeOf(PaymentStatus.Processing)).toBe(ReturnOutcome.Processing)
    expect(returnOutcomeOf(PaymentStatus.Failure)).toBe(ReturnOutcome.Unpaid)
  })

  it('reads every acquirer status', () => {
    expect(returnOutcomeOf(PaymentStatus.Success)).toBe(ReturnOutcome.Paid)
    expect(returnOutcomeOf(PaymentStatus.Expired)).toBe(ReturnOutcome.Expired)
    expect(returnOutcomeOf(PaymentStatus.Created)).toBe(ReturnOutcome.Unpaid)
    expect(returnOutcomeOf(PaymentStatus.Reversed)).toBe(ReturnOutcome.Unpaid)
  })
})

describe('return paths', () => {
  it('name the order by its token, not by its number', () => {
    expect(paymentReturnPath('abc_DEF-123')).toBe('/api/payments/return/?order=abc_DEF-123')
    expect(returnPagePath('abc_DEF-123')).toBe('/checkout/return/?order=abc_DEF-123')
  })

  it('carry the recheck count once rechecking has started', () => {
    expect(paymentReturnPath('token', 3)).toBe('/api/payments/return/?order=token&attempt=3')
    expect(returnPagePath('token', 0)).toBe('/checkout/return/?order=token')
  })
})

describe('parseRecheckAttempt', () => {
  it('reads the count from the query and never trusts it past the limit', () => {
    expect(parseRecheckAttempt('4')).toBe(4)
    expect(parseRecheckAttempt('9999')).toBe(MAX_RECHECKS)
  })

  it('starts from zero for anything else', () => {
    expect(parseRecheckAttempt(undefined)).toBe(0)
    expect(parseRecheckAttempt(['2'])).toBe(0)
    expect(parseRecheckAttempt('-3')).toBe(0)
    expect(parseRecheckAttempt('abc')).toBe(0)
  })
})

describe('canRecheck', () => {
  it('stops the page reloading once the limit is reached', () => {
    expect(canRecheck(0)).toBe(true)
    expect(canRecheck(MAX_RECHECKS - 1)).toBe(true)
    expect(canRecheck(MAX_RECHECKS)).toBe(false)
  })
})

describe('returnScreenOf', () => {
  it('keeps rechecking a payment in progress, then stops asking the buyer to wait', () => {
    expect(returnScreenOf(ReturnOutcome.Processing, 0)).toBe(ReturnScreen.Processing)
    expect(returnScreenOf(ReturnOutcome.Processing, MAX_RECHECKS)).toBe(ReturnScreen.Slow)
  })

  it('shows every settled outcome as it is', () => {
    expect(returnScreenOf(ReturnOutcome.Paid, MAX_RECHECKS)).toBe(ReturnScreen.Paid)
    expect(returnScreenOf(ReturnOutcome.Unpaid, 0)).toBe(ReturnScreen.Unpaid)
  })
})

const TOKEN = 'hRavQ9xfxQOgsEV0uRiBBoGa-Wzcsvdt'

describe('readReturnToken', () => {
  it('reads the order token the return URL carries', () => {
    expect(readReturnToken(TOKEN)).toBe(TOKEN)
  })

  it('drops parameters an acquirer glued onto the token', () => {
    expect(readReturnToken(`${TOKEN}?invoiceId=2410xyz`)).toBe(TOKEN)
    expect(readReturnToken(`${TOKEN}&status=success`)).toBe(TOKEN)
  })

  it('refuses anything that cannot be an access token', () => {
    expect(readReturnToken(null)).toBeNull()
    expect(readReturnToken([TOKEN])).toBeNull()
    expect(readReturnToken('FOX-2026')).toBeNull()
    expect(readReturnToken('../order/abc')).toBeNull()
  })
})

describe('nextPollStep', () => {
  it('sends a confirmed payment through the return route, which settles it', () => {
    expect(nextPollStep(ReturnOutcome.Paid, 3, TOKEN)).toEqual({
      isDone: true,
      path: `/api/payments/return/?order=${TOKEN}`,
    })
  })

  it('keeps waiting while the bank is processing', () => {
    expect(nextPollStep(ReturnOutcome.Processing, 3, TOKEN)).toEqual({ isDone: false })
  })

  it('stops after a minute of waiting and lets the page say so', () => {
    expect(nextPollStep(ReturnOutcome.Processing, MAX_RECHECKS, TOKEN)).toEqual({
      isDone: true,
      path: `/checkout/return/?order=${TOKEN}&attempt=${MAX_RECHECKS}`,
    })
  })

  it('hands any other settled answer back to the page', () => {
    expect(nextPollStep(ReturnOutcome.Unpaid, 2, TOKEN)).toEqual({
      isDone: true,
      path: `/checkout/return/?order=${TOKEN}&attempt=2`,
    })
  })
})
