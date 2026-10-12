import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  release: vi.fn(),
  markPaid: vi.fn(),
  cancel: vi.fn(),
  clearCart: vi.fn(),
}))

vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('@/features/checkout/repository/payment-event-repository', () => ({
  paymentEventRepository: { claim: mocks.claim, release: mocks.release },
}))
vi.mock('@/features/orders/services/order-service', () => ({
  orderService: { markPaid: mocks.markPaid, cancel: mocks.cancel, carrierName: vi.fn() },
}))
vi.mock('@/features/cart/services/cart-service', () => ({
  cartService: { clearCart: mocks.clearCart },
}))
vi.mock('@/features/orders/services/order-mail', () => ({ orderMail: {} }))
vi.mock('@/features/orders/services/order-sms', () => ({ orderSms: {} }))
vi.mock('@/features/orders/services/order-telegram', () => ({ orderTelegram: {} }))
vi.mock('@/features/orders/repository/order-repository', () => ({ orderRepository: {} }))

import { PaymentStatus } from '@/features/checkout/model/payment'
import { processPaymentEvent } from '@/features/checkout/services/payment-events'

const SUCCESS = {
  providerRef: 'invoice-1',
  reference: 'FOX-2026-000012',
  status: PaymentStatus.Success,
  amount: null,
}

const PAID_ORDER = {
  id: 'order-1',
  orderNumber: 'FOX-2026-000012',
  totalCents: 305000,
  cartId: 'cart-1',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.claim.mockResolvedValue(true)
})

describe('processPaymentEvent', () => {
  it('handles an event it has already handled exactly once', async () => {
    mocks.claim.mockResolvedValue(false)

    await expect(processPaymentEvent('mono', SUCCESS)).resolves.toBe('duplicate')
    expect(mocks.markPaid).not.toHaveBeenCalled()
  })

  it('marks the order paid and empties its cart', async () => {
    mocks.markPaid.mockResolvedValue(PAID_ORDER)

    await expect(processPaymentEvent('mono', SUCCESS)).resolves.toBe('paid')
    expect(mocks.clearCart).toHaveBeenCalledWith('cart-1')
  })

  it('gives the event back when the order could not be updated', async () => {
    // Left claimed, every retry would be a duplicate and the paid order
    // would wait forever.
    mocks.markPaid.mockRejectedValue(new Error('database went away'))

    await expect(processPaymentEvent('mono', SUCCESS)).rejects.toThrow('database went away')
    expect(mocks.release).toHaveBeenCalledWith('invoice-1:success')
  })

  it('keeps the payment when only the cart fails to empty', async () => {
    mocks.markPaid.mockResolvedValue(PAID_ORDER)
    mocks.clearCart.mockRejectedValue(new Error('cart table locked'))

    await expect(processPaymentEvent('mono', SUCCESS)).resolves.toBe('paid')
    expect(mocks.release).not.toHaveBeenCalled()
  })

  it('cancels the order when the acquirer reports a failure', async () => {
    await expect(
      processPaymentEvent('mono', { ...SUCCESS, status: PaymentStatus.Failure }),
    ).resolves.toBe('cancelled')
    expect(mocks.cancel).toHaveBeenCalledWith('invoice-1')
  })
})
