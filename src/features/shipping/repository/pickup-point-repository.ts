import {
  and,
  asc,
  count,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'
import type { Carrier, DeliveryKind } from '@/db/enums'
import { pickupPoints } from '@/db/schema'
import type { PickupPoint } from '@/features/shipping/model/pickup-directory'
import { db } from '@/lib/db'
import { escapeLikePattern } from '@/lib/sql'

export type PickupPointRecord = PickupPoint & {
  readonly carrier: Carrier
  readonly settlementRef: string
  readonly kind: DeliveryKind
  readonly number: number
}

const RECORD_COLUMNS = {
  carrier: pickupPoints.carrier,
  ref: pickupPoints.ref,
  settlementRef: pickupPoints.settlementRef,
  kind: pickupPoints.kind,
  number: pickupPoints.number,
  name: pickupPoints.name,
  address: pickupPoints.address,
  maxWeightGrams: pickupPoints.maxWeightGrams,
}

export type PickupPointFilter = {
  readonly carrier: Carrier
  readonly settlementRef: string
  readonly kind: DeliveryKind
  readonly search: string
  // Zero leaves every point in; a point with no stated limit always fits.
  readonly parcelWeightGrams: number
}

// Same city, same kind, same typed search — the part both queries share.
function matching(filter: PickupPointFilter): SQL | undefined {
  const search = filter.search.trim()
  const pattern = `%${escapeLikePattern(search)}%`

  return and(
    eq(pickupPoints.carrier, filter.carrier),
    eq(pickupPoints.settlementRef, filter.settlementRef),
    eq(pickupPoints.kind, filter.kind),
    search
      ? or(ilike(pickupPoints.name, pattern), ilike(pickupPoints.address, pattern))
      : undefined,
  )
}

function acceptsParcel(weightGrams: number): SQL | undefined {
  if (weightGrams <= 0) return undefined
  return or(isNull(pickupPoints.maxWeightGrams), gte(pickupPoints.maxWeightGrams, weightGrams))
}

export const pickupPointRepository = {
  async findInSettlement(filter: PickupPointFilter, limit: number): Promise<PickupPoint[]> {
    return db
      .select({
        ref: pickupPoints.ref,
        name: pickupPoints.name,
        address: pickupPoints.address,
        maxWeightGrams: pickupPoints.maxWeightGrams,
      })
      .from(pickupPoints)
      .where(and(matching(filter), acceptsParcel(filter.parcelWeightGrams)))
      .orderBy(asc(pickupPoints.number))
      .limit(limit)
  },

  async countTooSmall(filter: PickupPointFilter): Promise<number> {
    if (filter.parcelWeightGrams <= 0) return 0

    const [row] = await db
      .select({ total: count() })
      .from(pickupPoints)
      .where(and(matching(filter), lt(pickupPoints.maxWeightGrams, filter.parcelWeightGrams)))
    return row?.total ?? 0
  },

  // Whether the copy was ever filled: an empty answer then means "none here",
  // not "the nightly sync has not run yet".
  async hasAny(carrier: Carrier): Promise<boolean> {
    const [row] = await db
      .select({ ref: pickupPoints.ref })
      .from(pickupPoints)
      .where(eq(pickupPoints.carrier, carrier))
      .limit(1)
    return row !== undefined
  },

  async findByRef(carrier: Carrier, ref: string): Promise<PickupPointRecord | null> {
    const [row] = await db
      .select(RECORD_COLUMNS)
      .from(pickupPoints)
      .where(and(eq(pickupPoints.carrier, carrier), eq(pickupPoints.ref, ref)))
      .limit(1)

    return row ?? null
  },

  async findByRefs(carrier: Carrier, refs: readonly string[]): Promise<PickupPointRecord[]> {
    if (refs.length === 0) return []

    return db
      .select(RECORD_COLUMNS)
      .from(pickupPoints)
      .where(and(eq(pickupPoints.carrier, carrier), inArray(pickupPoints.ref, [...refs])))
  },

  async upsertMany(records: readonly PickupPointRecord[], syncedAt: Date): Promise<void> {
    if (records.length === 0) return

    await db
      .insert(pickupPoints)
      .values(records.map((record) => ({ ...record, syncedAt })))
      .onConflictDoUpdate({
        target: [pickupPoints.carrier, pickupPoints.ref],
        set: {
          settlementRef: sql`excluded.settlement_ref`,
          kind: sql`excluded.kind`,
          number: sql`excluded.number`,
          name: sql`excluded.name`,
          address: sql`excluded.address`,
          maxWeightGrams: sql`excluded.max_weight_grams`,
          syncedAt: sql`excluded.synced_at`,
        },
      })
  },

  // Points the carrier closed or took off its directory: the last full sync
  // did not touch them.
  async deleteSyncedBefore(carrier: Carrier, before: Date): Promise<number> {
    const removed = await db
      .delete(pickupPoints)
      .where(and(eq(pickupPoints.carrier, carrier), lt(pickupPoints.syncedAt, before)))
      .returning({ ref: pickupPoints.ref })

    return removed.length
  },
}
