import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findByPaymentRef: vi.fn(),
  markPaid: vi.fn(),
  commitCart: vi.fn(),
  warn: vi.fn(),
}))

vi.mock('@/features/orders/repository/order-repository', () => ({
  orderRepository: { findByPaymentRef: mocks.findByPaymentRef, markPaid: mocks.markPaid },
}))
vi.mock('@/features/inventory', () => ({ inventoryService: { commitCart: mocks.commitCart } }))
vi.mock('@/features/cart/repository/cart-repository', () => ({ cartRepository: {} }))
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: mocks.warn, error: vi.fn() } }))

import { OrderStatus } from '@/db/enums'
import { orderService } from '@/features/orders/services/order-service'

const ORDER = {
  id: 'order-1',
  orderNumber: 'FOX-2026-000061',
  cartId: 'cart-1',
  status: OrderStatus.Pending,
  paidAt: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('orderService.markPaid', () => {
  it('pays a pending order and commits its stock', async () => {
    mocks.findByPaymentRef.mockResolvedValue(ORDER)
    mocks.markPaid.mockResolvedValue(true)

    const paid = await orderService.markPaid('FOX-2026-000061')

    expect(paid?.status).toBe(OrderStatus.Paid)
    expect(mocks.commitCart).toHaveBeenCalledWith('cart-1')
    expect(mocks.warn).not.toHaveBeenCalled()
  })

  it('pays an order a declined card cancelled before the buyer paid with another', async () => {
    mocks.findByPaymentRef.mockResolvedValue({ ...ORDER, status: OrderStatus.Cancelled })
    mocks.markPaid.mockResolvedValue(true)

    const paid = await orderService.markPaid('FOX-2026-000061')

    expect(paid?.status).toBe(OrderStatus.Paid)
    expect(mocks.warn).toHaveBeenCalledWith(
      'Payment arrived for a cancelled order; it is paid again',
      { orderNumber: 'FOX-2026-000061' },
    )
  })

  it('does nothing for an order already paid', async () => {
    mocks.findByPaymentRef.mockResolvedValue({ ...ORDER, status: OrderStatus.Paid })
    mocks.markPaid.mockResolvedValue(false)

    await expect(orderService.markPaid('FOX-2026-000061')).resolves.toBeNull()
    expect(mocks.commitCart).not.toHaveBeenCalled()
  })
})
