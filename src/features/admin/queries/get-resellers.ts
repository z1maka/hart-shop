import { requireAdminSession } from '@/features/admin/session-cookie'
import { resellerService, type Reseller } from '@/features/resellers'

export type ResellerView = Reseller

// Straight from the table: the list must show a partner added a second ago.
export async function getResellersBoard(): Promise<readonly ResellerView[]> {
  await requireAdminSession()
  return resellerService.list()
}

export async function getActiveResellers(): Promise<readonly ResellerView[]> {
  await requireAdminSession()
  return resellerService.listActive()
}
