import type { Carrier, DeliveryKind } from '@/db/enums'

export type PickupPoint = {
  readonly ref: string
  readonly name: string
  readonly address: string
  readonly maxWeightGrams: number | null
}

// A point with where it is and what it is — what an order is checked
// against before a waybill names it.
export type LocatedPickupPoint = PickupPoint & {
  readonly kind: DeliveryKind
  readonly settlementRef: string
}

export type Street = {
  readonly ref: string
  // With its type, as the label prints it: "вул. Хрещатик".
  readonly name: string
}

export type Settlement = {
  readonly ref: string
  readonly name: string
  readonly region: string | null
}

export type PickupQuery = {
  readonly carrier: Carrier
  readonly kind: DeliveryKind
  readonly country: string
  readonly settlementRef?: string
  readonly search: string
  // The cart's weight; zero when unknown, which hides nothing.
  readonly parcelWeightGrams: number
}

export type PickupPointsResult = {
  readonly points: readonly PickupPoint[]
  // Points in the same search that would refuse a parcel this heavy.
  readonly hiddenByWeight: number
}

// One contract, one implementation per carrier. Nova Post has a directory of
// branches and lockers; the others deliver to the door and answer with nothing.
// See AGENTS.md §18.
export type PickupDirectory = {
  readonly carrier: Carrier
  findSettlements(country: string, search: string): Promise<Settlement[]>
  findPickupPoints(query: PickupQuery): Promise<PickupPointsResult>
  findPickupPoint(ref: string): Promise<LocatedPickupPoint | null>
  // Several at once; refs the directory does not know are simply missing.
  findPickupPointsByRefs(refs: readonly string[]): Promise<LocatedPickupPoint[]>
  // For a courier to the door: streets of one settlement, by a typed part.
  findStreets(settlementRef: string, search: string): Promise<Street[]>
}
