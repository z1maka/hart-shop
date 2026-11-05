import { OrderStatus, PaymentRoute, SalesChannel } from '@/db/enums'

// A buyer on the phone changes their mind about how many they want (owner,
// 03.11.2026): the admin edits the lines until the parcel is made up.
export const ORDER_LINE_MAX_QUANTITY = 999
// The picker searches from the second letter: one matches half the catalogue.
export const VARIANT_SEARCH_MIN_LENGTH = 2
// A few screens of matches; the admin types more of the name to narrow them.
export const VARIANT_SEARCH_LIMIT = 20

const PRICE_QUERY = /^(\d[\d\s]*)(?:₴|грн\.?)?$/iu
const KOPIYKAS_PER_HRYVNIA = 100
const PRICE_QUERY_MAX_HRYVNIAS = 1_000_000

// «3550», «3 550» or «3550 ₴»: the admin may look a variant up by what one unit
// costs, in whole hryvnias, retail or drop. Any other text is a name or a SKU.
export function priceQueryCents(search: string): number | null {
  const digits = PRICE_QUERY.exec(search.trim())?.[1]?.replace(/\s/g, '')
  if (!digits) return null

  const hryvnias = Number(digits)
  return hryvnias > 0 && hryvnias <= PRICE_QUERY_MAX_HRYVNIAS
    ? hryvnias * KOPIYKAS_PER_HRYVNIA
    : null
}

export const OrderEditBlock = {
  // Shipped, delivered, cancelled or refunded: the order is past its contents.
  Closed: 'closed',
  // The waybill carries the weight and the sum to collect; it is removed first.
  Waybill: 'waybill',
  // The acquirer charged, or will charge, the amount it was given.
  Card: 'card',
  // The transfer has come in for the old total.
  Paid: 'paid',
} as const
export type OrderEditBlock = (typeof OrderEditBlock)[keyof typeof OrderEditBlock]

// Paid stays here so a paid transfer gets its own reason (Paid) rather than
// reading as a closed order.
const EDITABLE_STATUSES: ReadonlySet<string> = new Set([
  OrderStatus.Pending,
  OrderStatus.Paid,
  OrderStatus.Packed,
])

export type EditableOrder = {
  readonly status: string
  readonly paymentRoute: string
  readonly paidAt: Date | null
  readonly carrierDocumentRef: string | null
  readonly trackingNumber: string | null
}

export function orderEditBlockOf(order: EditableOrder): OrderEditBlock | null {
  if (!EDITABLE_STATUSES.has(order.status)) return OrderEditBlock.Closed
  if (order.carrierDocumentRef || order.trackingNumber) return OrderEditBlock.Waybill
  if (order.paymentRoute === PaymentRoute.Card) return OrderEditBlock.Card
  if (order.paidAt) return OrderEditBlock.Paid
  return null
}

// One line of the order as the edit prices it: the variant, its product and
// the variant's surcharge over the product price.
export type EditLine = {
  readonly variantId: string
  readonly productId: string
  readonly priceDeltaCents: number
  readonly quantity: number
  readonly unitPriceCents: number
}

// The product's unit price, before the variant's surcharge, for `quantity`
// units of it: the order's channel decides how (model/channel-pricing.ts).
export type ProductUnitPrice = (productId: string, quantity: number) => number

// The lines of a site order after the edit, zero quantities gone. A product
// whose total quantity changed is priced again — the wholesale tier is earned
// by the product across its colours; every other line keeps the price the
// buyer agreed to.
export function repricedLines(
  before: readonly EditLine[],
  after: readonly EditLine[],
  unitPriceOf: ProductUnitPrice,
): EditLine[] {
  const quantityBefore = quantitiesByProduct(before)
  const quantityAfter = quantitiesByProduct(after)

  return after
    .filter((line) => line.quantity > 0)
    .map((line) => {
      const productQuantity = quantityAfter.get(line.productId) ?? 0
      if (productQuantity === quantityBefore.get(line.productId)) return line

      const unitPriceCents = unitPriceOf(line.productId, productQuantity) + line.priceDeltaCents
      return { ...line, unitPriceCents }
    })
}

// A partner's price does not hang on the quantity, and a line may carry one
// agreed apart from the card (owner, 05.11.2026): a variant already in the
// order keeps its price whatever its quantity; only one new to it is priced.
export function newLinesPriced(
  before: readonly EditLine[],
  after: readonly EditLine[],
  unitPriceOf: ProductUnitPrice,
): EditLine[] {
  const known = new Set(before.map((line) => line.variantId))

  return after
    .filter((line) => line.quantity > 0)
    .map((line) => {
      if (known.has(line.variantId)) return line

      const unitPriceCents = unitPriceOf(line.productId, line.quantity) + line.priceDeltaCents
      return { ...line, unitPriceCents }
    })
}

export type LineRepricing = typeof repricedLines

const LINE_REPRICING: Readonly<Record<SalesChannel, LineRepricing>> = {
  [SalesChannel.Site]: repricedLines,
  [SalesChannel.Dropship]: newLinesPriced,
}

export function lineRepricingFor(channel: SalesChannel): LineRepricing {
  return LINE_REPRICING[channel]
}

// What leaves the shelf (positive) or comes back to it (negative) per variant.
export function stockChanges(
  before: readonly EditLine[],
  after: readonly EditLine[],
): Map<string, number> {
  const changes = new Map<string, number>()
  for (const line of after) changes.set(line.variantId, line.quantity)
  for (const line of before) {
    changes.set(line.variantId, (changes.get(line.variantId) ?? 0) - line.quantity)
  }

  return new Map([...changes].filter(([, change]) => change !== 0))
}

export function linesSubtotalCents(
  lines: readonly Pick<EditLine, 'quantity' | 'unitPriceCents'>[],
): number {
  return lines.reduce((total, line) => total + line.unitPriceCents * line.quantity, 0)
}

function quantitiesByProduct(lines: readonly EditLine[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const line of lines) {
    totals.set(line.productId, (totals.get(line.productId) ?? 0) + line.quantity)
  }

  return totals
}
