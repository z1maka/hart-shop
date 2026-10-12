import { cacheLife, cacheTag } from 'next/cache'
import { BANK_REQUISITES_TAG } from '@/config/requisites'
import { requisitesView, type BankRequisitesView } from '@/features/billing/model/bank-account'
import { bankAccountService } from '@/features/billing/services/bank-accounts'

// Changes once in a long while and is read on every bank-transfer order page
// and on «Про нас»: cached, and dropped the moment the admin changes the list.
export async function getActiveBankAccount(): Promise<BankRequisitesView | null> {
  'use cache'
  cacheTag(BANK_REQUISITES_TAG)
  cacheLife('days')

  const account = await bankAccountService.active()
  return account ? requisitesView(account) : null
}
