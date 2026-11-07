import { SalesChannel, SettlementLineKind } from '@/db/enums'
import { requireAdminSession } from '@/features/admin'
import { isCalendarDay } from '@/features/invoices'
import {
  codFeeLabel,
  isSettlementPeriod,
  itemsLabelOf,
  returnLineOf,
  saleLineOf,
  type CodFee,
  type SettlementLineDraft,
  type SettlementOrder,
} from '@/features/settlements/model/settlement'
import { dayLabel, moneyLabel, periodLabel } from '@/features/settlements/queries/settlement-format'
import {
  CANDIDATES_MAX_ROWS,
  settlementService,
} from '@/features/settlements/services/settlement-service'

// One row of the picker: what the act will print, and the sums behind it.
export type SettlementCandidateView = {
  readonly orderId: string
  readonly kind: SettlementLineKind
  readonly orderNumber: string
  readonly isPartner: boolean
  readonly itemsLabel: string
  readonly trackingNumber: string | null
  // When the parcel was collected, or for a return when it came back.
  readonly dateLabel: string
  readonly saleLabel: string
  readonly costLabel: string
  readonly feeLabel: string
  readonly amountCents: number
  readonly amountLabel: string
  // No workshop price on a line: the difference is unknown.
  readonly isBlocked: boolean
}

export type SettlementCandidatesView =
  | { readonly isPeriodValid: false }
  | {
      readonly isPeriodValid: true
      readonly periodFrom: string
      readonly periodTo: string
      readonly periodLabel: string
      readonly feeLabel: string | null
      readonly isTruncated: boolean
      readonly maxRows: number
      readonly sales: readonly SettlementCandidateView[]
      readonly returns: readonly SettlementCandidateView[]
    }

const NO_FEE: CodFee = { basisPoints: 0, fixedCents: 0 }
const UNKNOWN = '—'

export async function getSettlementCandidates(
  from: string | undefined,
  to: string | undefined,
): Promise<SettlementCandidatesView> {
  await requireAdminSession()
  if (!from || !to || !isCalendarDay(from) || !isCalendarDay(to) || !isSettlementPeriod(from, to)) {
    return { isPeriodValid: false }
  }

  const candidates = await settlementService.candidates({ from, to })
  const fee = candidates.fee ?? NO_FEE

  return {
    isPeriodValid: true,
    periodFrom: from,
    periodTo: to,
    periodLabel: periodLabel(from, to),
    feeLabel: candidates.fee ? codFeeLabel(candidates.fee) : null,
    isTruncated: candidates.isTruncated,
    maxRows: CANDIDATES_MAX_ROWS,
    sales: candidates.orders.map((order) => {
      const line = saleLineOf(order, fee)
      const base = {
        orderId: order.id,
        kind: SettlementLineKind.Sale,
        orderNumber: order.orderNumber,
        isPartner: order.channel === SalesChannel.Dropship,
        trackingNumber: order.trackingNumber,
        dateLabel: order.deliveredAt ? dayLabel(order.deliveredAt) : UNKNOWN,
      }
      return line ? { ...base, ...sums(line), isBlocked: false } : blockedRow(base, order)
    }),
    returns: candidates.returns.map((sale) => ({
      orderId: sale.orderId,
      kind: SettlementLineKind.Return,
      orderNumber: sale.orderNumber,
      isPartner: false,
      trackingNumber: sale.trackingNumber,
      dateLabel: dayLabel(sale.returnedAt),
      ...sums(returnLineOf(sale)),
      isBlocked: false,
    })),
  }
}

function sums(line: SettlementLineDraft) {
  return {
    itemsLabel: line.itemsLabel,
    saleLabel: moneyLabel(line.saleCents),
    costLabel: moneyLabel(line.costCents),
    feeLabel: line.codFeeCents === 0 ? UNKNOWN : moneyLabel(line.codFeeCents),
    amountCents: line.amountCents,
    amountLabel: moneyLabel(line.amountCents),
  }
}

function blockedRow(
  base: Pick<
    SettlementCandidateView,
    'orderId' | 'kind' | 'orderNumber' | 'isPartner' | 'trackingNumber' | 'dateLabel'
  >,
  order: Pick<SettlementOrder, 'lines'>,
): SettlementCandidateView {
  return {
    ...base,
    itemsLabel: itemsLabelOf(order.lines),
    saleLabel: UNKNOWN,
    costLabel: 'нет цены цеха',
    feeLabel: UNKNOWN,
    amountCents: 0,
    amountLabel: UNKNOWN,
    isBlocked: true,
  }
}
