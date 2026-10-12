const DAYS_PER_WEEK = 7
// As Date counts weekdays: Sunday is 0.
const MONDAY = 1
const MS_PER_DAY = 86_400_000
const PERCENT = 100
const WEEK_KEY = /^\d{4}-\d{2}-\d{2}$/

// Weeks run Monday to Sunday on the shop's clock and are named by their
// Monday: "2026-10-05".
export function recentWeekKeys(now: Date, count: number, timeZone: string): string[] {
  const today = calendarDayIn(now, timeZone)
  const monday = today - ((weekdayOf(today) + DAYS_PER_WEEK - MONDAY) % DAYS_PER_WEEK) * MS_PER_DAY

  return Array.from({ length: count }, (_, back) =>
    isoDay(monday - back * DAYS_PER_WEEK * MS_PER_DAY),
  )
}

export function isWeekKey(value: string): boolean {
  if (!WEEK_KEY.test(value)) return false
  const day = Date.parse(`${value}T00:00:00Z`)
  return !Number.isNaN(day) && isoDay(day) === value && weekdayOf(day) === MONDAY
}

const DAY_MONTH = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

// "5–11 октября 2026", "28 сентября – 4 октября 2026" — the admin reads Russian.
export function weekLabel(weekKey: string): string {
  const start = Date.parse(`${weekKey}T00:00:00Z`)
  const end = start + (DAYS_PER_WEEK - 1) * MS_PER_DAY
  const [startDay, startMonth] = dayAndMonth(start)
  const [endDay, endMonth] = dayAndMonth(end)
  const startYear = new Date(start).getUTCFullYear()
  const endYear = new Date(end).getUTCFullYear()

  if (startYear !== endYear) {
    return `${startDay} ${startMonth} ${startYear} – ${endDay} ${endMonth} ${endYear}`
  }
  if (startMonth === endMonth) return `${startDay}–${endDay} ${endMonth} ${endYear}`
  return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${endYear}`
}

// A channel's part of the week's sum, in whole percent; an empty week, none.
export function sharePercent(partCents: number, totalCents: number): number | null {
  return totalCents === 0 ? null : Math.round((partCents / totalCents) * PERCENT)
}

function dayAndMonth(day: number): [string, string] {
  const parts = DAY_MONTH.formatToParts(new Date(day))
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return [value('day'), value('month')]
}

// Midnight UTC of the calendar day `at` falls on in `timeZone`.
function calendarDayIn(at: Date, timeZone: string): number {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)
  return Date.parse(`${iso}T00:00:00Z`)
}

function weekdayOf(day: number): number {
  return new Date(day).getUTCDay()
}

function isoDay(day: number): string {
  return new Date(day).toISOString().slice(0, 10)
}
