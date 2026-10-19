import { Carrier, type OrderStatus, type PaymentRoute } from '@/db/enums'
import { contactView, type ContactView } from '@/features/orders/model/contact-preference'
import {
  DestinationKind,
  destinationWithPoint,
  orderDestination,
  type OrderDestination,
} from '@/features/orders/model/destination'
import {
  canIssueWaybill,
  readinessWithPoint,
  waybillReadiness,
  WaybillReadiness,
} from '@/features/orders/model/shipment'
import { countByStatusFilter, type StatusFilterCounts } from '@/features/orders/model/status-filter'
import {
  orderRepository,
  type OrderTraffic,
  type OrderListQuery,
  type OrderPageRow,
  type OrderShelfCounts,
} from '@/features/orders/repository/order-repository'
import { isParcelStage, pickupDirectoryFor, type ParcelStage } from '@/features/shipping'
import { formatDate, formatDateIsoKyiv, formatDateTime } from '@/lib/datetime'
import { createMoney, Currency, formatMoney } from '@/lib/money'

export type OrderListRow = {
  // What the daily round can do with this row without opening the order.
  readonly readiness: WaybillReadiness
  // Where the parcel goes, and whether that is settled.
  readonly destination: OrderDestination
  readonly id: string
  readonly orderNumber: string
  readonly placedAt: string
  // The calendar day in Kyiv, as a key for the day dividers and as the
  // label a divider shows for a day that is neither today nor yesterday.
  readonly placedDay: string
  readonly placedDayLabel: string
  readonly buyerName: string
  readonly phone: string | null
  // How the buyer wants the order confirmed, and a chat when they asked for one.
  readonly contact: ContactView
  // The channel the buyer came from; null when unknown.
  readonly traffic: OrderTraffic | null
  readonly paymentRoute: PaymentRoute
  readonly totalLabel: string
  readonly status: OrderStatus
  readonly trackingNumber: string | null
  readonly trackingUrl: string | null
  readonly parcelStage: ParcelStage | null
}

export type OrderListPage = {
  readonly rows: readonly OrderListRow[]
  readonly page: number
  readonly pageCount: number
  readonly total: number
  readonly shelves: OrderShelfCounts
  // The open shelf after the search, by status chip — the header filter's numbers.
  readonly statusCounts: StatusFilterCounts
}

// What the row says about itself before the carrier's directory is asked.
type ResolvedRow = {
  readonly row: OrderPageRow
  readonly readiness: WaybillReadiness
  readonly destination: OrderDestination
}

// One shelf of the orders list, narrowed by the search box: the day's work,
// the calls to make, the returns, or the archive.
export async function listOrders(
  query: OrderListQuery,
  page: number,
  perPage: number,
): Promise<OrderListPage> {
  // The counts come first so the page can be clamped to the real last page:
  // ?page=99 lands on the final page instead of an endless empty one.
  const [{ shelves, found }, statusRows] = await Promise.all([
    orderRepository.countList(query),
    orderRepository.countStatuses(query),
  ])
  const pageCount = Math.max(1, Math.ceil(found / perPage))
  const currentPage = Math.min(Math.max(1, page), pageCount)
  const rows = await orderRepository.findPage(query, {
    limit: perPage,
    offset: (currentPage - 1) * perPage,
  })

  return {
    rows: await toListRows(rows),
    page: currentPage,
    pageCount,
    total: found,
    shelves,
    statusCounts: countByStatusFilter(statusRows),
  }
}

async function toListRows(rows: readonly OrderPageRow[]): Promise<OrderListRow[]> {
  const resolved: ResolvedRow[] = rows.map((row) => ({
    row,
    readiness: waybillReadiness(row, row.parcelWeightGrams),
    destination: orderDestination(row),
  }))
  const knownPoints = await knownPointRefs(resolved)

  return resolved.map((entry) => toListRow(entry, knownPoints))
}

function toListRow(entry: ResolvedRow, knownPoints: ReadonlySet<string>): OrderListRow {
  const { row } = entry
  const isPointKnown = !isWorthChecking(entry) || knownPoints.has(pointKey(row))

  return {
    id: row.id,
    orderNumber: row.orderNumber,
    placedAt: formatDateTime(row.createdAt),
    placedDay: formatDateIsoKyiv(row.createdAt),
    placedDayLabel: formatDate(row.createdAt),
    buyerName: row.buyerName,
    phone: row.phone,
    contact: contactView(row.contactPreference, row.phone),
    traffic: row.traffic,
    paymentRoute: row.paymentRoute,
    totalLabel: formatMoney(createMoney(row.totalCents, Currency.Uah)),
    status: row.status,
    readiness: readinessWithPoint(entry.readiness, isPointKnown),
    destination: destinationWithPoint(entry.destination, isPointKnown),
    trackingNumber: row.trackingNumber,
    trackingUrl: row.trackingUrl,
    parcelStage: isParcelStage(row.parcelStage) ? row.parcelStage : null,
  }
}

// One directory lookup per carrier for the whole page: a row whose branch the
// carrier no longer knows must say so before the admin ticks it, not after
// the waybill is refused.
async function knownPointRefs(resolved: readonly ResolvedRow[]): Promise<ReadonlySet<string>> {
  const byCarrier = new Map<Carrier, Set<string>>()
  for (const entry of resolved) {
    const ref = entry.row.pickupPointRef
    if (!isWorthChecking(entry) || !ref) continue

    const carrier = carrierOf(entry.row)
    const refs = byCarrier.get(carrier) ?? new Set<string>()
    refs.add(ref)
    byCarrier.set(carrier, refs)
  }

  const lookups = [...byCarrier].map(async ([carrier, refs]) => {
    const points = await pickupDirectoryFor(carrier).findPickupPointsByRefs([...refs])
    return points.map((point) => `${carrier}:${point.ref}`)
  })

  return new Set((await Promise.all(lookups)).flat())
}

// Only a branch still waiting for its waybill is worth a lookup: a parcel
// already handed over, or an order that will never get one, is settled.
function isWorthChecking(entry: ResolvedRow): boolean {
  return (
    entry.destination.kind === DestinationKind.Branch &&
    entry.readiness !== WaybillReadiness.Issued &&
    canIssueWaybill(entry.row.status)
  )
}

function pointKey(row: OrderPageRow): string {
  return `${carrierOf(row)}:${row.pickupPointRef}`
}

function carrierOf(row: OrderPageRow): Carrier {
  return row.carrier ?? Carrier.NovaPost
}
