// Where a parcel is on its way to the buyer, as far as the shop cares: each
// carrier's dozens of tracking states fold into these few.
export const ParcelStage = {
  // The waybill exists; the box has not reached the carrier yet.
  Created: 'created',
  InTransit: 'in_transit',
  // Waiting at the branch or in the locker for the buyer.
  Arrived: 'arrived',
  Received: 'received',
  // Refused at the branch, or left unclaimed: on its way back to the shop.
  Refused: 'refused',
  // Deleted in the cabinet, or a number the carrier does not know.
  Missing: 'missing',
  // A state not mapped yet; the carrier's own words still show.
  Unknown: 'unknown',
} as const

export type ParcelStage = (typeof ParcelStage)[keyof typeof ParcelStage]

const PARCEL_STAGES: ReadonlySet<string> = new Set(Object.values(ParcelStage))

// A stage read back from the database, where it is stored as text.
export function isParcelStage(value: string | null): value is ParcelStage {
  return value !== null && PARCEL_STAGES.has(value)
}

export type ParcelStatus = {
  readonly number: string
  readonly stage: ParcelStage
  // The carrier's own words, for the order page: "Прибув у відділення".
  readonly statusText: string
}

// Nova Poshta's tracking codes (TrackingDocument.getStatusDocuments,
// StatusCode), grouped by what they mean for the order.
const NOVA_POST_STAGES: Readonly<Record<string, ParcelStage>> = {
  '1': ParcelStage.Created,
  '12': ParcelStage.Created,
  '4': ParcelStage.InTransit,
  '41': ParcelStage.InTransit,
  '5': ParcelStage.InTransit,
  '6': ParcelStage.InTransit,
  '101': ParcelStage.InTransit,
  // Address changed, a failed delivery attempt, a delivery date moved: all
  // still on the way.
  '104': ParcelStage.InTransit,
  '111': ParcelStage.InTransit,
  '112': ParcelStage.InTransit,
  '7': ParcelStage.Arrived,
  '8': ParcelStage.Arrived,
  '14': ParcelStage.Arrived,
  '9': ParcelStage.Received,
  '10': ParcelStage.Received,
  '11': ParcelStage.Received,
  '106': ParcelStage.Received,
  '102': ParcelStage.Refused,
  '103': ParcelStage.Refused,
  '108': ParcelStage.Refused,
  // Storage ran out at the branch: the parcel goes back like a refusal.
  '105': ParcelStage.Refused,
  '2': ParcelStage.Missing,
  '3': ParcelStage.Missing,
}

export function novaPostParcelStage(statusCode: string): ParcelStage {
  return NOVA_POST_STAGES[statusCode] ?? ParcelStage.Unknown
}
