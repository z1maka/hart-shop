import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  cabinetServiceFor: vi.fn(),
  create: vi.fn(),
}))

vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('@/lib/env', () => ({ env: {} }))
vi.mock('@/lib/urls', () => ({ adminUrl: vi.fn() }))
vi.mock('@/features/orders/services/order-telegram', () => ({ orderTelegram: {} }))
vi.mock('@/features/orders/repository/order-repository', () => ({
  orderRepository: { findById: mocks.findById },
}))
vi.mock('@/features/shipping', () => ({
  cabinetServiceFor: mocks.cabinetServiceFor,
  carrierAccounts: {},
  pickupDirectoryFor: vi.fn(),
  waybillServiceFor: vi.fn(),
}))

import { orderShipmentService } from '@/features/orders/services/order-shipment-service'

const ORDER = {
  id: 'order-1',
  orderNumber: 'FOX-2026-000012',
  status: 'paid',
  paymentRoute: 'cod',
  carrier: 'nova_post',
  carrierDocumentRef: null,
  deliveryKind: 'branch',
  pickupPointRef: 'point-1',
  pickupPointLabel: 'Львів, відділення №12',
  totalCents: 305000,
  shippingAddress: {
    fullName: 'Іван Коваль',
    line1: '',
    city: 'Львів',
    country: 'UA',
    phone: '+380631234567',
  },
}

const PARCEL = { weightGrams: 2200, description: 'Одяг' }

function cabinet(overrides: Record<string, unknown>) {
  return {
    service: { isConfigured: () => true, create: mocks.create },
    account: { id: 'cabinet-2', isActive: true, ...overrides },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.findById.mockResolvedValue(ORDER)
})

describe('issuing a waybill from a picked cabinet', () => {
  it('refuses a cabinet switched off since the page loaded', async () => {
    mocks.cabinetServiceFor.mockResolvedValue(cabinet({ isActive: false }))

    await expect(
      orderShipmentService.issueWaybill('order-1', PARCEL, {
        issuedBy: 'admin@fox',
        accountId: 'cabinet-2',
      }),
    ).rejects.toMatchObject({ code: 'CARRIER_ACCOUNT_UNAVAILABLE' })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('refuses when another cabinet would answer for the picked one', async () => {
    // A deleted cabinet resolves to the default: its sender would be printed.
    mocks.cabinetServiceFor.mockResolvedValue(cabinet({ id: 'cabinet-1' }))

    await expect(
      orderShipmentService.issueWaybill('order-1', PARCEL, {
        issuedBy: 'admin@fox',
        accountId: 'cabinet-2',
      }),
    ).rejects.toMatchObject({ code: 'CARRIER_ACCOUNT_UNAVAILABLE' })
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
