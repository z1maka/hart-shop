'use server'

import { z } from 'zod'
import { readAdminSession } from '@/features/admin'
import { validationFailed } from '@/features/admin/model/validation-hints'
import { isCalendarDay } from '@/features/invoices'
import {
  hryvniasToCents,
  isSettlementPeriod,
  percentToBasisPoints,
} from '@/features/settlements/model/settlement'
import { settlementService } from '@/features/settlements/services/settlement-service'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'
import { formatDateIsoKyiv } from '@/lib/datetime'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const isoDay = z.string().regex(ISO_DATE).refine(isCalendarDay, 'такой даты нет')
// One page of parcels at most: the picker lists no more.
const MAX_ORDERS_PER_SETTLEMENT = 700

const CreateSchema = z
  .object({
    periodFrom: isoDay,
    periodTo: isoDay,
    saleOrderIds: z.array(z.uuid()).max(MAX_ORDERS_PER_SETTLEMENT),
    returnOrderIds: z.array(z.uuid()).max(MAX_ORDERS_PER_SETTLEMENT),
  })
  .refine((input) => isSettlementPeriod(input.periodFrom, input.periodTo), {
    path: ['periodTo'],
    message: 'не раньше начала и не длиннее года',
  })
  .refine((input) => input.saleOrderIds.length + input.returnOrderIds.length > 0, {
    path: ['saleOrderIds'],
    message: 'отметьте хотя бы один заказ',
  })

const PaidSchema = z.object({
  settlementId: z.uuid(),
  // The day the money came, not later than today.
  paidOn: isoDay.refine((day) => day <= formatDateIsoKyiv(new Date()), 'не позже сегодняшнего дня'),
})

const DeleteSchema = z.object({ settlementId: z.uuid() })

const FeeSchema = z.object({
  percent: z
    .string()
    .transform(percentToBasisPoints)
    .refine((value) => value !== null, 'число процентов, например 2 или 1,5'),
  fixed: z
    .string()
    .transform(hryvniasToCents)
    .refine((value) => value !== null, 'сумма в гривнах, например 20'),
})

export async function createSettlementAction(input: unknown): Promise<ActionResult<string>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = CreateSchema.safeParse(input)
  if (!parsed.success) return validationFailed(parsed.error)

  try {
    const settlement = await settlementService.create(parsed.data)
    return actionOk(settlement.id)
  } catch (error) {
    return toActionError(error)
  }
}

export async function markSettlementPaidAction(input: unknown): Promise<ActionResult<number>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = PaidSchema.safeParse(input)
  if (!parsed.success) return validationFailed(parsed.error)

  try {
    const settlement = await settlementService.markPaid(
      parsed.data.settlementId,
      parsed.data.paidOn,
    )
    return actionOk(settlement.number)
  } catch (error) {
    return toActionError(error)
  }
}

export async function deleteSettlementAction(input: unknown): Promise<ActionResult<number>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = DeleteSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'settlementId')

  try {
    const settlement = await settlementService.delete(parsed.data.settlementId)
    return actionOk(settlement.number)
  } catch (error) {
    return toActionError(error)
  }
}

export async function saveCodFeeAction(input: unknown): Promise<ActionResult<null>> {
  const session = await readAdminSession()
  if (!session) return actionError('UNAUTHORIZED', 'Sign in again.')

  const parsed = FeeSchema.safeParse(input)
  if (!parsed.success) return validationFailed(parsed.error)

  const { percent, fixed } = parsed.data
  if (percent === null || fixed === null) return actionError('VALIDATION_FAILED', 'percent')
  try {
    await settlementService.saveCodFee({ basisPoints: percent, fixedCents: fixed })
    return actionOk(null)
  } catch (error) {
    return toActionError(error)
  }
}
