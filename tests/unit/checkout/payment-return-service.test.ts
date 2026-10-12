import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findByAccessToken: vi.fn(),
  processPaymentEvent: vi.fn(),
  getStatus: vi.fn(),
}))

vi.mock('@/features/orders', () => ({
  orderRepository: { findByAccessToken: mocks.findByAccessToken },
}))
vi.mock('@/features/checkout/services/payment-events', () => ({
  processPaymentEvent: mocks.processPaymentEvent,
}))
vi.mock('@/features/checkout/services/payment-provider', () => ({
  paymentProviderById: () => ({ id: 'mono', getStatus: mocks.getStatus }),
}))

import { PaymentStatus } from '@/features/checkout/model/payment'
import { ReturnOutcome } from '@/features/checkout/model/payment-return'
import { paymentReturnService } from '@/features/checkout/services/payment-return'

const TOKEN = 'hRavQ9xfxQOgsEV0uRiBBoGa-Wzcsvdt'

function cardOrder(overrides: Record<string, unknown> = {}) {
  return {
    orderNumber: 'FOX-2026-000012',
    accessToken: TOKEN,
    totalCents: 305000,
    paidAt: null,
    paymentRef: 'invoice-1',
    paymentProvider: 'mono',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('paymentReturnService.complete', () => {
  it('settles a confirmed payment and sends the buyer to their order', async () => {
    mocks.findByAccessToken.mockResolvedValue(cardOrder())
    mocks.getStatus.mockResolvedValue(PaymentStatus.Success)

    await expect(paymentReturnService.complete(TOKEN, 0)).resolves.toEqual({
      path: `/order/${TOKEN}/`,
      isPaid: true,
    })
    expect(mocks.processPaymentEvent).toHaveBeenCalledWith('mono', {
      providerRef: 'invoice-1',
      reference: 'FOX-2026-000012',
      status: PaymentStatus.Success,
      amount: null,
    })
  })

  it('does not ask the acquirer about an order the webhook already paid', async () => {
    mocks.findByAccessToken.mockResolvedValue(cardOrder({ paidAt: new Date() }))

    const destination = await paymentReturnService.complete(TOKEN, 0)

    expect(destination.isPaid).toBe(true)
    expect(mocks.getStatus).not.toHaveBeenCalled()
    expect(mocks.processPaymentEvent).not.toHaveBeenCalled()
  })

  it('keeps the cart and shows the page while the bank is processing', async () => {
    mocks.findByAccessToken.mockResolvedValue(cardOrder())
    mocks.getStatus.mockResolvedValue(PaymentStatus.Processing)

    await expect(paymentReturnService.complete(TOKEN, 3)).resolves.toEqual({
      path: `/checkout/return/?order=${TOKEN}&attempt=3`,
      isPaid: false,
    })
    expect(mocks.processPaymentEvent).not.toHaveBeenCalled()
  })

  it('falls back to the page when settling fails, rather than claiming success', async () => {
    mocks.findByAccessToken.mockResolvedValue(cardOrder())
    mocks.getStatus.mockResolvedValue(PaymentStatus.Success)
    mocks.processPaymentEvent.mockRejectedValue(new Error('database went away'))

    const destination = await paymentReturnService.complete(TOKEN, 0)

    expect(destination).toEqual({ path: `/checkout/return/?order=${TOKEN}`, isPaid: false })
  })
})

describe('paymentReturnService.describe', () => {
  it('reads an acquirer that does not answer as a payment still being confirmed', async () => {
    mocks.findByAccessToken.mockResolvedValue(cardOrder())
    mocks.getStatus.mockRejectedValue(new Error('timeout'))

    const view = await paymentReturnService.describe(TOKEN)

    expect(view.outcome).toBe(ReturnOutcome.Processing)
    expect(view.order?.number).toBe('FOX-2026-000012')
  })

  it('names no order for one that never went to an acquirer', async () => {
    mocks.findByAccessToken.mockResolvedValue(cardOrder({ paymentRef: null }))

    await expect(paymentReturnService.describe(TOKEN)).resolves.toEqual({
      outcome: ReturnOutcome.Unknown,
      order: null,
    })
  })
})

describe('paymentReturnService.check', () => {
  it('answers unknown for a token that names no order', async () => {
    mocks.findByAccessToken.mockResolvedValue(null)

    await expect(paymentReturnService.check(TOKEN)).resolves.toBe(ReturnOutcome.Unknown)
  })

  it('reports the acquirer’s answer without settling anything', async () => {
    mocks.findByAccessToken.mockResolvedValue(cardOrder())
    mocks.getStatus.mockResolvedValue(PaymentStatus.Failure)

    await expect(paymentReturnService.check(TOKEN)).resolves.toBe(ReturnOutcome.Unpaid)
    expect(mocks.processPaymentEvent).not.toHaveBeenCalled()
  })
})
