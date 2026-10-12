import { Carrier } from '@/db/enums'
import { requireAdminSession } from '@/features/admin/session-cookie'
import {
  apiKeyHint,
  carrierAccountRepository,
  carrierAccounts,
  type SenderWarehouse,
} from '@/features/shipping'
import { logger } from '@/lib/logger'

export type CarrierAccountView = {
  readonly id: string
  readonly name: string
  readonly keyHint: string
  readonly senderName: string
  readonly senderPhone: string
  readonly isDefault: boolean
  readonly isActive: boolean
  // Waybills issued from this cabinet since the first of the month.
  readonly issuedThisMonth: number
  // Null when the check itself could not be made — the carrier being down is
  // not the same as a key that no longer works.
  readonly isKeyWorking: boolean | null
}

export type CarrierAccountsBoard = {
  readonly accounts: readonly CarrierAccountView[]
  readonly warehouse: SenderWarehouse | null
}

export async function getCarrierAccountsBoard(): Promise<CarrierAccountsBoard> {
  await requireAdminSession()

  const [accounts, warehouse, issued] = await Promise.all([
    carrierAccountRepository.findAll(Carrier.NovaPost),
    carrierAccounts.readWarehouse(),
    carrierAccountRepository.countIssuedSince(startOfMonth()),
  ])

  const checked = await Promise.all(
    accounts.map(async (account) => ({
      id: account.id,
      name: account.name,
      keyHint: apiKeyHint(account.apiKey),
      senderName: account.senderName,
      senderPhone: account.senderPhone,
      isDefault: account.isDefault,
      isActive: account.isActive,
      issuedThisMonth: issued.get(account.id) ?? 0,
      isKeyWorking: await isKeyWorking(account.apiKey),
    })),
  )

  return { accounts: checked, warehouse }
}

// The cheapest call that proves a key opens a cabinet: who it may send as.
async function isKeyWorking(apiKey: string): Promise<boolean | null> {
  try {
    const senders = await carrierAccounts.readCabinetSenders(apiKey)
    return senders.length > 0
  } catch (error) {
    logger.warn('Carrier cabinet key check failed', { error })
    return null
  }
}

function startOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}
