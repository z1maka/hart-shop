import { eq } from 'drizzle-orm'
import { paymentEvents } from '@/db/schema'
import { db } from '@/lib/db'

export const paymentEventRepository = {
  // The primary key does the work: a webhook delivered twice inserts nothing the
  // second time, and the caller learns it has already been handled.
  async claim(eventId: string, provider: string, status: string): Promise<boolean> {
    const rows = await db
      .insert(paymentEvents)
      .values({ eventId, provider, status })
      .onConflictDoNothing({ target: paymentEvents.eventId })
      .returning({ eventId: paymentEvents.eventId })

    return rows.length > 0
  },

  async release(eventId: string): Promise<void> {
    await db.delete(paymentEvents).where(eq(paymentEvents.eventId, eventId))
  },
}
