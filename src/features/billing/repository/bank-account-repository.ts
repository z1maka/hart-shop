import { and, asc, eq, ne, sql } from 'drizzle-orm'
import type { BankAccountDraft } from '@/config/requisites'
import { bankAccounts } from '@/db/schema'
import type { BankAccount } from '@/features/billing/model/bank-account'
import { db } from '@/lib/db'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export type BankAccountWrite =
  | { readonly status: 'saved'; readonly id: string }
  | { readonly status: 'iban_taken' }
  | { readonly status: 'missing' }

const columns = {
  id: bankAccounts.id,
  name: bankAccounts.name,
  recipient: bankAccounts.recipient,
  iban: bankAccounts.iban,
  taxId: bankAccounts.taxId,
  bankName: bankAccounts.bankName,
  bankEdrpou: bankAccounts.bankEdrpou,
  isActive: bankAccounts.isActive,
}

// Every change to the list takes this one lock. The active flag and the IBAN
// are both unique across rows: two admins racing would otherwise meet the
// indexes as an unexplained error instead of a clear answer.
async function lockAccounts(tx: Transaction): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('bank_accounts'))`)
}

async function isIbanTaken(tx: Transaction, iban: string, exceptId: string | null) {
  const [row] = await tx
    .select({ id: bankAccounts.id })
    .from(bankAccounts)
    .where(
      exceptId
        ? and(eq(bankAccounts.iban, iban), ne(bankAccounts.id, exceptId))
        : eq(bankAccounts.iban, iban),
    )
    .limit(1)

  return row !== undefined
}

export const bankAccountRepository = {
  async findAll(): Promise<BankAccount[]> {
    return db
      .select(columns)
      .from(bankAccounts)
      .orderBy(sql`${bankAccounts.isActive} desc`, asc(bankAccounts.createdAt))
  },

  async findActive(): Promise<BankAccount | null> {
    const [row] = await db
      .select(columns)
      .from(bankAccounts)
      .where(eq(bankAccounts.isActive, true))
      .limit(1)

    return row ?? null
  },

  // The first account becomes the active one: a shop with a single account
  // has nothing else to show.
  async create(draft: BankAccountDraft): Promise<BankAccountWrite> {
    return db.transaction(async (tx) => {
      await lockAccounts(tx)
      if (await isIbanTaken(tx, draft.iban, null)) return { status: 'iban_taken' }

      const [existing] = await tx.select({ id: bankAccounts.id }).from(bankAccounts).limit(1)
      const [created] = await tx
        .insert(bankAccounts)
        .values({ ...draft, isActive: !existing })
        .returning({ id: bankAccounts.id })

      if (!created) throw new Error('Bank account could not be created')

      return { status: 'saved', id: created.id }
    })
  },

  async update(id: string, draft: BankAccountDraft): Promise<BankAccountWrite> {
    return db.transaction(async (tx) => {
      await lockAccounts(tx)
      if (await isIbanTaken(tx, draft.iban, id)) return { status: 'iban_taken' }

      const [changed] = await tx
        .update(bankAccounts)
        .set({ ...draft, updatedAt: new Date() })
        .where(eq(bankAccounts.id, id))
        .returning({ id: bankAccounts.id })

      return changed ? { status: 'saved', id: changed.id } : { status: 'missing' }
    })
  },

  // The old account steps down before the new one steps up: the partial
  // unique index allows one active row, and never two for a moment.
  async makeActive(id: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      await lockAccounts(tx)

      const [target] = await tx
        .select({ id: bankAccounts.id })
        .from(bankAccounts)
        .where(eq(bankAccounts.id, id))

      if (!target) return false

      await tx
        .update(bankAccounts)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(bankAccounts.isActive, true), ne(bankAccounts.id, id)))
      await tx
        .update(bankAccounts)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(bankAccounts.id, id))

      return true
    })
  },

  // Refuses the active account at the query itself, so a switch racing a
  // delete cannot leave the site without an account.
  async removeInactive(id: string): Promise<boolean> {
    const removed = await db
      .delete(bankAccounts)
      .where(and(eq(bankAccounts.id, id), eq(bankAccounts.isActive, false)))
      .returning({ id: bankAccounts.id })

    return removed.length > 0
  },

  async exists(id: string): Promise<boolean> {
    const [row] = await db
      .select({ id: bankAccounts.id })
      .from(bankAccounts)
      .where(eq(bankAccounts.id, id))
      .limit(1)

    return row !== undefined
  },
}
