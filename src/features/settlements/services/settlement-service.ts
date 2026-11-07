import { z } from 'zod'
import { SettlementStatus } from '@/db/enums'
import {
  returnLineOf,
  saleLineOf,
  settlementTotalCents,
  type CodFee,
} from '@/features/settlements/model/settlement'
import {
  settlementRepository,
  type PendingReturn,
  type SettlementLineRow,
  type SettlementListRow,
  type SettlementRow,
  type UnsettledOrder,
} from '@/features/settlements/repository/settlement-repository'
import {
  SettlementClosedError,
  SettlementFeeMissingError,
  SettlementNotFoundError,
  SettlementOrdersChangedError,
} from '@/lib/errors'
import { logger } from '@/lib/logger'
import { readShopSetting, writeShopSetting } from '@/lib/shop-settings'

const COD_FEE_SETTING_KEY = 'workshop_cod_fee'

const CodFeeSchema = z.object({
  basisPoints: z.number().int().min(0).max(9_999),
  fixedCents: z.number().int().min(0).max(999_999),
})

// One page of parcels to tick through; a longer range is asked to be split.
export const CANDIDATES_MAX_ROWS = 500
const PENDING_RETURNS_MAX_ROWS = 200
// Everything collected and not settled, for the balance on the stats page.
const BALANCE_MAX_ROWS = 2_000
const NO_FEE: CodFee = { basisPoints: 0, fixedCents: 0 }

export type SettlementCandidates = {
  readonly orders: readonly UnsettledOrder[]
  // More parcels were collected in the range than one page lists.
  readonly isTruncated: boolean
  readonly returns: readonly PendingReturn[]
  readonly fee: CodFee | null
}

export type SettlementRequest = {
  readonly periodFrom: string
  readonly periodTo: string
  readonly saleOrderIds: readonly string[]
  readonly returnOrderIds: readonly string[]
}

export type WorkshopBalance = {
  readonly receivedCents: number
  readonly awaitingCents: number
  readonly awaitingCount: number
  // Collected and in no settlement yet, at the current fee.
  readonly unsettledCents: number
  readonly unsettledCount: number
  // Collected orders the balance cannot count without a workshop price.
  readonly uncostedCount: number
  readonly pendingReturnsCents: number
  readonly pendingReturnsCount: number
  readonly isFeeSet: boolean
}

export const settlementService = {
  // Null until the admin sets the rate of the workshop's carrier contract.
  async codFee(): Promise<CodFee | null> {
    const parsed = CodFeeSchema.safeParse(await readShopSetting<unknown>(COD_FEE_SETTING_KEY))
    return parsed.success ? parsed.data : null
  },

  async saveCodFee(fee: CodFee): Promise<void> {
    await writeShopSetting(COD_FEE_SETTING_KEY, CodFeeSchema.parse(fee))
    logger.info('Workshop cash-on-delivery fee saved', fee)
  },

  async candidates(range: { readonly from: string; readonly to: string }) {
    const [found, returns, fee] = await Promise.all([
      settlementRepository.findUnsettled(range, CANDIDATES_MAX_ROWS + 1),
      settlementRepository.findPendingReturns(PENDING_RETURNS_MAX_ROWS),
      settlementService.codFee(),
    ])
    return {
      orders: found.slice(0, CANDIDATES_MAX_ROWS),
      isTruncated: found.length > CANDIDATES_MAX_ROWS,
      returns,
      fee,
    } satisfies SettlementCandidates
  },

  // The orders are counted again on the server, under their row locks: the
  // sums the page showed are only a preview.
  async create(request: SettlementRequest): Promise<SettlementRow> {
    const fee = await settlementService.codFee()
    if (!fee) throw new SettlementFeeMissingError()

    const settlement = await settlementRepository.create({
      ...request,
      fee,
      saleLineOf: (order) => saleLineOf(order, fee),
      returnLineOf,
      totalOf: settlementTotalCents,
    })
    if (!settlement) throw new SettlementOrdersChangedError()

    logger.info('Workshop settlement created', {
      number: settlement.number,
      sales: request.saleOrderIds.length,
      returns: request.returnOrderIds.length,
      totalCents: settlement.totalCents,
    })
    return settlement
  },

  async markPaid(settlementId: string, paidOn: string): Promise<SettlementRow> {
    const paid = await settlementRepository.markPaid(settlementId, paidOn)
    if (paid) {
      logger.info('Workshop settlement paid', { number: paid.number, paidOn })
      return paid
    }
    throw await missingOrClosed(settlementId)
  },

  async delete(settlementId: string): Promise<SettlementRow> {
    const deleted = await settlementRepository.deleteCreated(settlementId)
    if (deleted) {
      logger.info('Workshop settlement deleted', { number: deleted.number })
      return deleted
    }
    throw await missingOrClosed(settlementId)
  },

  async list(): Promise<SettlementListRow[]> {
    return settlementRepository.list()
  },

  async document(
    settlementId: string,
  ): Promise<{ settlement: SettlementRow; lines: SettlementLineRow[] } | null> {
    const settlement = await settlementRepository.findById(settlementId)
    if (!settlement) return null
    return { settlement, lines: await settlementRepository.findLines(settlementId) }
  },

  async balance(): Promise<WorkshopBalance> {
    const [totals, unsettled, returns, fee] = await Promise.all([
      settlementRepository.totalsByStatus(),
      settlementRepository.findUnsettled(null, BALANCE_MAX_ROWS),
      settlementRepository.findPendingReturns(PENDING_RETURNS_MAX_ROWS),
      settlementService.codFee(),
    ])
    const counted = unsettled.flatMap((order) => saleLineOf(order, fee ?? NO_FEE) ?? [])
    const totalOf = (status: SettlementStatus) => totals.find((row) => row.status === status)

    return {
      receivedCents: totalOf(SettlementStatus.Paid)?.totalCents ?? 0,
      awaitingCents: totalOf(SettlementStatus.Created)?.totalCents ?? 0,
      awaitingCount: totalOf(SettlementStatus.Created)?.count ?? 0,
      unsettledCents: settlementTotalCents(counted),
      unsettledCount: counted.length,
      uncostedCount: unsettled.length - counted.length,
      pendingReturnsCents: settlementTotalCents(returns.map(returnLineOf)),
      pendingReturnsCount: returns.length,
      isFeeSet: fee !== null,
    }
  },
}

async function missingOrClosed(settlementId: string): Promise<Error> {
  const settlement = await settlementRepository.findById(settlementId)
  return settlement
    ? new SettlementClosedError(String(settlement.number))
    : new SettlementNotFoundError(settlementId)
}
