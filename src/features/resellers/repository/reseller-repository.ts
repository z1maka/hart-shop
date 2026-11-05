import { and, asc, desc, eq } from 'drizzle-orm'
import { resellers } from '@/db/schema'
import type { ResellerDraft } from '@/features/resellers/schema/reseller-schema'
import { db } from '@/lib/db'

const RESELLER_COLUMNS = {
  id: resellers.id,
  name: resellers.name,
  taxId: resellers.taxId,
  contactName: resellers.contactName,
  phone: resellers.phone,
  email: resellers.email,
  legalAddress: resellers.legalAddress,
  payoutIban: resellers.payoutIban,
  contractRef: resellers.contractRef,
  note: resellers.note,
  isActive: resellers.isActive,
}

export type ResellerRow = ResellerDraft & {
  readonly id: string
  readonly isActive: boolean
}

// A shop has a handful of partners; the cap only bounds the read.
const RESELLERS_MAX_ROWS = 500

export const resellerRepository = {
  // Active first, then by name: the order form lists the active ones.
  async findAll(): Promise<ResellerRow[]> {
    return db
      .select(RESELLER_COLUMNS)
      .from(resellers)
      .orderBy(desc(resellers.isActive), asc(resellers.name))
      .limit(RESELLERS_MAX_ROWS)
  },

  async findActive(): Promise<ResellerRow[]> {
    return db
      .select(RESELLER_COLUMNS)
      .from(resellers)
      .where(eq(resellers.isActive, true))
      .orderBy(asc(resellers.name))
      .limit(RESELLERS_MAX_ROWS)
  },

  async findById(id: string): Promise<ResellerRow | null> {
    const [row] = await db
      .select(RESELLER_COLUMNS)
      .from(resellers)
      .where(eq(resellers.id, id))
      .limit(1)
    return row ?? null
  },

  async create(draft: ResellerDraft): Promise<string> {
    const [row] = await db.insert(resellers).values(draft).returning({ id: resellers.id })
    if (!row) throw new Error('Reseller could not be created')
    return row.id
  },

  async update(id: string, draft: ResellerDraft): Promise<boolean> {
    const updated = await db
      .update(resellers)
      .set({ ...draft, updatedAt: new Date() })
      .where(eq(resellers.id, id))
      .returning({ id: resellers.id })
    return updated.length > 0
  },

  async setActive(id: string, isActive: boolean): Promise<boolean> {
    const updated = await db
      .update(resellers)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(resellers.id, id), eq(resellers.isActive, !isActive)))
      .returning({ id: resellers.id })
    return updated.length > 0
  },
}
