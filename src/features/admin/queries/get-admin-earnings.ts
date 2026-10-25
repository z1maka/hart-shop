import { requireAdminSession } from '@/features/admin/session-cookie'
import { getEarnings, type EarningsView } from '@/features/orders'

export async function getAdminEarnings(params: {
  readonly period?: string
  readonly from?: string
  readonly to?: string
}): Promise<EarningsView> {
  await requireAdminSession()

  return getEarnings(params, new Date())
}
