import { QUIET_HOURS_FROM, QUIET_HOURS_TO } from '@/config/schedule'
import { DISPLAY_TIME_ZONE } from '@/lib/datetime'

const KYIV_HOUR = new Intl.DateTimeFormat('en-GB', {
  timeZone: DISPLAY_TIME_ZONE,
  hour: 'numeric',
  // h23, not hour12:false: the latter may fall back to h24 and print 24 at midnight.
  hourCycle: 'h23',
})

// The hour of the day on Kyiv's clock, summer and winter alike.
export function kyivHour(now: Date): number {
  return Number(KYIV_HOUR.formatToParts(now).find((part) => part.type === 'hour')?.value ?? 0)
}

export function isQuietHour(now: Date): boolean {
  const hour = kyivHour(now)
  return hour >= QUIET_HOURS_FROM || hour < QUIET_HOURS_TO
}
