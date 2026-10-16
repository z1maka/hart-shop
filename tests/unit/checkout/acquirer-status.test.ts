import { describe, expect, it } from 'vitest'
import { monoStatusOf } from '@/features/checkout/model/acquirer-status'
import { PaymentStatus } from '@/features/checkout/model/payment'

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
