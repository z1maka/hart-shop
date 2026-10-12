import { describe, expect, it } from 'vitest'
import { monoStatusOf, wayforpayStatusOf } from '@/features/checkout/model/acquirer-status'
import { PaymentStatus } from '@/features/checkout/model/payment'

describe('wayforpayStatusOf', () => {
  it('reads an order nobody started paying as unpaid, not as in progress', () => {
    // A status check for an order with no transaction carries no status at
    // all; read as "processing" it told a buyer who backed out not to pay.
    expect(wayforpayStatusOf(undefined)).toBe(PaymentStatus.Created)
    expect(wayforpayStatusOf('')).toBe(PaymentStatus.Created)
  })

  it('maps the statuses WayForPay documents', () => {
    expect(wayforpayStatusOf('Approved')).toBe(PaymentStatus.Success)
    expect(wayforpayStatusOf('InProcessing')).toBe(PaymentStatus.Processing)
    expect(wayforpayStatusOf('Declined')).toBe(PaymentStatus.Failure)
    expect(wayforpayStatusOf('Expired')).toBe(PaymentStatus.Expired)
    expect(wayforpayStatusOf('Refunded')).toBe(PaymentStatus.Reversed)
  })

  it('keeps a status it has never seen in progress rather than failed', () => {
    expect(wayforpayStatusOf('SomethingNew')).toBe(PaymentStatus.Processing)
  })
})

describe('monoStatusOf', () => {
  it('maps the invoice statuses monobank documents', () => {
    expect(monoStatusOf('created')).toBe(PaymentStatus.Created)
    expect(monoStatusOf('hold')).toBe(PaymentStatus.Processing)
    expect(monoStatusOf('success')).toBe(PaymentStatus.Success)
    expect(monoStatusOf('failure')).toBe(PaymentStatus.Failure)
    expect(monoStatusOf('expired')).toBe(PaymentStatus.Expired)
    expect(monoStatusOf('reversed')).toBe(PaymentStatus.Reversed)
  })

  it('keeps a status it has never seen in progress rather than failed', () => {
    expect(monoStatusOf('something-new')).toBe(PaymentStatus.Processing)
  })
})
