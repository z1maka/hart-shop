import { describe, expect, it } from 'vitest'
import {
  BankAccountDraftSchema,
  bankMfo,
  parseRequisitesSnapshot,
  paymentPurpose,
} from '@/config/requisites'
import {
  accountShortLabel,
  requisitesSnapshot,
  requisitesView,
} from '@/features/billing/model/bank-account'

const DRAFT = {
  name: 'Основной счёт',
  recipient: 'ФОП Косенко Микола Степанович',
  iban: 'UA17 3220 0100 0002 6005 3400 7162 5',
  taxId: '3251211798',
  bankName: 'АТ «УНІВЕРСАЛ БАНК»',
  bankEdrpou: '21133352',
}

describe('BankAccountDraftSchema', () => {
  it('accepts an account as the owner types it, keeping the IBAN unbroken', () => {
    const parsed = BankAccountDraftSchema.parse(DRAFT)

    expect(parsed.iban).toBe('UA173220010000026005340071625')
    expect(bankMfo(parsed)).toBe('322001')
  })

  it('refuses an account a buyer could not pay to', () => {
    const refuses = (patch: Partial<typeof DRAFT>) =>
      BankAccountDraftSchema.safeParse({ ...DRAFT, ...patch }).success

    expect(refuses({ iban: 'UA173220010000026005340071626' })).toBe(false)
    expect(refuses({ taxId: '12345' })).toBe(false)
    expect(refuses({ bankEdrpou: '' })).toBe(false)
    expect(refuses({ name: '' })).toBe(false)
  })
})

describe('requisitesView', () => {
  it('groups the IBAN for reading and leaves the admin name out', () => {
    const view = requisitesView(BankAccountDraftSchema.parse(DRAFT))

    expect(view.ibanGrouped).toBe('UA17 3220 0100 0002 6005 3400 7162 5')
    expect(view.iban).toBe('UA173220010000026005340071625')
    expect(view.mfo).toBe('322001')
    expect(view).not.toHaveProperty('name')
  })
})

describe('paymentPurpose', () => {
  it('names the order, so the payment can be matched to it', () => {
    expect(paymentPurpose('FOX-2026-000009')).toBe('Оплата за замовлення FOX-2026-000009')
  })
})

describe('requisitesSnapshot', () => {
  it('keeps what an order needs of the account, not the row it came from', () => {
    const account = { ...BankAccountDraftSchema.parse(DRAFT), id: 'account-1', isActive: true }

    expect(requisitesSnapshot(account)).toEqual({
      name: 'Основной счёт',
      recipient: 'ФОП Косенко Микола Степанович',
      iban: 'UA173220010000026005340071625',
      taxId: '3251211798',
      bankName: 'АТ «УНІВЕРСАЛ БАНК»',
      bankEdrpou: '21133352',
    })
  })
})

describe('parseRequisitesSnapshot', () => {
  it('reads the account an order keeps', () => {
    expect(parseRequisitesSnapshot(BankAccountDraftSchema.parse(DRAFT))?.iban).toBe(
      'UA173220010000026005340071625',
    )
  })

  it('treats a missing or damaged copy as absent, so the page falls back instead of failing', () => {
    expect(parseRequisitesSnapshot(null)).toBeNull()
    expect(parseRequisitesSnapshot({ ...DRAFT, iban: undefined })).toBeNull()
    expect(parseRequisitesSnapshot('not an account')).toBeNull()
  })
})

describe('accountShortLabel', () => {
  it('tells accounts apart by name, bank and the last digits', () => {
    expect(accountShortLabel(BankAccountDraftSchema.parse(DRAFT))).toBe(
      'Основной счёт · АТ «УНІВЕРСАЛ БАНК» · IBAN …1625',
    )
  })
})
