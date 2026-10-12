import { z } from 'zod'
import { Carrier, DeliveryKind } from '@/db/enums'
import type {
  LocatedPickupPoint,
  PickupDirectory,
  PickupPointsResult,
  PickupQuery,
  Settlement,
  Street,
} from '@/features/shipping/model/pickup-directory'
import { pickupPointRepository } from '@/features/shipping/repository/pickup-point-repository'
import { CarrierUnavailableError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { isNovaPostConfigured, novaPoshtaCall } from '@/lib/nova-post'

const SETTLEMENT_LIMIT = '20'
const STREET_LIMIT = '20'
const MIN_STREET_SEARCH_LENGTH = 2
const MAX_POINTS = 60
const MIN_SEARCH_LENGTH = 3

// Their responses are external data, so they are parsed rather than trusted.
const SettlementSearchSchema = z.array(
  z.object({
    Addresses: z
      .array(
        z.object({
          Present: z.string(),
          MainDescription: z.string(),
          SettlementTypeCode: z.string(),
          DeliveryCity: z.string(),
          Warehouses: z.coerce.number(),
        }),
      )
      .default([]),
  }),
)

const StreetSchema = z.array(
  z.object({
    Ref: z.string().min(1),
    Description: z.string(),
    StreetsType: z.string().default(''),
  }),
)

export const novaPostDirectory: PickupDirectory = {
  carrier: Carrier.NovaPost,

  // Their search already puts the city before its namesake villages and
  // understands Russian spellings ("Киев" finds Київ).
  async findSettlements(_country: string, search: string): Promise<Settlement[]> {
    // Not configured is not "nothing found": the checkout has to say the list
    // is unavailable and offer the courier instead.
    if (!isNovaPostConfigured()) throw new CarrierUnavailableError(Carrier.NovaPost, 0)
    if (search.trim().length < MIN_SEARCH_LENGTH) return []

    const data = await novaPoshtaCall('Address', 'searchSettlements', {
      CityName: search.trim(),
      Limit: SETTLEMENT_LIMIT,
      Page: '1',
    })

    const [first] = SettlementSearchSchema.parse(data)
    return (first?.Addresses ?? [])
      .filter((entry) => entry.Warehouses > 0 && entry.DeliveryCity !== '')
      .map((entry) => ({
        ref: entry.DeliveryCity,
        name: `${entry.SettlementTypeCode} ${entry.MainDescription}`,
        region: entry.Present.split(', ').slice(1).join(', ') || null,
      }))
  },

  // Read from the local copy (nova-post-directory-sync): their directory
  // method allows about one call a second per key.
  async findPickupPoints(query: PickupQuery): Promise<PickupPointsResult> {
    if (query.kind === DeliveryKind.Courier || !query.settlementRef) {
      return { points: [], hiddenByWeight: 0 }
    }

    const filter = {
      carrier: Carrier.NovaPost,
      settlementRef: query.settlementRef,
      kind: query.kind,
      search: query.search,
      parcelWeightGrams: query.parcelWeightGrams,
    }
    const [points, hiddenByWeight] = await Promise.all([
      pickupPointRepository.findInSettlement(filter, MAX_POINTS),
      pickupPointRepository.countTooSmall(filter),
    ])

    // An empty copy is an outage the checkout must show as one — it then
    // offers the courier — rather than "no branches in this city".
    const isEmptyAnswer = points.length === 0 && hiddenByWeight === 0
    if (isEmptyAnswer && !(await pickupPointRepository.hasAny(Carrier.NovaPost))) {
      logger.error('Pick-up point copy is empty; run the directory sync')
      throw new CarrierUnavailableError(Carrier.NovaPost, 0)
    }
    return { points, hiddenByWeight }
  },

  findPickupPoint(ref: string): Promise<LocatedPickupPoint | null> {
    return pickupPointRepository.findByRef(Carrier.NovaPost, ref)
  },
  findPickupPointsByRefs(refs: readonly string[]): Promise<LocatedPickupPoint[]> {
    return pickupPointRepository.findByRefs(Carrier.NovaPost, refs)
  },
  async findStreets(settlementRef: string, search: string): Promise<Street[]> {
    if (!isNovaPostConfigured()) throw new CarrierUnavailableError(Carrier.NovaPost, 0)
    if (search.trim().length < MIN_STREET_SEARCH_LENGTH) return []

    const data = await novaPoshtaCall('Address', 'getStreet', {
      CityRef: settlementRef,
      FindByString: search.trim(),
      Limit: STREET_LIMIT,
      Page: '1',
    })
    return StreetSchema.parse(data).map((street) => ({
      ref: street.Ref,
      name: [street.StreetsType, street.Description].filter(Boolean).join(' '),
    }))
  },
}
