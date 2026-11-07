import { SettlementStatus } from '@/db/enums'
import { requireAdminSession } from '@/features/admin'
import { dottedDate } from '@/features/invoices'
import { codFeeLabel } from '@/features/settlements/model/settlement'
import { dayLabel, moneyLabel, periodLabel } from '@/features/settlements/queries/settlement-format'
import { settlementService } from '@/features/settlements/services/settlement-service'
import { formatDateIsoKyiv } from '@/lib/datetime'

export type SettlementListItemView = {
  readonly id: string
  readonly number: number
  readonly periodLabel: string
  readonly lineCount: number
  readonly totalLabel: string
  readonly isPaid: boolean
  readonly paidOnLabel: string | null
  readonly createdOnLabel: string
}

export type SettlementsBoardView = {
  // The rate as the form shows it back, «1,5» and «20»; null until set.
  readonly fee: { readonly percent: string; readonly fixed: string; readonly label: string } | null
  readonly today: string
  readonly monthStart: string
  readonly settlements: readonly SettlementListItemView[]
  // More acts exist than the page lists: the oldest are left out.
  readonly olderLeftOut: number | null
}

const BASIS_POINTS_PER_PERCENT = 100
const KOPIYKY_PER_HRYVNIA = 100
const MONTH_PREFIX_LENGTH = 8

export async function getSettlementsBoard(): Promise<SettlementsBoardView> {
  await requireAdminSession()
  const [fee, list] = await Promise.all([settlementService.codFee(), settlementService.list()])
  const today = formatDateIsoKyiv(new Date())

  return {
    fee: fee
      ? {
          percent: decimalText(fee.basisPoints / BASIS_POINTS_PER_PERCENT),
          fixed: decimalText(fee.fixedCents / KOPIYKY_PER_HRYVNIA),
          label: codFeeLabel(fee),
        }
      : null,
    today,
    monthStart: `${today.slice(0, MONTH_PREFIX_LENGTH)}01`,
    olderLeftOut: list.hasOlder ? list.maxRows : null,
    settlements: list.rows.map((row) => ({
      id: row.id,
      number: row.number,
      periodLabel: periodLabel(row.periodFrom, row.periodTo),
      lineCount: row.lineCount,
      totalLabel: moneyLabel(row.totalCents),
      isPaid: row.status === SettlementStatus.Paid,
      paidOnLabel: row.paidOn ? dottedDate(row.paidOn) : null,
      createdOnLabel: dayLabel(row.createdAt),
    })),
  }
}

// «1,5», «20», «15,5»: the number as the admin would type it back.
function decimalText(value: number): string {
  return String(value).replace('.', ',')
}
