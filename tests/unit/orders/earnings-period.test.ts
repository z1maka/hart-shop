import { describe, expect, it } from 'vitest'
import { earningsPeriod, EarningsPreset } from '@/features/orders/model/earnings-period'

const TODAY = '2026-10-25'

describe('earningsPeriod', () => {
  it('shows the last 30 days by default', () => {
    expect(earningsPeriod({}, TODAY)).toEqual({
      from: '2026-09-26',
      to: TODAY,
      preset: EarningsPreset.Days30,
    })
  })

  it('reads every ready choice', () => {
    expect(earningsPeriod({ period: EarningsPreset.Week }, TODAY)).toMatchObject({
      from: '2026-10-19',
      to: TODAY,
    })
    expect(earningsPeriod({ period: EarningsPreset.ThisMonth }, TODAY)).toMatchObject({
      from: '2026-10-01',
      to: TODAY,
    })
    expect(earningsPeriod({ period: EarningsPreset.LastMonth }, TODAY)).toMatchObject({
      from: '2026-09-01',
      to: '2026-09-30',
    })
  })

  it('takes last month across a new year', () => {
    expect(earningsPeriod({ period: EarningsPreset.LastMonth }, '2027-01-10')).toMatchObject({
      from: '2026-12-01',
      to: '2026-12-31',
    })
  })

  it('prefers the typed dates over a ready choice', () => {
    expect(
      earningsPeriod({ period: EarningsPreset.Week, from: '2026-10-01', to: '2026-10-10' }, TODAY),
    ).toEqual({ from: '2026-10-01', to: '2026-10-10', preset: null })
  })

  it('falls back to the default on broken, reversed or too long dates', () => {
    const fallback = earningsPeriod({}, TODAY)

    expect(earningsPeriod({ from: '2026-10', to: '2026-10-10' }, TODAY)).toEqual(fallback)
    expect(earningsPeriod({ from: '2026-10-10', to: '2026-10-01' }, TODAY)).toEqual(fallback)
    expect(earningsPeriod({ from: '2024-01-01', to: '2026-10-01' }, TODAY)).toEqual(fallback)
    expect(earningsPeriod({ period: 'year' }, TODAY)).toEqual(fallback)
  })

  it('refuses a day the calendar does not have', () => {
    const fallback = earningsPeriod({}, TODAY)

    expect(earningsPeriod({ from: '2026-02-30', to: '2026-03-05' }, TODAY)).toEqual(fallback)
    expect(earningsPeriod({ from: '2026-04-01', to: '2026-04-31' }, TODAY)).toEqual(fallback)
    expect(earningsPeriod({ from: '0000-01-01', to: '0000-12-31' }, TODAY)).toEqual(fallback)
    expect(earningsPeriod({ from: '2028-02-01', to: '2028-02-29' }, TODAY)).toMatchObject({
      preset: null,
    })
  })
})
