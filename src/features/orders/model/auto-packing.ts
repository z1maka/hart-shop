import { hoursAgo } from '@/lib/datetime'

// Orders whose packing clock started at or before this moment are due.
export function packingCutoff(now: Date, afterHours: number): Date {
  return hoursAgo(now, afterHours)
}
