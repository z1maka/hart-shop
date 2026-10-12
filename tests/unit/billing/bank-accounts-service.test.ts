import { beforeEach, describe, expect, it, vi } from 'vitest'

const repository = vi.hoisted(() => ({
  findAll: vi.fn(),
  findActive: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  makeActive: vi.fn(),
  removeInactive: vi.fn(),
  exists: vi.fn(),
}))

vi.mock('@/features/billing/repository/bank-account-repository', () => ({
  bankAccountRepository: repository,
}))

import { bankAccountService } from '@/features/billing/services/bank-accounts'

const DRAFT = {
  name: 'Основной счёт',
  recipient: 'ФОП Косенко Микола Степанович',
  iban: 'UA173220010000026005340071625',
  taxId: '3251211798',
  bankName: 'АТ «УНІВЕРСАЛ БАНК»',
  bankEdrpou: '21133352',
}

const ID = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('bankAccountService.add', () => {
  it('returns the new account id', async () => {
    repository.create.mockResolvedValue({ status: 'saved', id: ID })

    await expect(bankAccountService.add(DRAFT)).resolves.toBe(ID)
  })

  it('refuses an IBAN already on the list', async () => {
    repository.create.mockResolvedValue({ status: 'iban_taken' })

    await expect(bankAccountService.add(DRAFT)).rejects.toMatchObject({
      code: 'BANK_ACCOUNT_IBAN_TAKEN',
    })
  })
})

describe('bankAccountService.edit', () => {
  it('refuses to take another account’s IBAN', async () => {
    repository.update.mockResolvedValue({ status: 'iban_taken' })

    await expect(bankAccountService.edit(ID, DRAFT)).rejects.toMatchObject({
      code: 'BANK_ACCOUNT_IBAN_TAKEN',
    })
  })

  it('says so when the account is gone', async () => {
    repository.update.mockResolvedValue({ status: 'missing' })

    await expect(bankAccountService.edit(ID, DRAFT)).rejects.toMatchObject({
      code: 'BANK_ACCOUNT_NOT_FOUND',
    })
  })
})

describe('bankAccountService.activate', () => {
  it('says so when the account is gone', async () => {
    repository.makeActive.mockResolvedValue(false)

    await expect(bankAccountService.activate(ID)).rejects.toMatchObject({
      code: 'BANK_ACCOUNT_NOT_FOUND',
    })
  })
})

describe('bankAccountService.remove', () => {
  it('deletes an account the site does not show', async () => {
    repository.removeInactive.mockResolvedValue(true)

    await expect(bankAccountService.remove(ID)).resolves.toBeUndefined()
  })

  it('never deletes the active account', async () => {
    // A buyer mid-payment must always find an account on their order page.
    repository.removeInactive.mockResolvedValue(false)
    repository.exists.mockResolvedValue(true)

    await expect(bankAccountService.remove(ID)).rejects.toMatchObject({
      code: 'BANK_ACCOUNT_ACTIVE',
    })
  })

  it('says so when the account is already gone', async () => {
    repository.removeInactive.mockResolvedValue(false)
    repository.exists.mockResolvedValue(false)

    await expect(bankAccountService.remove(ID)).rejects.toMatchObject({
      code: 'BANK_ACCOUNT_NOT_FOUND',
    })
  })
})
