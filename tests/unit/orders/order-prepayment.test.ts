import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  setPrepaid: vi.fn(),
  attachWaybill: vi.fn(),
  cabinetServiceFor: vi.fn(),
  updateCod: vi.fn(),
  create: vi.fn(),
  logError: vi.fn(),
}))

vi.mock('next/server', () => ({ after: vi.fn() }))
vi.mock('@/lib/env', () => ({ env: {} }))
vi.mock('@/lib/urls', () => ({ adminUrl: vi.fn() }))
vi.mock('@/lib/logger', () => ({ logger: { error: mocks.logError, info: vi.fn() } }))
vi.mock('@/features/orders/services/order-telegram', () => ({ orderTelegram: {} }))
vi.mock('@/features/orders/repository/order-repository', () => ({
  orderRepository: {
    findById: mocks.findById,
    setPrepaid: mocks.setPrepaid,
    attachWaybill: mocks.attachWaybill,
  },
}))
vi.mock('@/features/shipping', () => ({
  cabinetServiceFor: mocks.cabinetServiceFor,
  carrierAccounts: {},
  pickupDirectoryFor: vi.fn(),
  waybillServiceFor: vi.fn(),
}))

import { orderShipmentService } from '@/features/orders/services/order-shipment-service'

const CREATED_AT = new Date('2026-10-26T08:20:00Z')

const ISSUED_ORDER = {
  id: 'order-1',
  status: 'packed',
  paymentRoute: 'cod',
  carrier: 'nova_post',
  carrierAccountId: 'cabinet-1',
  carrierDocumentRef: 'doc-1',
  totalCents: 4_200_000,
  prepaidCents: 0,
  createdAt: CREATED_AT,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.findById.mockResolvedValue(ISSUED_ORDER)
  mocks.setPrepaid.mockResolvedValue(true)
  mocks.cabinetServiceFor.mockResolvedValue({ service: { updateCod: mocks.updateCod } })
})

describe('changing the prepayment under a written waybill', () => {
  it('lowers the cash on delivery of the waybill, then saves the order', async () => {
    await orderShipmentService.setPrepayment('order-1', 100_000)

    expect(mocks.cabinetServiceFor).toHaveBeenCalledWith('nova_post', 'cabinet-1')
    expect(mocks.updateCod).toHaveBeenCalledWith('doc-1', 4_100_000, CREATED_AT)
    expect(mocks.setPrepaid).toHaveBeenCalledWith('order-1', {
      prepaidCents: 100_000,
      previousPrepaidCents: 0,
      carrierDocumentRef: 'doc-1',
    })
  })

  it('leaves the carrier alone when the amount did not change', async () => {
    mocks.findById.mockResolvedValue({ ...ISSUED_ORDER, prepaidCents: 100_000 })

    await orderShipmentService.setPrepayment('order-1', 100_000)

    expect(mocks.updateCod).not.toHaveBeenCalled()
    expect(mocks.setPrepaid).not.toHaveBeenCalled()
  })

  it('needs a written waybill: before it the issue form takes the prepayment', async () => {
    mocks.findById.mockResolvedValue({ ...ISSUED_ORDER, carrierDocumentRef: null })

    await expect(orderShipmentService.setPrepayment('order-1', 100_000)).rejects.toMatchObject({
      code: 'WAYBILL_MISSING',
    })
    expect(mocks.updateCod).not.toHaveBeenCalled()
  })

  it('refuses an order paid another way', async () => {
    mocks.findById.mockResolvedValue({ ...ISSUED_ORDER, paymentRoute: 'card' })

    await expect(orderShipmentService.setPrepayment('order-1', 100_000)).rejects.toMatchObject({
      code: 'PREPAYMENT_NOT_COD',
    })
    expect(mocks.updateCod).not.toHaveBeenCalled()
  })

  it('refuses a prepayment that covers the whole order', async () => {
    await expect(orderShipmentService.setPrepayment('order-1', 4_200_000)).rejects.toMatchObject({
      code: 'PREPAYMENT_COVERS_TOTAL',
    })
    expect(mocks.updateCod).not.toHaveBeenCalled()
  })

  it('refuses an order already sent', async () => {
    mocks.findById.mockResolvedValue({ ...ISSUED_ORDER, status: 'shipped' })

    await expect(orderShipmentService.setPrepayment('order-1', 100_000)).rejects.toMatchObject({
      code: 'WAYBILL_ORDER_CLOSED',
    })
    expect(mocks.updateCod).not.toHaveBeenCalled()
  })

  it('reports another save that changed the prepayment first', async () => {
    mocks.setPrepaid.mockResolvedValue(false)
    mocks.findById
      .mockResolvedValueOnce(ISSUED_ORDER)
      .mockResolvedValueOnce({ ...ISSUED_ORDER, prepaidCents: 200_000 })

    await expect(orderShipmentService.setPrepayment('order-1', 100_000)).rejects.toMatchObject({
      code: 'PREPAYMENT_CHANGED',
    })
    expect(mocks.logError).toHaveBeenCalled()
  })

  it('reports a waybill removed while the carrier was answering', async () => {
    mocks.setPrepaid.mockResolvedValue(false)
    mocks.findById
      .mockResolvedValueOnce(ISSUED_ORDER)
      .mockResolvedValueOnce({ ...ISSUED_ORDER, carrierDocumentRef: null })

    await expect(orderShipmentService.setPrepayment('order-1', 100_000)).rejects.toMatchObject({
      code: 'WAYBILL_MISSING',
    })
  })

  it('logs the mismatch when the database fails after the carrier took the amount', async () => {
    mocks.setPrepaid.mockRejectedValue(new Error('connection lost'))

    await expect(orderShipmentService.setPrepayment('order-1', 100_000)).rejects.toThrow(
      'connection lost',
    )
    expect(mocks.logError).toHaveBeenCalledWith(
      'Waybill took the new cash-on-delivery amount, the order did not',
      expect.objectContaining({ orderId: 'order-1', prepaidCents: 100_000 }),
    )
  })
})

