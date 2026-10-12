import { bankMfo, type BankAccountDraft, type BankRequisites } from '@/config/requisites'
import { groupIban, ibanTail } from '@/lib/iban'

export type BankAccount = BankAccountDraft & {
  readonly id: string
  // The one account the site shows to buyers paying by transfer.
  readonly isActive: boolean
}

export type BankRequisitesView = BankRequisites & {
  // Grouped by four for reading; `iban` stays unbroken for the copy button,
  // since a banking app rejects the spaces.
  readonly ibanGrouped: string
  readonly mfo: string
}

// What an order keeps of the account it was told to pay to: the payment
// fields and the admin's name for it, not the row it came from.
export function requisitesSnapshot(account: BankAccount): BankAccountDraft {
  return {
    name: account.name,
    recipient: account.recipient,
    iban: account.iban,
    taxId: account.taxId,
    bankName: account.bankName,
    bankEdrpou: account.bankEdrpou,
  }
}

// How the admin tells accounts apart at a glance.
export function accountShortLabel(account: BankAccountDraft): string {
  return `${account.name} · ${account.bankName} · IBAN …${ibanTail(account.iban)}`
}

export function requisitesView(requisites: BankRequisites): BankRequisitesView {
  return {
    recipient: requisites.recipient,
    iban: requisites.iban,
    taxId: requisites.taxId,
    bankName: requisites.bankName,
    bankEdrpou: requisites.bankEdrpou,
    ibanGrouped: groupIban(requisites.iban),
    mfo: bankMfo(requisites),
  }
}
