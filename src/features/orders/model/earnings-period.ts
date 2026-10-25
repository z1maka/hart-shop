import { daysBetween, shiftDays } from '@/features/orders/model/earnings'

// The days the earnings board covers: a ready choice, or the admin's own
// dates. Days are «2026-10-25» on the shop's clock, both ends included.

export const EarningsPreset = {
  Week: '7d',
  Days30: '30d',
  ThisMonth: 'month',
  LastMonth: 'last-month',
} as const

export type EarningsPreset = (typeof EarningsPreset)[keyof typeof EarningsPreset]

export type EarningsPeriod = {
  readonly from: string
  readonly to: string
  // Null when the admin typed the dates.
  readonly preset: EarningsPreset | null
}

export const DEFAULT_EARNINGS_PRESET = EarningsPreset.Days30

// A year of days keeps the chart readable and the query small.
export const MAX_EARNINGS_DAYS = 366

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
// Postgres has no year 0, and the shop has no orders this early anyway.
const EARLIEST_DAY = '2000-01-01'
const WEEK_DAYS = 7
const DAYS_30 = 30

type PeriodParams = {
  readonly period?: string
  readonly from?: string
  readonly to?: string
}

export function earningsPeriod(params: PeriodParams, today: string): EarningsPeriod {
  const typed = typedPeriod(params.from, params.to)
  if (typed) return typed

  const preset = isPreset(params.period) ? params.period : DEFAULT_EARNINGS_PRESET
  return { ...presetRange(preset, today), preset }
}

function typedPeriod(from: string | undefined, to: string | undefined): EarningsPeriod | null {
  if (!from || !to || !isCalendarDay(from) || !isCalendarDay(to)) return null

  const span = daysBetween(from, to).length
  if (span === 0 || span > MAX_EARNINGS_DAYS) return null
  return { from, to, preset: null }
}

// «2026-02-30» has the shape but no such day: Date.parse would roll it on to
// March, while Postgres refuses it and the page would fail.
function isCalendarDay(value: string): boolean {
  if (!ISO_DATE.test(value) || value < EARLIEST_DAY) return false
  const parsed = Date.parse(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed) && new Date(parsed).toISOString().startsWith(value)
}

function isPreset(value: string | undefined): value is EarningsPreset {
  return (Object.values(EarningsPreset) as readonly string[]).includes(value ?? '')
}

function presetRange(preset: EarningsPreset, today: string): { from: string; to: string } {
  switch (preset) {
    case EarningsPreset.Week:
      return { from: shiftDays(today, 1 - WEEK_DAYS), to: today }
    case EarningsPreset.Days30:
      return { from: shiftDays(today, 1 - DAYS_30), to: today }
    case EarningsPreset.ThisMonth:
      return { from: `${today.slice(0, 7)}-01`, to: today }
    case EarningsPreset.LastMonth: {
      const firstOfThisMonth = `${today.slice(0, 7)}-01`
      const lastOfPrevious = shiftDays(firstOfThisMonth, -1)
      return { from: `${lastOfPrevious.slice(0, 7)}-01`, to: lastOfPrevious }
    }
  }
}
