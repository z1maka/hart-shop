import { z } from 'zod'
import { isValidUaIban, mfoOfUaIban, normalizeIban } from '@/lib/iban'

// Where a buyer paying by transfer sends the money. The owner keeps several
// accounts in the admin and one of them is active: the order page, the
// confirmation letter and «Про нас» all read that one, so the account on a
// letter never differs from the one on the site.
export const BANK_REQUISITES_TAG = 'bank-requisites'

const EDRPOU_OR_TAX_ID = /^(\d{8}|\d{10})$/
const BANK_EDRPOU = /^\d{8}$/

export const BankAccountDraftSchema = z.object({
  name: z.string().trim().min(2).max(60),
  recipient: z.string().trim().min(3).max(160),
  iban: z.string().transform(normalizeIban).refine(isValidUaIban),
  taxId: z.string().trim().regex(EDRPOU_OR_TAX_ID),
  bankName: z.string().trim().min(2).max(160),
  bankEdrpou: z.string().trim().regex(BANK_EDRPOU),
})

export type BankAccountDraft = z.infer<typeof BankAccountDraftSchema>

// What a payment order needs; the admin's own name for the account is not.
export type BankRequisites = Omit<BankAccountDraft, 'name'>

// An order's copy of the account, read back from the database. A row edited
// by hand or written in an older shape reads as absent, and the order falls
// back to the active account rather than failing to render.
export function parseRequisitesSnapshot(value: unknown): BankAccountDraft | null {
  const parsed = BankAccountDraftSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export function bankMfo(requisites: BankRequisites): string {
  return mfoOfUaIban(requisites.iban)
}

export function paymentPurpose(orderNumber: string): string {
  return `Оплата за замовлення ${orderNumber}`
}
