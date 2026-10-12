const MONTHS_PER_YEAR = 12
const PERCENT = 100

// Orders of one month, by when they were placed: how many left with a
// waybill and how many of those came back.
export type MonthReturns = {
  // "2026-09", in the shop's time zone.
  readonly month: string
  readonly sent: number
  readonly returned: number
  readonly returnedCents: number
}

// The months the admin can pick: the last `count` up to the current one,
// newest first, as the calendar reads in `timeZone`.
export function recentMonthKeys(now: Date, count: number, timeZone: string): string[] {
  const { year, month } = yearMonthIn(now, timeZone)
  const current = year * MONTHS_PER_YEAR + (month - 1)

  return Array.from({ length: count }, (_, back) => {
    const index = current - back
    const monthNumber = (index % MONTHS_PER_YEAR) + 1
    return `${Math.floor(index / MONTHS_PER_YEAR)}-${String(monthNumber).padStart(2, '0')}`
  })
}

// Share of sent parcels that came back, in whole percent; none sent, none.
export function returnSharePercent(row: MonthReturns): number | null {
  return row.sent === 0 ? null : Math.round((row.returned / row.sent) * PERCENT)
}

const MONTH_NAME = new Intl.DateTimeFormat('ru-RU', { month: 'long', timeZone: 'UTC' })

// "Сентябрь 2026" — the admin reads Russian.
export function monthLabel(monthKey: string): string {
  const [year = 0, month = 1] = monthKey.split('-').map(Number)
  const name = MONTH_NAME.format(new Date(Date.UTC(year, month - 1, 1)))
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`
}

function yearMonthIn(date: Date, timeZone: string): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((entry) => entry.type === type)?.value)
  return { year: part('year'), month: part('month') }
}

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/

export function isMonthKey(value: string): boolean {
  return MONTH_KEY.test(value)
}
