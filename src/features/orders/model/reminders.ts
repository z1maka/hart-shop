import { hoursAgo, wholeHoursBetween } from '@/lib/datetime'

// Orders placed at or before this moment have waited long enough.
export function reminderCutoff(now: Date, afterHours: number): Date {
  return hoursAgo(now, afterHours)
}

// Whole hours the buyer has been waiting, as the reminder says it.
export function waitingHours(placedAt: Date, now: Date): number {
  return wholeHoursBetween(placedAt, now)
}
