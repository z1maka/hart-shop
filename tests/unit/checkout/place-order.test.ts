import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as BankAccountModelModule from '@/features/billing/model/bank-account'

type BankAccountModel = typeof BankAccountModelModule

const mocks = vi.hoisted(() => ({
  activeAccount: vi.fn(),
  getSummary: vi.fn(),
  clearCart: vi.fn(),
  reserveCart: vi.fn(),
  commitCart: vi.fn(),
  releaseCart: vi.fn(),
  createPendingOrder: vi.fn(),
  abandon: vi.fn(),
}))

vi.mock('@/features/billing', async () => {
  const model = await vi.importActual<BankAccountModel>('@/features/billing/model/bank-account')
  return {
    bankAccountService: { active: mocks.activeAccount },
    requisitesSnapshot: model.requisitesSnapshot,
  }
})
vi.mock('@/features/cart/services/cart-service', () => ({
  cartService: { getSummary: mocks.getSummary, clearCart: mocks.clearCart },
}))
vi.mock('@/features/inventory', () => ({
  inventoryService: {
    reserveCart: mocks.reserveCart,
    commitCart: mocks.commitCart,
    releaseCart: mocks.releaseCart,
  },
}))
vi.mock('@/features/orders/services/order-service', () => ({
  orderService: {
    createPendingOrder: mocks.createPendingOrder,
    abandon: mocks.abandon,
    carrierName: () => 'Нова Пошта',
  },
}))
vi.mock('@/features/orders/services/order-mail', () => ({
  orderMail: { sendConfirmation: vi.fn(), sendShopNotification: vi.fn() },
}))
vi.mock('@/features/orders/services/order-sms', () => ({ orderSms: { sendOrderPlaced: vi.fn() } }))
vi.mock('@/features/orders/services/order-telegram', () => ({
  orderTelegram: { sendNewOrder: vi.fn() },
}))
vi.mock('@/features/orders/repository/order-repository', () => ({
  orderRepository: { findItems: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/features/checkout/services/payment-provider', () => ({
  paymentProviderById: vi.fn(),
  activePaymentProvider: vi.fn(() => ({ id: 'mono' })),
}))
vi.mock('@/lib/storage', () => ({ publicUrl: vi.fn() }))

import { Carrier, ContactPreference, DeliveryKind, PaymentRoute } from '@/db/enums'
import { checkoutService } from '@/features/checkout/services/create-session'

const ACCOUNT = {
  id: 'account-1',
  isActive: true,
  name: 'Основной счёт',
  recipient: 'ФОП Косенко Микола Степанович',
  iban: 'UA173220010000026005340071625',
  taxId: '3251211798',
  bankName: 'АТ «УНІВЕРСАЛ БАНК»',
  bankEdrpou: '21133352',
}

function placeOrder(paymentRoute: PaymentRoute) {
  return checkoutService.placeOrder({
    cartId: 'cart-1',
    email: null,
    carrier: Carrier.NovaPost,
    deliveryKind: DeliveryKind.Branch,
    paymentRoute,
    cardProvider: null,
    address: { fullName: 'Іван Коваль', line1: '', city: 'Львів', phone: '+380631234567' },
    pickupPoint: { ref: 'point-1', label: 'Львів, відділення №12' },
    customerNote: 'Передзвоніть після 18:00',
    contactPreference: ContactPreference.Viber,
    callbackOrigin: 'https://fox-armor-ua.vercel.app',
    traffic: { source: 'google_ads', detail: null },
    googleClickId: 'CjwKCAjwl4HXBhAjEiwAHlpWhNjyMOWk',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getSummary.mockResolvedValue({ items: [{ sku: 'FX-1' }] })
  mocks.createPendingOrder.mockResolvedValue({
    id: 'order-1',
    orderNumber: 'FOX-2026-000012',
    accessToken: 'token-1',
    carrier: Carrier.NovaPost,
  })
})

describe('checkoutService.placeOrder — paying by transfer', () => {
  it('keeps the active account on the order, without the row it came from', async () => {
    mocks.activeAccount.mockResolvedValue(ACCOUNT)

    await expect(placeOrder(PaymentRoute.BankTransfer)).resolves.toEqual({
      redirectUrl: '/order/token-1/',
    })
    const { id: _id, isActive: _isActive, ...snapshot } = ACCOUNT
    expect(mocks.createPendingOrder).toHaveBeenCalledWith(
      expect.objectContaining({ bankRequisites: snapshot }),
    )
  })

  it('refuses the order before touching stock when there is no account to pay to', async () => {
    mocks.activeAccount.mockResolvedValue(null)

    await expect(placeOrder(PaymentRoute.BankTransfer)).rejects.toMatchObject({
      code: 'PAYMENT_ROUTE_UNAVAILABLE',
    })
    expect(mocks.reserveCart).not.toHaveBeenCalled()
    expect(mocks.createPendingOrder).not.toHaveBeenCalled()
  })

  it('keeps the channel the shopper came from on the order', async () => {
    await placeOrder(PaymentRoute.CashOnDelivery)

    expect(mocks.createPendingOrder).toHaveBeenCalledWith(
      expect.objectContaining({ traffic: { source: 'google_ads', detail: null } }),
    )
  })

  it('keeps the Google Ads click on the order for the sale upload', async () => {
    await placeOrder(PaymentRoute.CashOnDelivery)

    expect(mocks.createPendingOrder).toHaveBeenCalledWith(
      expect.objectContaining({ googleClickId: 'CjwKCAjwl4HXBhAjEiwAHlpWhNjyMOWk' }),
    )
  })

  it("keeps the buyer's note on the order", async () => {
    await placeOrder(PaymentRoute.CashOnDelivery)

    expect(mocks.createPendingOrder).toHaveBeenCalledWith(
      expect.objectContaining({ customerNote: 'Передзвоніть після 18:00' }),
    )
  })

  it('keeps how the buyer wants the order confirmed', async () => {
    await placeOrder(PaymentRoute.CashOnDelivery)

    expect(mocks.createPendingOrder).toHaveBeenCalledWith(
      expect.objectContaining({ contactPreference: ContactPreference.Viber }),
    )
  })

  it('keeps no account on an order paid any other way', async () => {
    await placeOrder(PaymentRoute.CashOnDelivery)

    expect(mocks.activeAccount).not.toHaveBeenCalled()
    expect(mocks.createPendingOrder).toHaveBeenCalledWith(
      expect.objectContaining({ bankRequisites: null }),
    )
  })
})
