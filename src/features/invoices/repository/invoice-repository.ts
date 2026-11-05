import { and, desc, eq, sql } from 'drizzle-orm'
import { InvoiceStatus } from '@/db/enums'
import { invoices } from '@/db/schema'
import type {
  InvoiceLineSnapshot,
  InvoiceParty,
  InvoiceSeller,
} from '@/features/invoices/model/invoice'
import { db } from '@/lib/db'

export type InvoiceRow = {
  readonly id: string
  readonly number: number
  readonly orderId: string
  readonly status: InvoiceStatus
  readonly issuedOn: string
  readonly validUntil: string
  readonly buyer: InvoiceParty
  readonly seller: InvoiceSeller
  readonly lines: readonly InvoiceLineSnapshot[]
  readonly totalCents: number
  readonly paymentPurpose: string
  readonly createdAt: Date
}

export type InvoiceDraft = Omit<InvoiceRow, 'id' | 'status' | 'createdAt'>

const INVOICE_COLUMNS = {
  id: invoices.id,
  number: invoices.number,
  orderId: invoices.orderId,
  status: invoices.status,
  issuedOn: invoices.issuedOn,
  validUntil: invoices.validUntil,
  buyer: invoices.buyer,
  seller: invoices.seller,
  lines: invoices.lines,
  totalCents: invoices.totalCents,
  paymentPurpose: invoices.paymentPurpose,
  createdAt: invoices.createdAt,
}

// An order gets a few invoices at most, voided ones included.
const ORDER_INVOICES_MAX_ROWS = 50

export const invoiceRepository = {
  // Taken before the row is written: the number is printed inside the
  // payment purpose. A number taken and not used is burnt, never reissued.
  async nextNumber(): Promise<number> {
    const [row] = await db.execute<{ value: string }>(
      sql`select nextval('invoice_number_seq') as value`,
    )
    if (!row) throw new Error('Invoice number sequence returned nothing')
    return Number(row.value)
  },

  // Null when the order already has a live invoice (another tab issued it).
  async insertIssued(draft: InvoiceDraft): Promise<InvoiceRow | null> {
    const [row] = await db
      .insert(invoices)
      .values({ ...draft, status: InvoiceStatus.Issued })
      .onConflictDoNothing({
        target: invoices.orderId,
        where: sql`${invoices.status} = ${InvoiceStatus.Issued}`,
      })
      .returning(INVOICE_COLUMNS)
    return row ?? null
  },

  async voidIssued(invoiceId: string): Promise<InvoiceRow | null> {
    const [row] = await db
      .update(invoices)
      .set({ status: InvoiceStatus.Void })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.status, InvoiceStatus.Issued)))
      .returning(INVOICE_COLUMNS)
    return row ?? null
  },

  // Newest first: the live one, if any, then the voided history.
  async findForOrder(orderId: string): Promise<InvoiceRow[]> {
    return db
      .select(INVOICE_COLUMNS)
      .from(invoices)
      .where(eq(invoices.orderId, orderId))
      .orderBy(desc(invoices.createdAt))
      .limit(ORDER_INVOICES_MAX_ROWS)
  },
}
