import { and, asc, eq, gte, isNotNull, ne, sql } from 'drizzle-orm'
import type { Carrier } from '@/db/enums'
import { carrierAccounts, orders } from '@/db/schema'
import type { CarrierAccount } from '@/features/shipping/model/carrier-account'
import { db } from '@/lib/db'

export type CarrierAccountDraft = {
  readonly carrier: Carrier
  readonly name: string
  readonly apiKey: string
  readonly senderRef: string
  readonly senderContactRef: string
  readonly senderName: string
  readonly senderPhone: string
}

export type CarrierAccountEdit = {
  readonly name: string
  readonly senderRef: string
  readonly senderContactRef: string
  readonly senderName: string
  readonly senderPhone: string
}

const columns = {
  id: carrierAccounts.id,
  name: carrierAccounts.name,
  apiKey: carrierAccounts.apiKey,
  senderRef: carrierAccounts.senderRef,
  senderContactRef: carrierAccounts.senderContactRef,
  senderName: carrierAccounts.senderName,
  senderPhone: carrierAccounts.senderPhone,
  isDefault: carrierAccounts.isDefault,
  isActive: carrierAccounts.isActive,
}

export const carrierAccountRepository = {
  async findAll(carrier: Carrier): Promise<CarrierAccount[]> {
    return db
      .select(columns)
      .from(carrierAccounts)
      .where(eq(carrierAccounts.carrier, carrier))
      .orderBy(sql`${carrierAccounts.isDefault} desc`, asc(carrierAccounts.createdAt))
  },

  async findById(id: string): Promise<CarrierAccount | null> {
    const [row] = await db.select(columns).from(carrierAccounts).where(eq(carrierAccounts.id, id))

    return row ?? null
  },

  async findDefault(carrier: Carrier): Promise<CarrierAccount | null> {
    const [row] = await db
      .select(columns)
      .from(carrierAccounts)
      .where(and(eq(carrierAccounts.carrier, carrier), eq(carrierAccounts.isDefault, true)))
      .limit(1)

    return row ?? null
  },

  // How many waybills each cabinet has issued since a date — the admin shows
  // it so a cabinet that is quietly unused is visible.
  async countIssuedSince(since: Date): Promise<Map<string, number>> {
    const rows = await db
      .select({
        accountId: orders.carrierAccountId,
        count: sql<number>`count(*)::int`,
      })
      .from(orders)
      // Typed operators, not a raw fragment: a Date handed to a raw `sql`
      // parameter reaches the driver untyped, and it refuses anything that is
      // not a string.
      .where(and(isNotNull(orders.carrierAccountId), gte(orders.createdAt, since)))
      .groupBy(orders.carrierAccountId)

    return new Map(rows.filter((row) => row.accountId !== null).map((row) => [row.accountId as string, row.count]))
  },

  // The first cabinet of a carrier becomes its default; there is nothing else
  // for a waybill to leave from.
  async create(draft: CarrierAccountDraft): Promise<string> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: carrierAccounts.id })
        .from(carrierAccounts)
        .where(eq(carrierAccounts.carrier, draft.carrier))
        .limit(1)

      const [created] = await tx
        .insert(carrierAccounts)
        .values({ ...draft, isDefault: !existing })
        .returning({ id: carrierAccounts.id })

      if (!created) throw new Error('Carrier account could not be created')

      return created.id
    })
  },

  async update(id: string, edit: CarrierAccountEdit): Promise<boolean> {
    const changed = await db
      .update(carrierAccounts)
      .set({ ...edit, updatedAt: new Date() })
      .where(eq(carrierAccounts.id, id))
      .returning({ id: carrierAccounts.id })

    return changed.length > 0
  },

  async replaceKey(id: string, apiKey: string): Promise<boolean> {
    const changed = await db
      .update(carrierAccounts)
      .set({ apiKey, updatedAt: new Date() })
      .where(eq(carrierAccounts.id, id))
      .returning({ id: carrierAccounts.id })

    return changed.length > 0
  },

  // One default per carrier, moved in a single transaction: two defaults
  // would make the next waybill's sender a matter of luck.
  async makeDefault(id: string, carrier: Carrier): Promise<boolean> {
    return db.transaction(async (tx) => {
      const changed = await tx
        .update(carrierAccounts)
        .set({ isDefault: true, isActive: true, updatedAt: new Date() })
        .where(eq(carrierAccounts.id, id))
        .returning({ id: carrierAccounts.id })

      if (changed.length === 0) return false

      await tx
        .update(carrierAccounts)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(and(eq(carrierAccounts.carrier, carrier), ne(carrierAccounts.id, id)))

      return true
    })
  },

  async setActive(id: string, isActive: boolean): Promise<boolean> {
    const changed = await db
      .update(carrierAccounts)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(carrierAccounts.id, id), eq(carrierAccounts.isDefault, false)))
      .returning({ id: carrierAccounts.id })

    return changed.length > 0
  },
}