describe('typing the prepayment on the issue form', () => {
  const OPEN_ORDER = {
    ...ISSUED_ORDER,
    orderNumber: 'HART-2026-000019',
    status: 'pending',
    carrierDocumentRef: null,
    deliveryKind: 'branch',
    pickupPointRef: 'point-1',
    pickupPointLabel: 'Київ, відділення №1',
    shippingAddress: {
      fullName: 'Іван Коваль',
      line1: '',
      city: 'Київ',
      country: 'UA',
      phone: '+380631234567',
    },
  }
  const PARCEL = { weightGrams: 21_000, description: 'Пончо' }

  beforeEach(() => {
    mocks.findById.mockResolvedValue(OPEN_ORDER)
    mocks.attachWaybill.mockResolvedValue(true)
    mocks.create.mockResolvedValue({ ref: 'doc-1', number: '20451570452417', trackingUrl: 'url' })
    mocks.cabinetServiceFor.mockResolvedValue({
      service: { isConfigured: () => true, create: mocks.create },
      account: null,
    })
  })

  it('writes the waybill with the rest to collect and saves the prepayment with it', async () => {
    await orderShipmentService.issueWaybill('order-1', PARCEL, {
      issuedBy: 'admin@hart',
      prepaidCents: 100_000,
    })

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ codCents: 4_100_000, declaredValueCents: 4_200_000 }),
    )
    expect(mocks.attachWaybill).toHaveBeenCalledWith(
      'order-1',
      expect.objectContaining({ carrierDocumentRef: 'doc-1', prepaidCents: 100_000 }),
      expect.anything(),
    )
  })

  it('keeps the saved prepayment when none is typed', async () => {
    mocks.findById.mockResolvedValue({ ...OPEN_ORDER, prepaidCents: 50_000 })

    await orderShipmentService.issueWaybill('order-1', PARCEL, { issuedBy: 'admin@hart' })

    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ codCents: 4_150_000 }))
  })

  it('refuses a typed prepayment that covers the order before writing anything', async () => {
    await expect(
      orderShipmentService.issueWaybill('order-1', PARCEL, {
        issuedBy: 'admin@hart',
        prepaidCents: 4_200_000,
      }),
    ).rejects.toMatchObject({ code: 'PREPAYMENT_COVERS_TOTAL' })
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
