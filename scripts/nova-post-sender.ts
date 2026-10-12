import 'dotenv/config'
import { z } from 'zod'
import { novaPoshtaCall } from '@/lib/nova-post'

// Prints what NOVA_POST_SENDER_* want: the cabinet's sender counterparty,
// its contact persons, and the branch parcels leave from.
// Usage: pnpm nova-post:sender "Миколаїв" 30

const SenderSchema = z.object({ Ref: z.string(), Description: z.string() })
const ContactSchema = z.object({ Ref: z.string(), Description: z.string(), Phones: z.string() })
const WarehouseSchema = z.object({ Ref: z.string(), CityRef: z.string(), Description: z.string() })

async function main(): Promise<void> {
  const [cityName, branchNumber] = process.argv.slice(2)

  const senders = z
    .array(SenderSchema)
    .parse(
      await novaPoshtaCall('Counterparty', 'getCounterparties', { CounterpartyProperty: 'Sender' }),
    )
  for (const sender of senders) {
    console.info(`NOVA_POST_SENDER_REF=${sender.Ref}  # ${sender.Description}`)
    const contacts = z
      .array(ContactSchema)
      .parse(
        await novaPoshtaCall('Counterparty', 'getCounterpartyContactPersons', { Ref: sender.Ref }),
      )
    for (const contact of contacts) {
      console.info(
        `NOVA_POST_SENDER_CONTACT_REF=${contact.Ref}  # ${contact.Description}, ${contact.Phones}`,
      )
    }
  }

  if (!cityName || !branchNumber) return

  const warehouses = z.array(WarehouseSchema).parse(
    await novaPoshtaCall('Address', 'getWarehouses', {
      CityName: cityName,
      WarehouseId: branchNumber,
      Limit: '5',
      Page: '1',
    }),
  )
  for (const warehouse of warehouses) {
    console.info(`NOVA_POST_SENDER_CITY_REF=${warehouse.CityRef}`)
    console.info(`NOVA_POST_SENDER_WAREHOUSE_REF=${warehouse.Ref}  # ${warehouse.Description}`)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
