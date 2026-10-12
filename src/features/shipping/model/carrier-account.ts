// A carrier cabinet as the shop uses it: the key calls are made with, and
// the counterparty the waybill is issued from. The branch parcels leave from
// is shared by every cabinet and kept apart, in the shop's settings.
export type CarrierAccount = {
  readonly id: string
  readonly name: string
  readonly apiKey: string
  readonly senderRef: string
  readonly senderContactRef: string
  readonly senderName: string
  readonly senderPhone: string
  readonly isDefault: boolean
  readonly isActive: boolean
}

// Where parcels are handed over. One for the whole shop: the workshop packs
// in one place whichever cabinet the waybill is written from.
export type SenderWarehouse = {
  readonly cityRef: string
  readonly warehouseRef: string
  // What a human reads in the admin: «Миколаїв · Відділення №30».
  readonly label: string
}

export const SENDER_WAREHOUSE_KEY = 'nova_post.sender_warehouse'

// What a cabinet's key looks like once it is stored: the shop shows the tail
// so two cabinets can be told apart without printing the key.
export function apiKeyHint(apiKey: string): string {
  return apiKey.slice(-4)
}
