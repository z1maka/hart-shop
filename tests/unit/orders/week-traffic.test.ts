import { describe, expect, it, vi } from 'vitest'

const countByTrafficInWeek = vi.hoisted(() => vi.fn())

vi.mock('@/features/orders/repository/order-repository', () => ({
  orderRepository: { countByTrafficInWeek },
}))

import { getWeekTraffic } from '@/features/orders/queries/get-traffic-stats'

describe('getWeekTraffic', () => {
  it('lists the channels by what they sold, refusals taken off, the unknown ones included', async () => {
    countByTrafficInWeek.mockResolvedValue([
      { source: 'direct', orders: 1, totalCents: 205000, returned: 0, returnedCents: 0 },
      { source: 'google_ads', orders: 3, totalCents: 615000, returned: 1, returnedCents: 205000 },
      { source: null, orders: 2, totalCents: 410000, returned: 0, returnedCents: 0 },
    ])

    const week = await getWeekTraffic('2026-10-05')

    expect(countByTrafficInWeek).toHaveBeenCalledWith('2026-10-05', 'Europe/Kyiv')
    expect(week.weekLabel).toBe('5–11 октября 2026')
    expect(week.orders).toBe(6)
    expect(week.returned).toBe(1)
    expect(week.soldLabel.replace(/\s/g, ' ')).toBe('10 250,00 ₴')
    expect(
      week.channels.map((channel) => [channel.source, channel.returned, channel.sharePercent]),
    ).toEqual([
      ['google_ads', 1, 40],
      [null, 0, 40],
      ['direct', 0, 20],
    ])
  })
})
