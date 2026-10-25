import { createMoney, Currency, formatWholeMoney } from '@/lib/money'

// The earnings page's number and date formats, shared by the server cards
// and the client charts. Days are «2026-10-25» on the shop's clock.

const KOPIYKAS_PER_HRYVNIA = 100
const AXIS_NUMBER = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 })
const WEEKDAY_DATE = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

export function wholeMoney(cents: number): string {
  return formatWholeMoney(createMoney(cents, Currency.Uah))
}

// Axis ticks carry the hryvnias without the sign: the chart title names it.
export function axisMoney(cents: number): string {
  return AXIS_NUMBER.format(Math.round(cents / KOPIYKAS_PER_HRYVNIA))
}

export function percent(value: number | null): string {
  return value === null ? '—' : `${value} %`
}

export function shortDay(day: string): string {
  return `${day.slice(8, 10)}.${day.slice(5, 7)}`
}

export function fullDay(day: string): string {
  return `${shortDay(day)}.${day.slice(0, 4)}`
}

export function weekdayDay(day: string): string {
  return WEEKDAY_DATE.format(new Date(`${day}T00:00:00Z`))
}
