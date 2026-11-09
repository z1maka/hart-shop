import { COMPANY } from '@/config/company'
import { InvoiceStatus } from '@/db/enums'
import {
  dottedDate,
  invoiceOrderReference,
  signatoryOf,
  type InvoiceSeller,
} from '@/features/invoices/model/invoice'
import type { InvoiceRow } from '@/features/invoices/repository/invoice-repository'
import { invoiceService } from '@/features/invoices/services/invoice-service'
import { orderRepository, type OrderRow } from '@/features/orders'
import { amountInWords } from '@/lib/amount-in-words'
import { groupIban } from '@/lib/iban'
import { taxIdLabel } from '@/lib/tax-id'

export type InvoiceDocumentLine = {
  readonly sku: string
  readonly name: string
  readonly quantity: number
  readonly unitPriceLabel: string
  readonly sumLabel: string
}

export type InvoiceDocumentView = {
  readonly orderId: string
  readonly orderNumber: string
  readonly number: number
  readonly isVoid: boolean
  readonly issuedOnLong: string
  readonly orderReference: string | null
  readonly seller: InvoiceSeller & { readonly ibanGrouped: string }
  readonly buyer: {
    readonly name: string
    readonly taxLine: string | null
    readonly address: string | null
    readonly phone: string | null
  }
  readonly lines: readonly InvoiceDocumentLine[]
  readonly totalLabel: string
  readonly totalInWords: string
  readonly paymentPurpose: string
  readonly validUntil: string
  readonly signatory: string
  readonly site: string
}

const KOPIYKY_PER_HRYVNIA = 100
const amount = new Intl.NumberFormat('uk-UA', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const longDate = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

function hryvni(cents: number): string {
  return amount.format(cents / KOPIYKY_PER_HRYVNIA)
}

// The admin only: the caller checks the session. The live invoice, or —
// when there is none — the newest voided one, marked so.
export async function getInvoiceDocument(orderId: string): Promise<InvoiceDocumentView | null> {
  const [order, invoices] = await Promise.all([
    orderRepository.findById(orderId),
    invoiceService.listForOrder(orderId),
  ])
  const invoice = invoices.find((entry) => entry.status === InvoiceStatus.Issued) ?? invoices.at(0)
  if (!order || !invoice) return null

  return documentOf(order, invoice)
}

// The buyer's copy, reached by the order's secret link without signing in:
// the live invoice only, so a voided one is never sent on.
export async function getBuyerInvoiceDocument(
  accessToken: string,
): Promise<InvoiceDocumentView | null> {
  const order = await orderRepository.findByAccessToken(accessToken)
  if (!order) return null

  const invoices = await invoiceService.listForOrder(order.id)
  const live = invoices.find((entry) => entry.status === InvoiceStatus.Issued)
  return live ? documentOf(order, live) : null
}

function documentOf(order: OrderRow, invoice: InvoiceRow): InvoiceDocumentView {
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    number: invoice.number,
    isVoid: invoice.status === InvoiceStatus.Void,
    issuedOnLong: longDate.format(new Date(`${invoice.issuedOn}T00:00:00Z`)),
    orderReference: invoiceOrderReference(order),
    seller: { ...invoice.seller, ibanGrouped: groupIban(invoice.seller.iban) },
    buyer: {
      name: invoice.buyer.name,
      taxLine: invoice.buyer.taxId
        ? `${taxIdLabel(invoice.buyer.taxId)} ${invoice.buyer.taxId}`
        : null,
      address: invoice.buyer.address,
      phone: invoice.buyer.phone,
    },
    lines: invoice.lines.map((line) => ({
      sku: line.sku,
      name: line.name,
      quantity: line.quantity,
      unitPriceLabel: hryvni(line.unitPriceCents),
      sumLabel: hryvni(line.unitPriceCents * line.quantity),
    })),
    totalLabel: hryvni(invoice.totalCents),
    totalInWords: amountInWords(invoice.totalCents),
    paymentPurpose: invoice.paymentPurpose,
    validUntil: dottedDate(invoice.validUntil),
    signatory: signatoryOf(invoice.seller.name),
    site: COMPANY.site,
  }
}
