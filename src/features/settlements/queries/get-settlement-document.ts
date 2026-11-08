import { SettlementLineKind, SettlementStatus } from '@/db/enums'
import { requireAdminSession } from '@/features/admin'
import { dottedDate } from '@/features/invoices'
import {
  codFeeLabel,
  workshopEarningsCents,
  workshopShareOf,
} from '@/features/settlements/model/settlement'
import {
  dayLabel,
  knownMoneyLabel,
  moneyLabel,
  periodLabel,
} from '@/features/settlements/queries/settlement-format'
import { settlementService } from '@/features/settlements/services/settlement-service'
import { formatDateIsoKyiv } from '@/lib/datetime'

export type SettlementDocumentLine = {
  readonly orderNumber: string
  readonly itemsLabel: string
  readonly trackingNumber: string | null
  readonly amountLabel: string
  // What stays with the workshop (its price), what sewing cost it and what
  // it earned; «—» where the cost was not entered.
  readonly keptLabel: string
  readonly productionCostLabel: string
  readonly workshopEarningsLabel: string
  readonly isReturn: boolean
}

export type SettlementDocumentView = {
  readonly id: string
  readonly number: number
  readonly isPaid: boolean
  readonly periodLabel: string
  readonly feeLabel: string
  readonly createdOnLabel: string
  readonly paidOnLabel: string | null
  readonly today: string
  readonly lines: readonly SettlementDocumentLine[]
  readonly saleCount: number
  readonly returnCount: number
  readonly totalLabel: string
  readonly keptLabel: string
  readonly productionCostLabel: string
  readonly workshopEarningsLabel: string
  // Lines without the sewing cost, left out of the two sums above.
  readonly uncountedLines: number
}

export async function getSettlementDocument(
  settlementId: string,
): Promise<SettlementDocumentView | null> {
  await requireAdminSession()
  const found = await settlementService.document(settlementId)
  if (!found) return null

  const { settlement, lines } = found
  const share = workshopShareOf(lines)
  return {
    id: settlement.id,
    number: settlement.number,
    isPaid: settlement.status === SettlementStatus.Paid,
    periodLabel: periodLabel(settlement.periodFrom, settlement.periodTo),
    feeLabel: codFeeLabel({
      basisPoints: settlement.codFeeBasisPoints,
      fixedCents: settlement.codFeeFixedCents,
    }),
    createdOnLabel: dayLabel(settlement.createdAt),
    paidOnLabel: settlement.paidOn ? dottedDate(settlement.paidOn) : null,
    today: formatDateIsoKyiv(new Date()),
    lines: lines.map((line) => ({
      orderNumber: line.orderNumber,
      itemsLabel: line.itemsLabel,
      trackingNumber: line.trackingNumber,
      amountLabel: moneyLabel(line.amountCents),
      keptLabel: moneyLabel(line.costCents),
      productionCostLabel: knownMoneyLabel(line.productionCostCents),
      workshopEarningsLabel: knownMoneyLabel(workshopEarningsCents(line)),
      isReturn: line.kind === SettlementLineKind.Return,
    })),
    saleCount: lines.filter((line) => line.kind === SettlementLineKind.Sale).length,
    returnCount: lines.filter((line) => line.kind === SettlementLineKind.Return).length,
    totalLabel: moneyLabel(settlement.totalCents),
    keptLabel: moneyLabel(share.keptCents),
    productionCostLabel: moneyLabel(share.productionCostCents),
    workshopEarningsLabel: moneyLabel(share.earningsCents),
    uncountedLines: share.uncountedLines,
  }
}
