import { OrderStatus, PaymentRoute } from '@/db/enums'

// An invoice («рахунок на оплату») from the ФОП for an order paid by
// transfer. Everything on it is copied when it is issued, so a price, an
// account or a product name changed later leaves the paper the buyer holds
// as it was. The ФОП is on the single tax without VAT: every sum is «без ПДВ».

// Who the invoice is made out to. A ФОП carries a РНОКПП (10 digits), a
// company its ЄДРПОУ (8 digits); a buyer from the site may give neither.
export type InvoiceParty = {
  readonly name: string
  readonly taxId: string | null
  readonly address: string | null
  readonly phone: string | null
}

// The shop as it stood when the invoice was issued: the company's own
// details and the account the order was told to pay to.
export type InvoiceSeller = {
  readonly name: string
  readonly taxId: string
  readonly addressLines: readonly string[]
  readonly phone: string
  readonly email: string
  readonly iban: string
  readonly bankName: string
  readonly bankEdrpou: string
  readonly mfo: string
}

export type InvoiceLineSnapshot = {
  readonly sku: string
  readonly name: string
  readonly quantity: number
  readonly unitPriceCents: number
}

export function invoiceTotalCents(lines: readonly InvoiceLineSnapshot[]): number {
  return lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0)
}

// The reference the buyer knows the order by: the partner's own number when
// there is one, else the shop's.
export function invoiceOrderReference(order: {
  readonly orderNumber: string
  readonly resellerOrderRef: string | null
}): string {
  return order.resellerOrderRef ?? order.orderNumber
}

export function paymentPurposeText(input: {
  readonly orderReference: string
  readonly number: number
  readonly issuedOn: string
}): string {
  return `Оплата за замовлення ${input.orderReference} згідно з рахунком № ${input.number} від ${dottedDate(input.issuedOn)}, без ПДВ`
}

// «2026-11-05» as the paper writes it: «05.11.2026».
export function dottedDate(isoDay: string): string {
  const [year, month, day] = isoDay.split('-')
  return `${day}.${month}.${year}`
}

const SATURDAY = 6
const SUNDAY = 0
const MS_PER_DAY = 86_400_000
const ISO_DATE_LENGTH = 10
// What the shop gives a buyer to pay by default (owner, 05.11.2026).
export const DEFAULT_VALIDITY_BANKING_DAYS = 5

// `count` banking days after `isoDay`, weekends skipped. Under martial law
// public holidays are working days, so there is no holiday calendar.
export function addBankingDays(isoDay: string, count: number): string {
  let time = Date.parse(`${isoDay}T00:00:00Z`)
  let left = count
  while (left > 0) {
    time += MS_PER_DAY
    const weekday = new Date(time).getUTCDay()
    if (weekday !== SATURDAY && weekday !== SUNDAY) left -= 1
  }
  return new Date(time).toISOString().slice(0, ISO_DATE_LENGTH)
}

// The line as the paper names it: the product and, when it has one, the
// variant («…пончо, мультикам»).
export function invoiceLineName(productTitle: string, variantLabel: string): string {
  return variantLabel ? `${productTitle}, ${variantLabel}` : productTitle
}

// An invoice goes out for an order paid by transfer that is still to be
// paid or shipped; a cancelled or returned one needs none.
export const InvoiceBlock = {
  NotTransfer: 'not_transfer',
  Closed: 'closed',
} as const
export type InvoiceBlock = (typeof InvoiceBlock)[keyof typeof InvoiceBlock]

const CLOSED_STATUSES: ReadonlySet<string> = new Set([OrderStatus.Cancelled, OrderStatus.Refunded])

export function invoiceBlockOf(order: {
  readonly paymentRoute: string
  readonly status: string
}): InvoiceBlock | null {
  if (order.paymentRoute !== PaymentRoute.BankTransfer) return InvoiceBlock.NotTransfer
  if (CLOSED_STATUSES.has(order.status)) return InvoiceBlock.Closed
  return null
}

const SOLE_TRADER_PREFIX = 'ФОП '
const FULL_NAME_PARTS = 3

// Who signs, as the paper writes it under the line: «ФОП Масний О. С.» for
// «ФОП Масний Олександр Сергійович»; any other name as it is.
export function signatoryOf(sellerName: string): string {
  if (!sellerName.startsWith(SOLE_TRADER_PREFIX)) return sellerName

  const parts = sellerName.slice(SOLE_TRADER_PREFIX.length).trim().split(/\s+/)
  if (parts.length !== FULL_NAME_PARTS) return sellerName

  const [surname, firstName, patronymic] = parts
  return `${SOLE_TRADER_PREFIX}${surname} ${firstName?.charAt(0)}. ${patronymic?.charAt(0)}.`
}
