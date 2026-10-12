import { describe, expect, it } from 'vitest'
import { OrderStatus, PaymentRoute } from '@/db/enums'
import {
  allowedNextStatuses,
  canTransition,
  recordsPayment,
} from '@/features/orders/model/status-flow'

describe('order status flow', () => {
  it('moves fulfilment forward', () => {
    expect(canTransition(OrderStatus.Pending, OrderStatus.Paid)).toBe(true)
    expect(canTransition(OrderStatus.Paid, OrderStatus.Packed)).toBe(true)
    expect(canTransition(OrderStatus.Packed, OrderStatus.Shipped)).toBe(true)
    expect(canTransition(OrderStatus.Shipped, OrderStatus.Delivered)).toBe(true)
  })

  it('never moves backwards or out of a terminal state', () => {
    expect(canTransition(OrderStatus.Shipped, OrderStatus.Packed)).toBe(false)
    expect(canTransition(OrderStatus.Delivered, OrderStatus.Pending)).toBe(false)
    expect(allowedNextStatuses(OrderStatus.Cancelled, PaymentRoute.Card)).toHaveLength(0)
    expect(allowedNextStatuses(OrderStatus.Refunded, PaymentRoute.Card)).toHaveLength(0)
  })

  it('reaches refund only from a paid state', () => {
    expect(canTransition(OrderStatus.Pending, OrderStatus.Refunded)).toBe(false)
    expect(canTransition(OrderStatus.Paid, OrderStatus.Refunded)).toBe(true)
    expect(canTransition(OrderStatus.Delivered, OrderStatus.Refunded)).toBe(true)
  })

  it('cancels unpaid and early-stage orders only', () => {
    expect(canTransition(OrderStatus.Pending, OrderStatus.Cancelled)).toBe(true)
    expect(canTransition(OrderStatus.Shipped, OrderStatus.Cancelled)).toBe(false)
  })

  it('never offers "paid" to a cash-on-delivery order', () => {
    expect(allowedNextStatuses(OrderStatus.Pending, PaymentRoute.CashOnDelivery)).toEqual([
      OrderStatus.Packed,
      OrderStatus.Cancelled,
    ])
    expect(allowedNextStatuses(OrderStatus.Pending, PaymentRoute.BankTransfer)).toContain(
      OrderStatus.Paid,
    )
  })

  it('records payment on explicit "paid", and on delivery for COD', () => {
    expect(recordsPayment(PaymentRoute.BankTransfer, OrderStatus.Paid)).toBe(true)
    expect(recordsPayment(PaymentRoute.BankTransfer, OrderStatus.Delivered)).toBe(false)
    expect(recordsPayment(PaymentRoute.CashOnDelivery, OrderStatus.Delivered)).toBe(true)
    expect(recordsPayment(PaymentRoute.CashOnDelivery, OrderStatus.Shipped)).toBe(false)
  })
})
