import { and, desc, eq, sql } from 'drizzle-orm'
import { InvoiceStatus } from '@/db/enums'
import { invoices, orderItems, orders } from '@/db/schema'
import {
  invoiceBlockOf,
  invoiceLineName,
  invoiceTotalCents,
  type InvoiceLineSnapshot,
  type InvoiceParty,
  type InvoiceSeller,
} from '@/features/invoices/model/invoice'
import { db } from '@/lib/db'
import { InvoiceNotIssuableError, OrderNotFoundError } from '@/lib/errors'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

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

// What the shop puts on a new invoice; the lines and the total are copied
// from the order when it is issued.
export type InvoiceIssue = {
  readonly orderId: string
  readonly issuedOn: string
  readonly validUntil: string
  readonly buyer: InvoiceParty
  readonly seller: InvoiceSeller
  // The number is printed inside the purpose, so the purpose waits for it.
  readonly paymentPurposeOf: (number: number) => string
}

export const invoiceRepository = {
  // Under the order's row lock, the one a line edit takes: an edit waits for
  // the invoice or the invoice for the edit, so the paper never copies lines
  // another tab is changing. Null when the order already has a live invoice;
  // that is known before a number is taken, so a second click burns none.
  async issue(issue: InvoiceIssue): Promise<InvoiceRow | null> {
    return db.transaction(async (tx) => {
      await lockIssuableOrder(tx, issue.orderId)
      if (await hasLiveInvoice(tx, issue.orderId)) return null

      const items = await tx
        .select({
          sku: orderItems.sku,
          productTitle: orderItems.productTitle,
          variantLabel: orderItems.variantLabel,
          quantity: orderItems.quantity,
          unitPriceCents: orderItems.unitPriceCents,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, issue.orderId))
      const lines = items.map((item) => ({
        sku: item.sku,
        name: invoiceLineName(item.productTitle, item.variantLabel),
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
      }))
      const number = await nextNumber(tx)

      const [row] = await tx
        .insert(invoices)
        .values({
          number,
          orderId: issue.orderId,
          status: InvoiceStatus.Issued,
          issuedOn: issue.issuedOn,
          validUntil: issue.validUntil,
          buyer: issue.buyer,
          seller: issue.seller,
          lines,
          totalCents: invoiceTotalCents(lines),
          paymentPurpose: issue.paymentPurposeOf(number),
        })
        .onConflictDoNothing({
          target: invoices.orderId,
          where: sql`${invoices.status} = ${InvoiceStatus.Issued}`,
        })
        .returning(INVOICE_COLUMNS)
      return row ?? null
    })
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

// A cancelled order, or one turned from transfer to cash on delivery while
// the admin filled the form, gets no invoice.
async function lockIssuableOrder(tx: Transaction, orderId: string): Promise<void> {
  const [order] = await tx
    .select({ status: orders.status, paymentRoute: orders.paymentRoute })
    .from(orders)
    .where(eq(orders.id, orderId))
    .for('update')
    .limit(1)
  if (!order) throw new OrderNotFoundError(orderId)

  const block = invoiceBlockOf(order)
  if (block) throw new InvoiceNotIssuableError(orderId, block)
}

async function hasLiveInvoice(tx: Transaction, orderId: string): Promise<boolean> {
  const [live] = await tx
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.orderId, orderId), eq(invoices.status, InvoiceStatus.Issued)))
    .limit(1)
  return live !== undefined
}

// A number taken and not used is burnt, never reissued: the sequence does not
// roll back with the transaction.
async function nextNumber(tx: Transaction): Promise<number> {
  const [row] = await tx.execute<{ value: string }>(
    sql`select nextval('invoice_number_seq') as value`,
  )
  if (!row) throw new Error('Invoice number sequence returned nothing')
  return Number(row.value)
}
