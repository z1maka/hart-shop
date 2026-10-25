import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn() } }))

import {
  adSpendByDay,
  adSpendPerOrder,
  AdSpendState,
  totalAdSpend,
  type AdSpendSource,
} from '@/features/admin/model/ad-spend'
import { readAdSpend } from '@/features/admin/services/ad-spend-reader'
import { GoogleApiUnavailableError } from '@/lib/errors'

const DAYS = [
  { day: '2026-10-24', costCents: 41_237 },
  { day: '2026-10-25', costCents: 18_900 },
]

function sourceAnswering(dailySpend: AdSpendSource['dailySpend']): AdSpendSource {
  return { dailySpend }
}

describe('ad spend sums', () => {
  it('adds the period up and finds each day', () => {
    expect(totalAdSpend(DAYS)).toBe(60_137)
    expect(totalAdSpend([])).toBe(0)
    expect(adSpendByDay(DAYS).get('2026-10-25')).toBe(18_900)
    expect(adSpendByDay(DAYS).get('2026-10-26')).toBeUndefined()
  })

  it('spreads the spend over the orders, none without orders', () => {
    expect(adSpendPerOrder(1_301_108, 9)).toBe(144_568)
    expect(adSpendPerOrder(60_137, 0)).toBeNull()
  })
})

describe('readAdSpend', () => {
  it('passes the days of a connected source through', async () => {
    const source = sourceAnswering(async () => ({ state: AdSpendState.Connected, days: DAYS }))

    await expect(readAdSpend(source, '2026-10-24', '2026-10-25')).resolves.toEqual({
      state: AdSpendState.Connected,
      days: DAYS,
    })
  })

  it('says not connected instead of zero', async () => {
    const source = sourceAnswering(async () => ({ state: AdSpendState.NotConnected }))

    await expect(readAdSpend(source, '2026-10-24', '2026-10-25')).resolves.toEqual({
      state: AdSpendState.NotConnected,
    })
  })

  it('turns a Google failure into a failed state for the page', async () => {
    const source = sourceAnswering(async () => {
      throw new GoogleApiUnavailableError('analyticsdata.googleapis.com answered 403')
    })

    await expect(readAdSpend(source, '2026-10-24', '2026-10-25')).resolves.toEqual({
      state: AdSpendState.Failed,
    })
  })

  it('lets a bug in our own code surface', async () => {
    const source = sourceAnswering(async () => {
      throw new TypeError('not a Google failure')
    })

    await expect(readAdSpend(source, '2026-10-24', '2026-10-25')).rejects.toThrow(TypeError)
  })
})
