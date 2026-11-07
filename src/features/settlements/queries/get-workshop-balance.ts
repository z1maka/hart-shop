import { requireAdminSession } from '@/features/admin'
import { moneyLabel } from '@/features/settlements/queries/settlement-format'
import { settlementService } from '@/features/settlements/services/settlement-service'

export type WorkshopBalanceView = {
  readonly receivedLabel: string
  readonly awaitingLabel: string
  readonly awaitingCount: number
  readonly unsettledLabel: string
  readonly unsettledCount: number
  readonly uncostedCount: number
  readonly pendingReturnsLabel: string
  readonly pendingReturnsCount: number
  readonly isFeeSet: boolean
}

export async function getWorkshopBalance(): Promise<WorkshopBalanceView> {
  await requireAdminSession()
  const balance = await settlementService.balance()

  return {
    receivedLabel: moneyLabel(balance.receivedCents),
    awaitingLabel: moneyLabel(balance.awaitingCents),
    awaitingCount: balance.awaitingCount,
    unsettledLabel: moneyLabel(balance.unsettledCents + balance.pendingReturnsCents),
    unsettledCount: balance.unsettledCount,
    uncostedCount: balance.uncostedCount,
    pendingReturnsLabel: moneyLabel(balance.pendingReturnsCents),
    pendingReturnsCount: balance.pendingReturnsCount,
    isFeeSet: balance.isFeeSet,
  }
}
