import { requireAdminSession } from '@/features/admin/session-cookie'
import { bankAccountService, requisitesView, type BankRequisitesView } from '@/features/billing'

export type BankAccountView = BankRequisitesView & {
  readonly id: string
  readonly name: string
  readonly isActive: boolean
}

// Read straight from the table, never from the storefront cache: the list
// must show a change made a second ago.
export async function getBankAccountsBoard(): Promise<readonly BankAccountView[]> {
  await requireAdminSession()

  const accounts = await bankAccountService.list()

  return accounts.map((account) => ({
    ...requisitesView(account),
    id: account.id,
    name: account.name,
    isActive: account.isActive,
  }))
}
