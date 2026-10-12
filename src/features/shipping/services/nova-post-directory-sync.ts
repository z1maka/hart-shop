import { z } from 'zod'
import { Carrier, DeliveryKind } from '@/db/enums'
import { receivingLimitGrams } from '@/features/shipping/model/parcel-fit'
import {
  pickupPointRepository,
  type PickupPointRecord,
} from '@/features/shipping/repository/pickup-point-repository'
import { CarrierUnavailableError, DirectorySyncIncompleteError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { isNovaPostConfigured, novaPoshtaPage } from '@/lib/nova-post'

// About a second a page on their side; the whole country (~55k points) fits
// a cron run with room to spare.
const PAGE_SIZE = 1000

// A handful of odd rows is their data entry; more than this share means
// their format changed and the copy must not be rebuilt from it.
const MAX_MALFORMED_SHARE = 0.01
const LOGGED_SAMPLE_SIZE = 5

// Partner points — "Пункт приймання-видачі" (Store) and "Пункт №5xxxx" in a
// shop or a petrol station (DropOff, despite the name) — hand parcels out like
// a branch and are often the only Nova Poshta a village has; the owner's own
// waybills to both were delivered. Fulfilment centres are not for buyers.
const KIND_BY_CATEGORY: Readonly<Record<string, DeliveryKind>> = {
  Branch: DeliveryKind.Branch,
  Store: DeliveryKind.Branch,
  DropOff: DeliveryKind.Branch,
  Postomat: DeliveryKind.Locker,
}
const IGNORED_CATEGORIES: ReadonlySet<string> = new Set(['Fulfillment'])
const WORKING_STATUS = 'Working'

const WarehouseSchema = z.object({
  Ref: z.string().min(1),
  CityRef: z.string().min(1),
  Description: z.string(),
  ShortAddress: z.string(),
  Number: z.coerce.number().int(),
  CategoryOfWarehouse: z.string(),
  WarehouseStatus: z.string(),
  PlaceMaxWeightAllowed: z.coerce.number(),
  TotalMaxWeightAllowed: z.coerce.number(),
})

type Warehouse = z.infer<typeof WarehouseSchema>

export type DirectorySyncReport = {
  readonly fetched: number
  readonly stored: number
  readonly malformed: number
  readonly removed: number
}

type PageTally = {
  readonly fetched: number
  readonly stored: number
  readonly malformed: readonly unknown[]
  readonly unknownCategories: ReadonlySet<string>
}

const EMPTY_TALLY: PageTally = {
  fetched: 0,
  stored: 0,
  malformed: [],
  unknownCategories: new Set(),
}

// The stale rows are removed only once every page of their directory has
// arrived: a page cut short would otherwise wipe whole regions off the
// checkout until the next night.
export async function syncNovaPostDirectory(): Promise<DirectorySyncReport> {
  if (!isNovaPostConfigured()) throw new CarrierUnavailableError(Carrier.NovaPost, 0)

  const syncedAt = new Date()
  const { tally, expected } = await storeAllPages(syncedAt)
  reportOddities(tally)

  const isComplete = expected > 0 && tally.fetched >= expected
  const isReadable = tally.malformed.length <= tally.fetched * MAX_MALFORMED_SHARE
  if (!isComplete || !isReadable) {
    throw new DirectorySyncIncompleteError(Carrier.NovaPost, tally.fetched, expected)
  }

  const removed = await pickupPointRepository.deleteSyncedBefore(Carrier.NovaPost, syncedAt)
  return {
    fetched: tally.fetched,
    stored: tally.stored,
    malformed: tally.malformed.length,
    removed,
  }
}

async function storeAllPages(
  syncedAt: Date,
): Promise<{ readonly tally: PageTally; readonly expected: number }> {
  const first = await storePage(1, syncedAt)
  const pageCount = Math.ceil(first.totalCount / PAGE_SIZE)

  let tally = addPage(EMPTY_TALLY, first)
  for (let page = 2; page <= pageCount; page += 1) {
    const next = await storePage(page, syncedAt)
    // An empty page before the total is reached is their hiccup, not the end.
    if (next.warehouses.length === 0) break
    tally = addPage(tally, next)
  }
  return { tally, expected: first.totalCount }
}

type StoredPage = {
  readonly totalCount: number
  readonly warehouses: readonly Warehouse[]
  readonly records: readonly PickupPointRecord[]
  readonly malformed: readonly unknown[]
}

async function storePage(page: number, syncedAt: Date): Promise<StoredPage> {
  const { items, totalCount } = await novaPoshtaPage('Address', 'getWarehouses', {
    Limit: String(PAGE_SIZE),
    Page: String(page),
  })

  const parsed = items.map((item) => WarehouseSchema.safeParse(item))
  const warehouses = parsed.flatMap((result) => (result.success ? [result.data] : []))
  const malformed = items.filter((_, index) => !parsed[index]?.success)
  const records = warehouses.flatMap(toCollectableRecord)
  await pickupPointRepository.upsertMany(records, syncedAt)

  return { totalCount, warehouses, records, malformed }
}

function addPage(tally: PageTally, page: StoredPage): PageTally {
  const unknown = page.warehouses
    .map((warehouse) => warehouse.CategoryOfWarehouse)
    .filter((category) => !(category in KIND_BY_CATEGORY) && !IGNORED_CATEGORIES.has(category))

  return {
    fetched: tally.fetched + page.warehouses.length + page.malformed.length,
    stored: tally.stored + page.records.length,
    malformed: [...tally.malformed, ...page.malformed],
    unknownCategories: new Set([...tally.unknownCategories, ...unknown]),
  }
}

// A renamed category would silently empty every locker in the country; a
// changed field would silently drop points. Both are worth a line a night.
function reportOddities(tally: PageTally): void {
  if (tally.unknownCategories.size > 0) {
    logger.warn('Nova Poshta directory has categories we do not map', {
      categories: [...tally.unknownCategories],
    })
  }
  if (tally.malformed.length > 0) {
    logger.warn('Nova Poshta directory rows skipped as malformed', {
      count: tally.malformed.length,
      sample: tally.malformed.slice(0, LOGGED_SAMPLE_SIZE),
    })
  }
}

function toCollectableRecord(warehouse: Warehouse): PickupPointRecord[] {
  const kind = KIND_BY_CATEGORY[warehouse.CategoryOfWarehouse]
  if (!kind || warehouse.WarehouseStatus !== WORKING_STATUS) return []

  return [
    {
      carrier: Carrier.NovaPost,
      ref: warehouse.Ref,
      settlementRef: warehouse.CityRef,
      kind,
      number: warehouse.Number,
      name: warehouse.Description,
      address: warehouse.ShortAddress,
      maxWeightGrams: receivingLimitGrams(
        warehouse.PlaceMaxWeightAllowed,
        warehouse.TotalMaxWeightAllowed,
      ),
    },
  ]
}
