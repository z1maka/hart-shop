import { Carrier } from '@/db/enums'
import type { CarrierAccount } from '@/features/shipping/model/carrier-account'
import type { WaybillService } from '@/features/shipping/model/waybill'
import { carrierAccounts } from '@/features/shipping/services/carrier-accounts'
import {
  envSendingBranch,
  novaPostWaybills,
  novaPostWaybillsFor,
} from '@/features/shipping/services/nova-post-waybills'

// The only place that maps a carrier to the service issuing its waybills.
const SERVICES: Record<Carrier, WaybillService> = {
  [Carrier.NovaPost]: novaPostWaybills,
}

export function waybillServiceFor(carrier: Carrier): WaybillService {
  return SERVICES[carrier]
}

export type CabinetService = {
  readonly service: WaybillService
  // Null while the shop still runs on the single cabinet from the
  // environment; the order then has nothing to pin.
  readonly account: CarrierAccount | null
}

// The service for one order's cabinet: the one its waybill was issued from,
// or the default for a waybill about to be issued. Printing and deleting a
// document only work with the key that created it, so this is what every
// call about an existing waybill goes through.
export async function cabinetServiceFor(
  carrier: Carrier,
  accountId: string | null,
): Promise<CabinetService> {
  const account = await carrierAccounts.resolve(carrier, accountId)
  if (!account || carrier !== Carrier.NovaPost) {
    return { service: waybillServiceFor(carrier), account: null }
  }

  // The branch picked in settings, or the one from the environment: a cabinet
  // must not be dropped for want of a setting the shop never needed before.
  const warehouse = (await carrierAccounts.readWarehouse()) ?? envSendingBranch()
  if (!warehouse) return { service: waybillServiceFor(carrier), account: null }

  return {
    service: novaPostWaybillsFor({
      apiKey: account.apiKey,
      sender: {
        ref: account.senderRef,
        contactRef: account.senderContactRef,
        cityRef: warehouse.cityRef,
        warehouseRef: warehouse.warehouseRef,
        phone: account.senderPhone.replace(/\D/g, ''),
      },
    }),
    account,
  }
}
