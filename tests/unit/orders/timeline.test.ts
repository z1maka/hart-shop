import { describe, expect, it } from 'vitest'
import { OrderStatus } from '@/db/enums'
import { buildOrderTimeline, isTerminatedStatus } from '@/features/orders/model/timeline'

describe('buildOrderTimeline', () => {
  it('always returns the same four steps', () => {
    expect(buildOrderTimeline(OrderStatus.Paid).map((step) => step.key)).toEqual([
      'paid',
      'packed',
      'shipped',
      'delivered',
    ])
  })

  it('marks payment as done and packing as current once paid', () => {
    const [paid, packed] = buildOrderTimeline(OrderStatus.Paid)

    expect(paid?.state).toBe('done')
    expect(packed?.state).toBe('current')
  })

  it('moves the marker forward as the parcel travels', () => {
    const shipped = buildOrderTimeline(OrderStatus.Shipped)

    expect(shipped.filter((step) => step.state === 'done')).toHaveLength(3)
    expect(shipped[3]?.state).toBe('current')
  })

  it('completes every step once delivered', () => {
    expect(buildOrderTimeline(OrderStatus.Delivered).every((step) => step.state === 'done')).toBe(
      true,
    )
  })

  it('keeps a pending order at the first step', () => {
    expect(buildOrderTimeline(OrderStatus.Pending)[0]?.state).toBe('current')
  })
})

describe('isTerminatedStatus', () => {
  it('separates cancelled and refunded from the happy path', () => {
    expect(isTerminatedStatus(OrderStatus.Cancelled)).toBe(true)
    expect(isTerminatedStatus(OrderStatus.Refunded)).toBe(true)
    expect(isTerminatedStatus(OrderStatus.Shipped)).toBe(false)
  })
})
