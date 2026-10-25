import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/env', () => ({ env: {} }))
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn() } }))

import { GoogleApiUnavailableError } from '@/lib/errors'
import { isGoogleAnalyticsConfigured, parseAdCostReport } from '@/lib/google-analytics'

function row(day: string, cost: string) {
  return { dimensionValues: [{ value: day }], metricValues: [{ value: cost }] }
}

describe('parseAdCostReport', () => {
  it('turns GA days and hryvnia amounts into ISO days and kopiykas', () => {
    const report = {
      rows: [row('20261024', '412.37'), row('20261025', '0.005'), row('20261026', '1500')],
      metadata: { currencyCode: 'UAH', timeZone: 'Europe/Kiev' },
    }

    expect(parseAdCostReport(report)).toEqual([
      { day: '2026-10-24', costCents: 41_237 },
      { day: '2026-10-25', costCents: 1 },
      { day: '2026-10-26', costCents: 150_000 },
    ])
  })

  it('reads a report without rows as no spend', () => {
    expect(parseAdCostReport({ metadata: { currencyCode: 'UAH' } })).toEqual([])
  })

  it('refuses a property that counts money in another currency', () => {
    const report = { rows: [row('20261024', '10')], metadata: { currencyCode: 'USD' } }

    expect(() => parseAdCostReport(report)).toThrow(GoogleApiUnavailableError)
  })

  it('refuses an answer it cannot read', () => {
    expect(() => parseAdCostReport({ rows: [row('2026-10-24', '10')] })).toThrow(
      GoogleApiUnavailableError,
    )
    expect(() => parseAdCostReport({ rows: [row('20261024', 'n/a')] })).toThrow(
      GoogleApiUnavailableError,
    )
  })
})

describe('isGoogleAnalyticsConfigured', () => {
  it('stays off without the key and the property', () => {
    expect(isGoogleAnalyticsConfigured()).toBe(false)
  })
})
