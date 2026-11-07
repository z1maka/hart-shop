import { SettlementLineKind, SettlementStatus } from '@/db/enums'
import { requireAdminSession } from '@/features/admin'
import { dottedDate } from '@/features/invoices'
import { codFeeLabel } from '@/features/settlements/model/settlement'
import { dayLabel, moneyLabel, periodLabel } from '@/features/settlements/queries/settlement-format'
import { settlementService } from '@/features/settlements/services/settlement-service'
import { formatDateIsoKyiv } from '@/lib/datetime'

export type SettlementDocumentLine = {
  readonly orderNumber: string
  readonly itemsLabel: string
  readonly trackingNumber: string | null
  readonly amountLabel: string
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
}

export async function getSettlementDocument(
  settlementId: string,
): Promise<SettlementDocumentView | null> {
  await requireAdminSession()
  const found = await settlementService.document(settlementId)
  if (!found) return null

  const { settlement, lines } = found
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
      isReturn: line.kind === SettlementLineKind.Return,
    })),
    saleCount: lines.filter((line) => line.kind === SettlementLineKind.Sale).length,
    returnCount: lines.filter((line) => line.kind === SettlementLineKind.Return).length,
    totalLabel: moneyLabel(settlement.totalCents),
  }
}
