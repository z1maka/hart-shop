import {
  addBankingDays,
  DEFAULT_VALIDITY_BANKING_DAYS,
  dottedDate,
  invoiceBlockOf,
  type InvoiceBlock,
  type InvoiceParty,
} from '@/features/invoices/model/invoice'
import { invoiceService } from '@/features/invoices/services/invoice-service'
import type { InvoiceRow } from '@/features/invoices/repository/invoice-repository'
import { orderRepository } from '@/features/orders'
import { resellerService } from '@/features/resellers'
import { InvoiceStatus } from '@/db/enums'
import { formatDateIsoKyiv } from '@/lib/datetime'
import { createMoney, Currency, formatMoney } from '@/lib/money'
import { taxIdLabel } from '@/lib/tax-id'

export type InvoiceSummaryView = {
  readonly id: string
  readonly number: number
  readonly issuedOn: string
  readonly validUntil: string
  readonly totalLabel: string
  readonly buyerName: string
  // «РНОКПП 3165519160»; null when the buyer gave no code.
  readonly buyerTaxLine: string | null
}

export type OrderInvoicesView = {
  readonly orderId: string
  // Why the order takes no invoice; null when it can have one.
  readonly block: InvoiceBlock | null
  readonly live: InvoiceSummaryView | null
  // Newest first, numbers burnt.
  readonly voided: readonly InvoiceSummaryView[]
  // What the issue form starts from: the partner's card on a partner order,
  // blank on a site order.
  readonly prefill: InvoiceParty
  // «2026-11-12»: five banking days from today.
  readonly defaultValidUntil: string
}

const BLANK_BUYER: InvoiceParty = { name: '', taxId: null, address: null, phone: null }

// The admin only: the caller checks the session.
export async function getOrderInvoices(
  orderId: string,
  now: Date,
): Promise<OrderInvoicesView | null> {
  const order = await orderRepository.findById(orderId)
  if (!order) return null

  const [invoices, prefill] = await Promise.all([
    invoiceService.listForOrder(orderId),
    prefillOf(order.resellerId),
  ])
  const summaries = invoices.map(summaryOf)

  return {
    orderId,
    block: invoiceBlockOf(order),
    live: summaries.find((invoice) => invoice.status === InvoiceStatus.Issued)?.view ?? null,
    voided: summaries
      .filter((invoice) => invoice.status === InvoiceStatus.Void)
      .map((invoice) => invoice.view),
    prefill,
    defaultValidUntil: addBankingDays(formatDateIsoKyiv(now), DEFAULT_VALIDITY_BANKING_DAYS),
  }
}

// Only a partner order carries a partner (the orders table checks it).
async function prefillOf(resellerId: string | null): Promise<InvoiceParty> {
  if (!resellerId) return BLANK_BUYER

  const reseller = await resellerService.find(resellerId)
  if (!reseller) return BLANK_BUYER

  return {
    name: reseller.name,
    taxId: reseller.taxId,
    address: reseller.legalAddress,
    phone: reseller.phone,
  }
}

function summaryOf(invoice: InvoiceRow) {
  return {
    status: invoice.status,
    view: {
      id: invoice.id,
      number: invoice.number,
      issuedOn: dottedDate(invoice.issuedOn),
      validUntil: dottedDate(invoice.validUntil),
      totalLabel: formatMoney(createMoney(invoice.totalCents, Currency.Uah)),
      buyerName: invoice.buyer.name,
      buyerTaxLine: invoice.buyer.taxId
        ? `${taxIdLabel(invoice.buyer.taxId)} ${invoice.buyer.taxId}`
        : null,
    },
  }
}
