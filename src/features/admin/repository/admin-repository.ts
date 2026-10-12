import { eq, sql, type InferSelectModel } from 'drizzle-orm'
import { adminUsers } from '@/db/schema'
import type { AdminRole } from '@/db/enums'
import { db } from '@/lib/db'

export type AdminUserRow = InferSelectModel<typeof adminUsers>

export const adminRepository = {
  async findByEmail(email: string): Promise<AdminUserRow | null> {
    const [row] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase()))
      .limit(1)

    return row ?? null
  },

  async create(email: string, passwordHash: string, role: AdminRole): Promise<AdminUserRow> {
    const [row] = await db
      .insert(adminUsers)
      .values({ email: email.toLowerCase(), passwordHash, role })
      .onConflictDoUpdate({
        target: adminUsers.email,
        // A password reset also clears the lockout: whoever can run the CLI
        // against the database is the operator, not the attacker.
        set: { passwordHash, role, updatedAt: new Date(), failedAttempts: 0, lockedUntil: null },
      })
      .returning()

    if (!row) throw new Error('Admin user could not be written')

    return row
  },

  async findById(adminId: string): Promise<AdminUserRow | null> {
    const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, adminId)).limit(1)
    return row ?? null
  },

  async recordSuccess(adminId: string): Promise<void> {
    await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date(), failedAttempts: 0, lockedUntil: null })
      .where(eq(adminUsers.id, adminId))
  },

  // The counter lives in the database rather than in memory: serverless
  // instances come and go, so an in-process counter would reset constantly.
  // A failure after an expired lock starts a fresh count — otherwise the
  // counter stays at the ceiling forever and every miss re-locks instantly,
  // which hands anyone who knows the email a permanent denial of service.
  async recordFailure(adminId: string, maxAttempts: number, lockMinutes: number): Promise<void> {
    const freshCount = sql`case when ${adminUsers.lockedUntil} is not null and ${adminUsers.lockedUntil} <= now() then 1 else ${adminUsers.failedAttempts} + 1 end`

    await db
      .update(adminUsers)
      .set({
        failedAttempts: freshCount,
        lockedUntil: sql`case when (${freshCount}) >= ${maxAttempts} then now() + (${lockMinutes} * interval '1 minute') else null end`,
      })
      .where(eq(adminUsers.id, adminId))
  },

  async revokeSessions(adminId: string): Promise<void> {
    await db
      .update(adminUsers)
      .set({ sessionsValidFrom: new Date() })
      .where(eq(adminUsers.id, adminId))
  },
}
