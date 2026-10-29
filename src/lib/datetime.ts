// The people reading the admin sit in Ukraine; pinning the zone keeps a
// timestamp meaning the same thing whatever the server or the browser thinks.
export const DISPLAY_TIME_ZONE = 'Europe/Kyiv'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: DISPLAY_TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: DISPLAY_TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(value: Date): string {
  return DATE_FORMATTER.format(value)
}

export function formatDateTime(value: Date): string {
  return DATE_TIME_FORMATTER.format(value)
}

// The storefront speaks Ukrainian: «12 вересня 2026», without the « р.»
// the locale appends, which reads as noise under a review.
const UK_DATE_FORMATTER = new Intl.DateTimeFormat('uk-UA', {
  timeZone: DISPLAY_TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

// The calendar date in Kyiv as YYYY-MM-DD: what structured data and feeds
// carry, and the same day the visitor reads on the page.
const KYIV_ISO_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: DISPLAY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function formatDateIsoKyiv(value: Date): string {
  return KYIV_ISO_DATE_FORMATTER.format(value)
}

// Kyiv time as YYYY-MM-DD HH:mm, the stamp a YML product file carries. The
// Swedish locale writes exactly that shape.
const KYIV_ISO_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('sv-SE', {
  timeZone: DISPLAY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDateTimeIsoKyiv(value: Date): string {
  return KYIV_ISO_DATE_TIME_FORMATTER.format(value)
}

// The calendar day before a YYYY-MM-DD key, by the calendar and not by 24
// hours: the day the clocks go back is 25 hours long.
export function previousIsoDay(dayKey: string): string {
  const day = new Date(`${dayKey}T00:00:00Z`)
  day.setUTCDate(day.getUTCDate() - 1)
  return day.toISOString().slice(0, ISO_DATE_LENGTH)
}

const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length

export function formatDateUk(value: Date): string {
  return UK_DATE_FORMATTER.format(value).replace(/\s*р\.$/u, '')
}

const MS_PER_HOUR = 3_600_000
const MS_PER_DAY = 86_400_000

// The moment this many hours before `now`: cut-offs for scheduled work.
export function hoursAgo(now: Date, hours: number): Date {
  return new Date(now.getTime() - hours * MS_PER_HOUR)
}

export function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * MS_PER_DAY)
}

// Whole hours between two moments, never negative.
export function wholeHoursBetween(earlier: Date, later: Date): number {
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / MS_PER_HOUR))
}
