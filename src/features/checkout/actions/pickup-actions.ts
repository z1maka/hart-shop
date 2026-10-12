'use server'

import { z } from 'zod'
import { Carrier, DeliveryKind } from '@/db/enums'
import type { PickupPointsResult, Settlement } from '@/features/shipping'
import { pickupDirectoryFor } from '@/features/shipping'
import { actionError, actionOk, toActionError, type ActionResult } from '@/lib/action-result'

const carriers = Object.values(Carrier) as [Carrier, ...Carrier[]]
const kinds = Object.values(DeliveryKind) as [DeliveryKind, ...DeliveryKind[]]

const SettlementSearchSchema = z.object({
  carrier: z.enum(carriers),
  country: z.string().length(2),
  search: z.string().trim().max(80),
})

const PickupSearchSchema = SettlementSearchSchema.extend({
  kind: z.enum(kinds),
  settlementRef: z.string().trim().min(1).max(80),
  // The cart's weight; points that would refuse the parcel are left out by
  // the directory query itself.
  parcelWeightGrams: z.number().int().min(0).default(0),
})

export async function findSettlementsAction(input: unknown): Promise<ActionResult<Settlement[]>> {
  const parsed = SettlementSearchSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'search')

  try {
    const directory = pickupDirectoryFor(parsed.data.carrier)
    return actionOk(await directory.findSettlements(parsed.data.country, parsed.data.search))
  } catch (error) {
    return toActionError(error)
  }
}

export async function findPickupPointsAction(
  input: unknown,
): Promise<ActionResult<PickupPointsResult>> {
  const parsed = PickupSearchSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'search')

  try {
    const directory = pickupDirectoryFor(parsed.data.carrier)
    return actionOk(await directory.findPickupPoints(parsed.data))
  } catch (error) {
    return toActionError(error)
  }
}
