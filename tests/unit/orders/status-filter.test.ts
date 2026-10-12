import { describe, expect, it } from 'vitest'
import { OrderStatus } from '@/db/enums'
import {
  countByStatusFilter,
  OrderStatusFilter,
  parseOrderStatusFilter,
  statusFilterOf,
  statusMatchOf,
} from '@/features/orders/model/status-filter'

describe('parseOrderStatusFilter', () => {
  it('reads a known filter from the address', () => {
    expect(parseOrderStatusFilter('packed')).toBe(OrderStatusFilter.Packed)
    expect(parseOrderStatusFilter('awaiting-payment')).toBe(OrderStatusFilter.AwaitingPayment)
  })

  it('treats anything else as no filter', () => {
    expect(parseOrderStatusFilter('pending')).toBeNull()
    expect(parseOrderStatusFilter(['packed'])).toBeNull()
    expect(parseOrderStatusFilter(undefined)).toBeNull()
    expect(parseOrderStatusFilter('constructor')).toBeNull()
  })
})

describe('statusFilterOf', () => {
  it('splits a pending order on whether the carrier collects the money', () => {
    expect(statusFilterOf(OrderStatus.Pending, true)).toBe(OrderStatusFilter.New)
    expect(statusFilterOf(OrderStatus.Pending, false)).toBe(OrderStatusFilter.AwaitingPayment)
  })

  it('keeps every other status as it is', () => {
    expect(statusFilterOf(OrderStatus.Packed, true)).toBe(OrderStatusFilter.Packed)
    expect(statusFilterOf(OrderStatus.Refunded, false)).toBe(OrderStatusFilter.Refunded)
  })
})

describe('statusMatchOf', () => {
  it('narrows a pending filter to one side of cash on delivery', () => {
    expect(statusMatchOf(OrderStatusFilter.New)).toEqual({
      status: OrderStatus.Pending,
      isCashOnDelivery: true,
    })
    expect(statusMatchOf(OrderStatusFilter.AwaitingPayment)).toEqual({
      status: OrderStatus.Pending,
      isCashOnDelivery: false,
    })
  })

  it('matches any payment route for a settled status', () => {
    expect(statusMatchOf(OrderStatusFilter.Shipped)).toEqual({
      status: OrderStatus.Shipped,
      isCashOnDelivery: null,
    })
  })
})

describe('countByStatusFilter', () => {
  it('folds the grouped totals into the chips, zero for the ones not present', () => {
    const counts = countByStatusFilter([
      { status: OrderStatus.Pending, isCashOnDelivery: true, count: 3 },
      { status: OrderStatus.Pending, isCashOnDelivery: false, count: 2 },
      { status: OrderStatus.Packed, isCashOnDelivery: true, count: 5 },
      { status: OrderStatus.Packed, isCashOnDelivery: false, count: 1 },
    ])

    expect(counts[OrderStatusFilter.New]).toBe(3)
    expect(counts[OrderStatusFilter.AwaitingPayment]).toBe(2)
    expect(counts[OrderStatusFilter.Packed]).toBe(6)
    expect(counts[OrderStatusFilter.Delivered]).toBe(0)
  })
})
