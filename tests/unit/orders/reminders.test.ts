import { describe, expect, it } from 'vitest'
import { reminderCutoff, waitingHours } from '@/features/orders/model/reminders'

describe('reminders', () => {
  const now = new Date('2026-09-26T12:00:00Z')

  it('counts whole hours waited and never goes negative', () => {
    expect(waitingHours(new Date('2026-09-26T09:30:00Z'), now)).toBe(2)
    expect(waitingHours(new Date('2026-09-26T12:30:00Z'), now)).toBe(0)
  })

  it('puts the cutoff the delay back from now', () => {
    expect(reminderCutoff(now, 2).toISOString()).toBe('2026-09-26T10:00:00.000Z')
  })
})
