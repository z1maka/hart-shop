import { COMPANY } from '@/config/company'
import { parseRequisitesSnapshot, type BankAccountDraft } from '@/config/requisites'
import { bankAccountService, requisitesView } from '@/features/billing'
import {
  invoiceBlockOf,
  invoiceLineName,
  invoiceOrderReference,
  invoiceTotalCents,
  paymentPurposeText,
  type InvoiceParty,
  type InvoiceSeller,
} from '@/features/invoices/model/invoice'
import {
  invoiceRepository,
  type InvoiceRow,
} from '@/features/invoices/repository/invoice-repository'
import { orderRepository, type OrderRow } from '@/features/orders'
import { formatDateIsoKyiv } from '@/lib/datetime'
import {
  InvoiceNotFoundError,
  InvoiceNotIssuableError,
  OrderNotFoundError,
  PaymentRouteUnavailableError,
} from '@/lib/errors'
import { logger } from '@/lib/logger'

export type InvoiceRequest = {
  readonly buyer: InvoiceParty
  // «2026-11-12», on the shop's clock.
  readonly validUntil: string
}

export const invoiceService = {
  // The invoice copies the order as it stands — lines, total, the account it
  // was told to pay to — and takes the next number.
  async issue(orderId: string, request: InvoiceRequest, now: Date): Promise<InvoiceRow> {
    const order = await orderRepository.findById(orderId)
    if (!order) throw new OrderNotFoundError(orderId)
    const block = invoiceBlockOf(order)
    if (block) throw new InvoiceNotIssuableError(orderId, block)

    const [items, seller] = await Promise.all([orderRepository.findItems(orderId), sellerOf(order)])
    const lines = items.map((item) => ({
      sku: item.sku,
      name: invoiceLineName(item.productTitle, item.variantLabel),
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    }))
    const number = await invoiceRepository.nextNumber()
    const issuedOn = formatDateIsoKyiv(now)

    const invoice = await invoiceRepository.insertIssued({
      number,
      orderId,
      issuedOn,
      validUntil: request.validUntil,
      buyer: request.buyer,
      seller,
      lines,
      totalCents: invoiceTotalCents(lines),
      paymentPurpose: paymentPurposeText({
        orderReference: invoiceOrderReference(order),
        number,
        issuedOn,
      }),
    })
    if (!invoice) throw new InvoiceNotIssuableError(orderId, 'already_issued')

    logger.info('Invoice issued', { orderId, number })
    return invoice
  },

  // The number burns: a new invoice for the order takes the next one.
  async void(invoiceId: string): Promise<InvoiceRow> {
    const invoice = await invoiceRepository.voidIssued(invoiceId)
    if (!invoice) throw new InvoiceNotFoundError(invoiceId)

    logger.info('Invoice voided', { orderId: invoice.orderId, number: invoice.number })
    return invoice
  },

  async listForOrder(orderId: string): Promise<InvoiceRow[]> {
    return invoiceRepository.findForOrder(orderId)
  },
}

// The account the order was told to pay to; an order from before accounts
// were copied onto orders pays to the active one.
async function sellerOf(order: OrderRow): Promise<InvoiceSeller> {
  const account: BankAccountDraft | null =
    parseRequisitesSnapshot(order.bankRequisites) ?? (await bankAccountService.active())
  if (!account) throw new PaymentRouteUnavailableError(order.paymentRoute)

  const requisites = requisitesView(account)
  return {
    name: requisites.recipient,
    taxId: requisites.taxId,
    addressLines: [...COMPANY.addressLines],
    phone: COMPANY.phone,
    email: COMPANY.email,
    iban: requisites.iban,
    bankName: requisites.bankName,
    bankEdrpou: requisites.bankEdrpou,
    mfo: requisites.mfo,
  }
}
