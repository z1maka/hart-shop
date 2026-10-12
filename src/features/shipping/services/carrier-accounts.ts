import { z } from 'zod'
import { Carrier } from '@/db/enums'
import {
  SENDER_WAREHOUSE_KEY,
  type CarrierAccount,
  type SenderWarehouse,
} from '@/features/shipping/model/carrier-account'
import { carrierAccountRepository } from '@/features/shipping/repository/carrier-account-repository'
import { CarrierAnswerMalformedError } from '@/lib/errors'
import { novaPoshtaCall } from '@/lib/nova-post'
import { readShopSetting, writeShopSetting } from '@/lib/shop-settings'

// What a cabinet's key gives access to: the counterparties a waybill can be
// issued from, and the people it can be signed by. Read straight after the
// key is entered, so a wrong key is caught before it is saved.
const SenderSchema = z.object({
  Ref: z.string().min(1),
  Description: z.string().default(''),
})

const ContactSchema = z.object({
  Ref: z.string().min(1),
  Description: z.string().default(''),
  Phones: z.string().default(''),
})

export type CabinetSender = {
  readonly ref: string
  readonly name: string
  readonly contacts: readonly { ref: string; name: string; phone: string }[]
}

export const carrierAccounts = {
  // The cabinet a waybill belongs to: the one it was issued from, or the
  // default for anything new. Null means the shop still runs on env alone.
  async resolve(carrier: Carrier, pinnedId: string | null): Promise<CarrierAccount | null> {
    if (pinnedId) {
      const pinned = await carrierAccountRepository.findById(pinnedId)
      if (pinned) return pinned
    }

    return carrierAccountRepository.findDefault(carrier)
  },

  async listActive(carrier: Carrier): Promise<CarrierAccount[]> {
    const all = await carrierAccountRepository.findAll(carrier)
    return all.filter((account) => account.isActive)
  },

  async readWarehouse(): Promise<SenderWarehouse | null> {
    return readShopSetting<SenderWarehouse>(SENDER_WAREHOUSE_KEY)
  },

  async writeWarehouse(warehouse: SenderWarehouse): Promise<void> {
    await writeShopSetting(SENDER_WAREHOUSE_KEY, warehouse)
  },

  // Asks the cabinet who it can send as. A key that is wrong or revoked
  // fails here, before anything is stored.
  async readCabinetSenders(apiKey: string): Promise<CabinetSender[]> {
    const senders = parse(
      z.array(SenderSchema),
      await novaPoshtaCall(
        'Counterparty',
        'getCounterparties',
        { CounterpartyProperty: 'Sender' },
        apiKey,
      ),
    )

    return Promise.all(
      senders.map(async (sender) => ({
        ref: sender.Ref,
        name: sender.Description,
        contacts: parse(
          z.array(ContactSchema),
          await novaPoshtaCall(
            'Counterparty',
            'getCounterpartyContactPersons',
            { Ref: sender.Ref },
            apiKey,
          ),
        ).map((contact) => ({
          ref: contact.Ref,
          name: contact.Description,
          phone: contact.Phones,
        })),
      })),
    )
  },
}

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    throw new CarrierAnswerMalformedError(Carrier.NovaPost, 'Counterparty')
  }

  return parsed.data
}
