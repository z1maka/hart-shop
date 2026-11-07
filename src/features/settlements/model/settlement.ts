import { PaymentRoute, SettlementLineKind } from '@/db/enums'

// The settlement with the workshop (owner, 07.11.2026). Every payment lands
// on the workshop's account — cash on delivery, card and transfer alike — so
// on each collected parcel the workshop owes the shop the difference between
// the sale and the workshop's own price, less the carrier's fee for bringing
// the cash-on-delivery money. A parcel returned after it was settled gives
// that difference back in a later settlement; the carrier keeps its fee.

// The carrier's cash-on-delivery fee as the workshop's contract sets it: a
// share of the collected sum in hundredths of a percent, plus a fixed sum.
export type CodFee = {
  readonly basisPoints: number
  readonly fixedCents: number
}

const BASIS_POINTS_PER_WHOLE = 10_000
const BASIS_POINTS_PER_PERCENT = 100
const KOPIYKY_PER_HRYVNIA = 100

// The fee the carrier took on one parcel: none when it collected nothing,
// as for a parcel the buyer paid for in full ahead.
export function codFeeCents(collectedCents: number, fee: CodFee): number {
  if (collectedCents <= 0) return 0
  return Math.round((collectedCents * fee.basisPoints) / BASIS_POINTS_PER_WHOLE) + fee.fixedCents
}

// The rate as the admin types it: «2», «1,5», «0.75» per cent.
export function percentToBasisPoints(text: string): number | null {
  const normalized = text.trim().replace(',', '.')
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(normalized)) return null
  return Math.round(Number(normalized) * BASIS_POINTS_PER_PERCENT)
}

// The fixed part as the admin types it, in hryvnias with kopiyky allowed.
export function hryvniasToCents(text: string): number | null {
  const normalized = text.trim().replace(',', '.')
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(normalized)) return null
  return Math.round(Number(normalized) * KOPIYKY_PER_HRYVNIA)
}

// «2 % + 20 ₴», «1,5 % + 15,50 ₴».
export function codFeeLabel(fee: CodFee): string {
  const percent = (fee.basisPoints / BASIS_POINTS_PER_PERCENT).toLocaleString('uk-UA')
  const fixed = (fee.fixedCents / KOPIYKY_PER_HRYVNIA).toLocaleString('uk-UA')
  return `${percent} % + ${fixed} ₴`
}

export type SettlementOrderLine = {
  readonly productTitle: string
  readonly variantLabel: string
  readonly quantity: number
  readonly unitPriceCents: number
  // The workshop's price copied onto the order; null on orders placed before
  // the price was kept, or for a product that never had one.
  readonly unitCostCents: number | null
}

export type SettlementOrder = {
  readonly id: string
  readonly orderNumber: string
  readonly paymentRoute: string
  readonly totalCents: number
  readonly prepaidCents: number
  readonly trackingNumber: string | null
  readonly lines: readonly SettlementOrderLine[]
}

// One order as a settlement counts it.
export type SettlementLineDraft = {
  readonly orderId: string
  readonly kind: SettlementLineKind
  readonly orderNumber: string
  readonly itemsLabel: string
  readonly trackingNumber: string | null
  readonly saleCents: number
  readonly costCents: number
  readonly codFeeCents: number
  readonly amountCents: number
}

// Without the workshop's price on every line the difference cannot be
// known: such an order waits until the price is filled in.
export function hasWorkshopPrice(order: Pick<SettlementOrder, 'lines'>): boolean {
  return order.lines.length > 0 && order.lines.every((line) => line.unitCostCents !== null)
}

// What the carrier collected at the branch: the order less what the buyer
// sent ahead. Card and transfer orders were paid before they left.
export function collectedOnDeliveryCents(
  order: Pick<SettlementOrder, 'paymentRoute' | 'totalCents' | 'prepaidCents'>,
): number {
  if (order.paymentRoute !== PaymentRoute.CashOnDelivery) return 0
  return Math.max(order.totalCents - order.prepaidCents, 0)
}

export function saleLineOf(order: SettlementOrder, fee: CodFee): SettlementLineDraft | null {
  if (!hasWorkshopPrice(order)) return null

  const saleCents = sumOf(order.lines, (line) => line.unitPriceCents * line.quantity)
  const costCents = sumOf(order.lines, (line) => (line.unitCostCents ?? 0) * line.quantity)
  const feeCents = codFeeCents(collectedOnDeliveryCents(order), fee)

  return {
    orderId: order.id,
    kind: SettlementLineKind.Sale,
    orderNumber: order.orderNumber,
    itemsLabel: itemsLabelOf(order.lines),
    trackingNumber: order.trackingNumber,
    saleCents,
    costCents,
    codFeeCents: feeCents,
    amountCents: saleCents - costCents - feeCents,
  }
}

// The sale as it was settled, turned back: the buyer got the money back and
// the workshop the goods, so the shop's difference goes back too. The
// carrier's fee stays spent.
export function returnLineOf(sale: SettlementLineDraft): SettlementLineDraft {
  const differenceCents = sale.saleCents - sale.costCents
  return {
    ...sale,
    kind: SettlementLineKind.Return,
    saleCents: -sale.saleCents,
    costCents: -sale.costCents,
    codFeeCents: 0,
    amountCents: -differenceCents,
  }
}

export function settlementTotalCents(lines: readonly Pick<SettlementLineDraft, 'amountCents'>[]) {
  return sumOf(lines, (line) => line.amountCents)
}

// «2 × Пончо, олива; 1 × Тент 250 × 150 см».
export function itemsLabelOf(lines: readonly SettlementOrderLine[]): string {
  return lines
    .map((line) => {
      const name = line.variantLabel
        ? `${line.productTitle}, ${line.variantLabel}`
        : line.productTitle
      return `${line.quantity} × ${name}`
    })
    .join('; ')
}

// A settlement covers days of collection, the first not after the last, and
// at most a year of them: the list behind it stays one page.
export const MAX_SETTLEMENT_DAYS = 366
const MS_PER_DAY = 86_400_000

export function isSettlementPeriod(from: string, to: string): boolean {
  if (from > to) return false
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY + 1
  return days <= MAX_SETTLEMENT_DAYS
}

function sumOf<T>(items: readonly T[], valueOf: (item: T) => number): number {
  return items.reduce((sum, item) => sum + valueOf(item), 0)
}
