import { describe, expect, it } from 'vitest'
import { OrderStatus, PaymentRoute, SalesChannel } from '@/db/enums'
import {
  PaymentSwitchBlock,
  paymentSwitchBlockOf,
  paymentSwitchTargetOf,
  statusAfterSwitch,
} from '@/features/orders/model/payment-switch'

const OPEN_COD_ORDER = {
  status: OrderStatus.Pending,
  paymentRoute: PaymentRoute.CashOnDelivery,
  paidAt: null,
  carrierDocumentRef: null,
  trackingNumber: null,
  channel: SalesChannel.Site,
}

describe('paymentSwitchBlockOf', () => {
  it('lets an open site order change how it is paid', () => {
    expect(paymentSwitchBlockOf(OPEN_COD_ORDER)).toBeNull()
    expect(
      paymentSwitchBlockOf({ ...OPEN_COD_ORDER, paymentRoute: PaymentRoute.BankTransfer }),
    ).toBeNull()
  })

  it('keeps a partner order on its invoice', () => {
    expect(paymentSwitchBlockOf({ ...OPEN_COD_ORDER, channel: SalesChannel.Dropship })).toBe(
      PaymentSwitchBlock.Partner,
    )
  })

  it('refuses once a waybill carries the sum, the money came or the order left', () => {
    expect(paymentSwitchBlockOf({ ...OPEN_COD_ORDER, trackingNumber: '20451234567890' })).toBe(
      PaymentSwitchBlock.Waybill,
    )
    expect(
      paymentSwitchBlockOf({
        ...OPEN_COD_ORDER,
        paymentRoute: PaymentRoute.BankTransfer,
        paidAt: new Date(),
      }),
    ).toBe(PaymentSwitchBlock.Paid)
    expect(paymentSwitchBlockOf({ ...OPEN_COD_ORDER, status: OrderStatus.Shipped })).toBe(
      PaymentSwitchBlock.Closed,
    )
    expect(paymentSwitchBlockOf({ ...OPEN_COD_ORDER, paymentRoute: PaymentRoute.Card })).toBe(
      PaymentSwitchBlock.Card,
    )
  })
})

describe('paymentSwitchTargetOf', () => {
  it('swaps cash on delivery and a transfer, never a card', () => {
    expect(paymentSwitchTargetOf(PaymentRoute.CashOnDelivery)).toBe(PaymentRoute.BankTransfer)
    expect(paymentSwitchTargetOf(PaymentRoute.BankTransfer)).toBe(PaymentRoute.CashOnDelivery)
    expect(paymentSwitchTargetOf(PaymentRoute.Card)).toBeNull()
  })
})

describe('statusAfterSwitch', () => {
  it('sends a packed cash-on-delivery order back to awaiting the transfer', () => {
    expect(statusAfterSwitch(OrderStatus.Packed, PaymentRoute.BankTransfer)).toBe(
      OrderStatus.Pending,
    )
  })

  it('keeps the status otherwise', () => {
    expect(statusAfterSwitch(OrderStatus.Pending, PaymentRoute.BankTransfer)).toBe(
      OrderStatus.Pending,
    )
    expect(statusAfterSwitch(OrderStatus.Pending, PaymentRoute.CashOnDelivery)).toBe(
      OrderStatus.Pending,
    )
  })
})
