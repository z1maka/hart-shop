import { describe, expect, it } from 'vitest'
import { OrderStatus } from '@/db/enums'
import {
  DayMark,
  dayMarkOf,
  groupOrders,
  OrderGroup,
  orderGroupOf,
  splitByDay,
} from '@/features/orders/model/order-groups'

const calendar = { today: '2026-09-27', yesterday: '2026-09-26' }

describe('orderGroupOf', () => {
  it('puts a row without a waybill into the work group whatever its status', () => {
    expect(orderGroupOf({ status: OrderStatus.Packed, trackingNumber: null })).toBe(
      OrderGroup.NeedsWaybill,
    )
    expect(orderGroupOf({ status: OrderStatus.Pending, trackingNumber: null })).toBe(
      OrderGroup.NeedsWaybill,
    )
  })

  it('parks a packed row with a waybill until the carrier takes the box', () => {
    expect(orderGroupOf({ status: OrderStatus.Packed, trackingNumber: '2045' })).toBe(
      OrderGroup.AwaitingHandover,
    )
  })

  it('follows the status once the order is shipped, waybill or not', () => {
    expect(orderGroupOf({ status: OrderStatus.Shipped, trackingNumber: '2045' })).toBe(
      OrderGroup.InTransit,
    )
    expect(orderGroupOf({ status: OrderStatus.Shipped, trackingNumber: null })).toBe(
      OrderGroup.InTransit,
    )
  })
})

describe('groupOrders', () => {
  it('keeps reading order, keeps row order and drops empty groups', () => {
    const rows = [
      { id: 'a', status: OrderStatus.Packed, trackingNumber: '1' },
      { id: 'b', status: OrderStatus.Packed, trackingNumber: null },
      { id: 'c', status: OrderStatus.Packed, trackingNumber: '2' },
    ]

    expect(groupOrders(rows)).toEqual([
      { group: OrderGroup.NeedsWaybill, rows: [rows[1]] },
      { group: OrderGroup.AwaitingHandover, rows: [rows[0], rows[2]] },
    ])
  })

  it('returns nothing for an empty page', () => {
    expect(groupOrders([])).toEqual([])
  })
})

describe('dayMarkOf', () => {
  it('names today and yesterday and leaves the rest to the date', () => {
    expect(dayMarkOf('2026-09-27', calendar)).toBe(DayMark.Today)
    expect(dayMarkOf('2026-09-26', calendar)).toBe(DayMark.Yesterday)
    expect(dayMarkOf('2026-09-20', calendar)).toBe(DayMark.Other)
  })
})

describe('splitByDay', () => {
  it('opens a run at every change of day and keeps rows in order', () => {
    const rows = [
      { id: 'a', placedDay: '2026-09-27' },
      { id: 'b', placedDay: '2026-09-26' },
      { id: 'c', placedDay: '2026-09-26' },
      { id: 'd', placedDay: '2026-09-25' },
    ]

    expect(splitByDay(rows)).toEqual([
      { dayKey: '2026-09-27', rows: [rows[0]] },
      { dayKey: '2026-09-26', rows: [rows[1], rows[2]] },
      { dayKey: '2026-09-25', rows: [rows[3]] },
    ])
  })
})
