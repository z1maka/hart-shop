import type { Carrier } from '@/db/enums'
import type { ParcelStatus } from '@/features/shipping/model/parcel-tracking'

export type WaybillRecipient = {
  readonly firstName: string
  readonly lastName: string
  // Digits only, country code first: 380XXXXXXXXX.
  readonly phone: string
}

// Where the parcel goes: a point from the carrier's directory, or a door —
// a street picked from the carrier's own street directory, since a street
// typed at checkout is free text the carrier cannot route.
export type WaybillDestination =
  | { readonly kind: 'point'; readonly pointRef: string }
  | {
      readonly kind: 'door'
      readonly cityRef: string
      readonly streetRef: string
      readonly house: string
      readonly flat: string | null
    }

// One box, delivery paid by the recipient on collection.
export type WaybillRequest = {
  readonly orderNumber: string
  readonly recipient: WaybillRecipient
  readonly destination: WaybillDestination
  readonly weightGrams: number
  readonly declaredValueCents: number
  // Collected from the buyer and passed to the shop; zero when prepaid.
  readonly codCents: number
  readonly description: string
}

export type Waybill = {
  readonly ref: string
  readonly number: string
  readonly trackingUrl: string
  readonly estimatedDelivery: string | null
}

// One contract, one implementation per carrier — the same shape as the
// pickup directory. See AGENTS.md §8.
export type WaybillService = {
  readonly carrier: Carrier
  isConfigured(): boolean
  create(request: WaybillRequest): Promise<Waybill>
  remove(ref: string): Promise<void>
  // A new cash-on-delivery amount on a waybill the carrier has not taken
  // yet; the number stays. `issuedSince` bounds the search for it.
  updateCod(ref: string, codCents: number, issuedSince: Date): Promise<void>
  labelPdf(number: string): Promise<ArrayBuffer>
  // The carrier's public tracking page for a number made anywhere.
  trackingUrl(number: string): string
  // Where each parcel is now, for numbers made here or in the cabinet.
  track(numbers: readonly string[]): Promise<ParcelStatus[]>
}
