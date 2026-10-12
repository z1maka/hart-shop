import type { BankAccountDraft } from '@/config/requisites'
import type { BankAccount } from '@/features/billing/model/bank-account'
import {
  bankAccountRepository,
  type BankAccountWrite,
} from '@/features/billing/repository/bank-account-repository'
import {
  BankAccountActiveError,
  BankAccountIbanTakenError,
  BankAccountNotFoundError,
} from '@/lib/errors'

export const bankAccountService = {
  async list(): Promise<BankAccount[]> {
    return bankAccountRepository.findAll()
  },

  async active(): Promise<BankAccount | null> {
    return bankAccountRepository.findActive()
  },

  async add(draft: BankAccountDraft): Promise<string> {
    return savedId(await bankAccountRepository.create(draft), 'new')
  },

  async edit(id: string, draft: BankAccountDraft): Promise<void> {
    savedId(await bankAccountRepository.update(id, draft), id)
  },

  async activate(id: string): Promise<void> {
    if (!(await bankAccountRepository.makeActive(id))) throw new BankAccountNotFoundError(id)
  },

  async remove(id: string): Promise<void> {
    if (await bankAccountRepository.removeInactive(id)) return

    throw (await bankAccountRepository.exists(id))
      ? new BankAccountActiveError(id)
      : new BankAccountNotFoundError(id)
  },
}

function savedId(write: BankAccountWrite, id: string): string {
  if (write.status === 'iban_taken') throw new BankAccountIbanTakenError()
  if (write.status === 'missing') throw new BankAccountNotFoundError(id)

  return write.id
}
