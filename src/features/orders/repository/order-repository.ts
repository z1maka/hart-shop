import type { BankAccountDraft } from '@/config/requisites'
import {
  inArray,
  gte,
  lt,
  asc,
  and,
  desc,
  eq,
  isNotNull,
  isNull,
  lte,
  ilike,
  ne,
  notInArray,
  or,
  sql,
  type InferSelectModel,
  type SQL,
  notExists,
} from 'drizzle-orm'
import { orderItems, orderNotifications, orders, products, productVariants } from '@/db/schema'
import {
  type Locale,
  type NotificationKind,
  OrderStatus,
  type Carrier,
  type ContactPreference,
  DeliveryKind,
  PaymentRoute,
  type TrafficSource,
} from '@/db/enums'
import {
  FINISHED_ORDER_STATUSES,
  OrderShelf,
  RETURN_ORDER_STATUS,
} from '@/features/orders/model/order-shelves'
import type { PackingSource } from '@/features/orders/model/notification-format'
import { QUICK_ORDER_POINT_REF } from '@/features/orders/model/quick-order'
import { type OrderStatusFilter, statusMatchOf } from '@/features/orders/model/status-filter'
import { ParcelStage } from '@/features/shipping/model/parcel-tracking'
import type { ShippingAddress } from '@/db/schema'

export type { ShippingAddress }
import { db } from '@/lib/db'
import { escapeLikePattern } from '@/lib/sql'

export type OrderRow = InferSelectModel<typeof orders>
// A line without the shop's cost: lines go to the buyer's page, the mails
// and the payment provider, and none of them may carry it.
export type OrderItemRow = Omit<InferSelectModel<typeof orderItems>, 'unitCostCents'>

const ORDER_ITEM_COLUMNS = {
  id: orderItems.id,
  orderId: orderItems.orderId,
  variantId: orderItems.variantId,
  sku: orderItems.sku,
  productSlug: orderItems.productSlug,
  productTitle: orderItems.productTitle,
  variantLabel: orderItems.variantLabel,
  quantity: orderItems.quantity,
  unitPriceCents: orderItems.unitPriceCents,
  currency: orderItems.currency,
  weightGrams: orderItems.weightGrams,
  imageStorageKey: orderItems.imageStorageKey,
  createdAt: orderItems.createdAt,
}

export type OrderPageRow = {
  readonly id: string
  readonly orderNumber: string
  readonly createdAt: Date
  readonly buyerName: string
  // The buyer's phone: what the team dials, and the contact every order has.
  readonly phone: string | null
  readonly contactPreference: ContactPreference
  readonly traffic: OrderTraffic | null
  readonly paymentRoute: PaymentRoute
  readonly totalCents: number
  readonly prepaidCents: number
  readonly status: OrderStatus
  readonly trackingNumber: string | null
  readonly trackingUrl: string | null
  readonly parcelStage: string | null
  // What the daily round needs to tell a waybill it can issue from a row.
  readonly deliveryKind: string
  readonly carrier: Carrier | null
  readonly pickupPointRef: string | null
  readonly pickupPointLabel: string | null
  readonly carrierDocumentRef: string | null
  readonly shippingAddress: ShippingAddress
  readonly parcelWeightGrams: number
}

// One shelf, narrowed by what the admin typed (an order number, a phone or
// a buyer's name) and by the status chip picked in the table header.
export type OrderListQuery = {
  readonly shelf: OrderShelf
  readonly search: string
  readonly status: OrderStatusFilter | null
}

// How many rows of the open shelf, after the search, carry each status — a
// pending row split by whether the carrier collects the money.
export type OrderStatusCountRow = {
  readonly status: OrderStatus
  readonly isCashOnDelivery: boolean
  readonly count: number
}

export type OrderShelfCounts = Readonly<Record<OrderShelf, number>>

export type OrderListCounts = {
  readonly shelves: OrderShelfCounts
  // How many rows the open shelf holds once the search has narrowed it.
  readonly found: number
}

export type MonthReturnsRow = {
  readonly month: string
  readonly sent: number
  readonly returned: number
  readonly returnedCents: number
}

// What the hourly tracking needs to decide a step; the full order is read
// only for the few that send a mail or a message.
export type TrackedOrderRow = {
  readonly id: string
  readonly orderNumber: string
  readonly status: OrderStatus
  readonly paymentRoute: PaymentRoute
  readonly paidAt: Date | null
  readonly trackingNumber: string
  readonly parcelStage: string | null
  readonly parcelStatus: string | null
}

export type ParcelRecord = {
  readonly parcelStage: string
  readonly parcelStatus: string
  // Null when only the order's status moves, not the parcel.
  readonly parcelUpdatedAt: Date | null
  readonly status: OrderStatus | null
  readonly paidAt: Date | null
}

export type DuePacking = {
  // Cash on delivery: placed at or before this moment.
  readonly placedBefore: Date
  // Card or transfer: paid at or before this moment.
  readonly paidBefore: Date
  // A quick order waits for the call that settles its branch.
  readonly unsettledPointRef: string
  readonly limit: number
}

export type EarlierPointOrder = {
  readonly orderNumber: string
  readonly fullName: string
  readonly deliveryKind: string
  readonly carrier: Carrier | null
  readonly pickupPointRef: string | null
  readonly pickupPointLabel: string | null
}

export type WaybillAttachment = {
  readonly carrier: Carrier
  // The cabinet the document was issued from; null while the shop runs on
  // the single cabinet from the environment.
  readonly carrierAccountId: string | null
  readonly trackingNumber: string
  readonly trackingUrl: string
  readonly carrierDocumentRef: string
  // The prepayment the waybill's cash on delivery was reduced by; saved
  // with it, so the two never disagree.
  readonly prepaidCents: number
  // Packed when the waybill closes the box; null leaves the status alone.
  readonly status: OrderStatus | null
  // A courier order's door as the carrier spells it; null keeps the address.
  readonly shippingAddress: ShippingAddress | null
}

// A prepayment changed under an issued waybill, matched only while the
// order still has that waybill and the prepayment this change started from:
// a waybill issued or removed meanwhile, or another save in between, carries
// an amount the carrier was not just told about.
export type PrepaidChange = {
  readonly prepaidCents: number
  readonly previousPrepaidCents: number
  readonly carrierDocumentRef: string
}

export type SettledRecipient = {
  readonly carrier: Carrier
  readonly shippingAddress: ShippingAddress
  readonly deliveryKind: DeliveryKind
  readonly pickupPointRef: string
  readonly pickupPointLabel: string
}

export type OrderDraftItem = {
  readonly variantId: string
  readonly sku: string
  readonly productSlug: string
  readonly productTitle: string
  readonly variantLabel: string
  readonly quantity: number
  readonly unitPriceCents: number
  readonly weightGrams: number
  readonly imageStorageKey: string | null
}

export type OrderDraft = {
  readonly cartId: string
  readonly orderNumber: string
  readonly accessToken: string
  readonly email: string | null
  readonly locale: Locale
  readonly paymentRoute: PaymentRoute
  readonly subtotalCents: number
  readonly shippingCents: number
  readonly totalCents: number
  readonly shippingAddress: ShippingAddress
  readonly deliveryKind: DeliveryKind
  readonly pickupPointRef: string | null
  readonly pickupPointLabel: string | null
  readonly customerNote: string | null
  readonly contactPreference: ContactPreference
  readonly country: string
  readonly carrier: Carrier
  readonly bankRequisites: BankAccountDraft | null
  readonly traffic: OrderTraffic | null
  readonly items: readonly OrderDraftItem[]
}

// The channel the buyer came from and its campaign or tag.
export type OrderTraffic = {
  readonly source: TrafficSource
  readonly detail: string | null
}

// A new, changed or removed tracking number starts the parcel's story over:
// what the tracking saw belongs to the number it saw it for.
const NO_PARCEL = { parcelStage: null, parcelStatus: null, parcelUpdatedAt: null } as const

// One channel's orders in a week: how many, for how much, and how many of
// them came back — a refused parcel is an order but no sale.
export type TrafficWeekRow = {
  readonly source: TrafficSource | null
  readonly orders: number
  readonly totalCents: number
  readonly returned: number
  readonly returnedCents: number
}

// Below this a number is more likely an order number than a phone.
const PHONE_SEARCH_MIN_DIGITS = 3

export const orderRepository = {
  // Order and lines land together: a header without its items is worse than no
  // row at all, because the total no longer says what was bought.
  async createPending(draft: OrderDraft): Promise<OrderRow> {
    return db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          cartId: draft.cartId,
          orderNumber: draft.orderNumber,
          accessToken: draft.accessToken,
          email: draft.email,
          locale: draft.locale,
          paymentRoute: draft.paymentRoute,
          subtotalCents: draft.subtotalCents,
          shippingCents: draft.shippingCents,
          totalCents: draft.totalCents,
          shippingAddress: draft.shippingAddress,
          deliveryKind: draft.deliveryKind,
          pickupPointRef: draft.pickupPointRef,
          pickupPointLabel: draft.pickupPointLabel,
          customerNote: draft.customerNote,
          contactPreference: draft.contactPreference,
          country: draft.country,
          carrier: draft.carrier,
          bankRequisites: draft.bankRequisites,
          trafficSource: draft.traffic?.source ?? null,
          trafficDetail: draft.traffic?.detail ?? null,
        })
        .returning()

      if (!order) throw new Error('Order could not be created')

      await tx.insert(orderItems).values(
        draft.items.map((item) => ({
          orderId: order.id,
          variantId: item.variantId,
          sku: item.sku,
          productSlug: item.productSlug,
          productTitle: item.productTitle,
          variantLabel: item.variantLabel,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          // The cost stays inside the database: checkout never sees it.
          unitCostCents: sql<number | null>`(
            select ${products.costCents} from ${products}
            inner join ${productVariants} on ${productVariants.productId} = ${products.id}
            where ${productVariants.id} = ${item.variantId}
          )`,
          weightGrams: item.weightGrams,
          imageStorageKey: item.imageStorageKey,
        })),
      )

      return order
    })
  },

  // The number comes from a database sequence rather than a row count: two
  // shoppers checking out in the same second would otherwise claim one number.
  async nextOrderSequence(): Promise<number> {
    const [row] = await db.execute<{ value: string }>(
      sql`select nextval('order_number_seq') as value`,
    )

    return Number(row?.value ?? 1)
  },

  async attachPaymentRef(orderId: string, provider: string, paymentRef: string): Promise<void> {
    await db
      .update(orders)
      .set({ paymentProvider: provider, paymentRef, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
  },

  async findByPaymentRef(paymentRef: string): Promise<OrderRow | null> {
    const [row] = await db.select().from(orders).where(eq(orders.paymentRef, paymentRef)).limit(1)
    return row ?? null
  },

  // A pending order becomes paid, and so does one cancelled before the money
  // came: WayForPay lets the buyer try another card after a decline, and the
  // decline has already cancelled the order (FOX-2026-000061, 02.10.2026, paid
  // and lost). A paid, packed or refunded order never moves, so a webhook
  // delivered twice, or after a refund, cannot walk the status backwards.
  async markPaid(orderId: string): Promise<boolean> {
    const rows = await db
      .update(orders)
      .set({ status: OrderStatus.Paid, paidAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(orders.id, orderId),
          isNull(orders.paidAt),
          inArray(orders.status, [OrderStatus.Pending, OrderStatus.Cancelled]),
        ),
      )
      .returning({ id: orders.id })

    return rows.length > 0
  },

  async markCancelledByNumber(orderNumber: string): Promise<void> {
    await db
      .update(orders)
      .set({ status: OrderStatus.Cancelled, updatedAt: new Date() })
      .where(and(eq(orders.orderNumber, orderNumber), eq(orders.status, OrderStatus.Pending)))
  },

  async markCancelled(orderId: string): Promise<void> {
    await db
      .update(orders)
      .set({ status: OrderStatus.Cancelled, updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.status, OrderStatus.Pending)))
  },

  async findById(orderId: string): Promise<OrderRow | null> {
    const [row] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1)
    return row ?? null
  },

  // Delivered orders due an ask about the product: handed over inside the
  // window (the carrier's moment when it was tracked, the admin's move
  // otherwise) and never asked before — a skipped ask counts as asked.
  async findDeliveredForReviewRequest(input: {
    readonly deliveredFrom: Date
    readonly deliveredTo: Date
    readonly askedKind: NotificationKind
    readonly limit: number
  }): Promise<OrderRow[]> {
    const deliveredAt = sql`coalesce(case when ${orders.parcelStage} = ${ParcelStage.Received} then ${orders.parcelUpdatedAt} end, ${orders.updatedAt})`
    // A bare expression gives the driver no column type to bind the dates
    // to, so the bounds are cast by hand.
    const deliveredFrom = sql`${input.deliveredFrom.toISOString()}::timestamptz`
    const deliveredTo = sql`${input.deliveredTo.toISOString()}::timestamptz`

    return db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, OrderStatus.Delivered),
          gte(deliveredAt, deliveredFrom),
          lte(deliveredAt, deliveredTo),
          notExists(
            db
              .select({ id: orderNotifications.id })
              .from(orderNotifications)
              .where(
                and(
                  eq(orderNotifications.orderId, orders.id),
                  eq(orderNotifications.kind, input.askedKind),
                ),
              ),
          ),
        ),
      )
      .orderBy(orders.updatedAt)
      .limit(input.limit)
  },

  // Phone-only orders nobody has called back: still waiting after the delay
  // and never reminded about — the notification log is the memory.
  async findQuickOrdersAwaitingCall(input: {
    readonly placedBefore: Date
    readonly remindedKind: NotificationKind
    readonly limit: number
  }): Promise<OrderRow[]> {
    return db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, OrderStatus.Pending),
          eq(orders.pickupPointRef, QUICK_ORDER_POINT_REF),
          lte(orders.createdAt, input.placedBefore),
          notExists(
            db
              .select({ id: orderNotifications.id })
              .from(orderNotifications)
              .where(
                and(
                  eq(orderNotifications.orderId, orders.id),
                  eq(orderNotifications.kind, input.remindedKind),
                ),
              ),
          ),
        ),
      )
      .orderBy(orders.createdAt)
      .limit(input.limit)
  },

  async updateStatus(orderId: string, status: OrderStatus, paidAt?: Date): Promise<void> {
    await db
      .update(orders)
      .set({ status, updatedAt: new Date(), ...(paidAt ? { paidAt } : {}) })
      .where(eq(orders.id, orderId))
  },

  async setTracking(
    orderId: string,
    tracking: {
      readonly carrier: Carrier | null
      readonly trackingNumber: string | null
      readonly trackingUrl: string | null
    },
  ): Promise<void> {
    // Saving the same number again keeps what the tracking saw — including
    // a refusal already reported.
    const isSameNumber = sql`${orders.trackingNumber} is not distinct from ${tracking.trackingNumber}`
    await db
      .update(orders)
      .set({
        ...tracking,
        parcelStage: sql`case when ${isSameNumber} then ${orders.parcelStage} end`,
        parcelStatus: sql`case when ${isSameNumber} then ${orders.parcelStatus} end`,
        parcelUpdatedAt: sql`case when ${isSameNumber} then ${orders.parcelUpdatedAt} end`,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
  },

  // Only onto an order without one, in one statement with the status: two
  // clicks racing each other cannot both attach, and no state exists where
  // the number is saved but the status is not. False = someone was first.
  // Matched only while the order is still open: the carrier's answer takes
  // seconds, and an order cancelled or sent meanwhile must not come back as
  // packed with a waybill on it.
  async attachWaybill(
    orderId: string,
    attachment: WaybillAttachment,
    openStatuses: readonly OrderStatus[],
  ): Promise<boolean> {
    const { status, shippingAddress, ...waybill } = attachment
    const updated = await db
      .update(orders)
      .set({
        ...waybill,
        ...NO_PARCEL,
        ...(status ? { status } : {}),
        ...(shippingAddress ? { shippingAddress } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.id, orderId),
          isNull(orders.carrierDocumentRef),
          inArray(orders.status, [...openStatuses]),
        ),
      )
      .returning({ id: orders.id })
    return updated.length > 0
  },

  // The recipient settled by phone after a quick order, or corrected by the
  // admin; never under an issued waybill, which already names the old one.
  async settleRecipient(
    orderId: string,
    recipient: SettledRecipient,
    openStatuses: readonly OrderStatus[],
  ): Promise<boolean> {
    const updated = await db
      .update(orders)
      .set({ ...recipient, updatedAt: new Date() })
      .where(
        and(
          eq(orders.id, orderId),
          isNull(orders.carrierDocumentRef),
          inArray(orders.status, [...openStatuses]),
        ),
      )
      .returning({ id: orders.id })
    return updated.length > 0
  },

  // One statement, so an admin changing the same order meanwhile is not
  // overwritten: a row that left Pending or Paid is no longer matched.
  async packDue(due: DuePacking): Promise<string[]> {
    const dueIds = db
      .select({ id: orders.id })
      .from(orders)
      .where(
        or(
          and(
            eq(orders.status, OrderStatus.Pending),
            eq(orders.paymentRoute, PaymentRoute.CashOnDelivery),
            lte(orders.createdAt, due.placedBefore),
            or(isNull(orders.pickupPointRef), ne(orders.pickupPointRef, due.unsettledPointRef)),
          ),
          and(eq(orders.status, OrderStatus.Paid), lte(orders.paidAt, due.paidBefore)),
        ),
      )
      .orderBy(asc(orders.createdAt))
      .limit(due.limit)

    const packed = await db
      .update(orders)
      .set({ status: OrderStatus.Packed, updatedAt: new Date() })
      .where(
        and(
          inArray(orders.id, dueIds),
          inArray(orders.status, [OrderStatus.Pending, OrderStatus.Paid]),
        ),
      )
      .returning({ orderNumber: orders.orderNumber })
    return packed.map((row) => row.orderNumber)
  },

  // Earlier orders from this phone that named a real point, newest first —
  // what a returning buyer most likely wants again. A few rather than one:
  // the newest may name a branch that has since closed.
  async findEarlierPointOrdersByPhone(
    phoneDigits: string,
    options: {
      readonly placedBefore: Date
      readonly excludeOrderId: string
      readonly placeholderRefs: readonly string[]
      readonly limit: number
    },
  ): Promise<EarlierPointOrder[]> {
    return db
      .select({
        orderNumber: orders.orderNumber,
        fullName: sql<string>`${orders.shippingAddress}->>'fullName'`,
        deliveryKind: orders.deliveryKind,
        carrier: orders.carrier,
        pickupPointRef: orders.pickupPointRef,
        pickupPointLabel: orders.pickupPointLabel,
      })
      .from(orders)
      .where(
        and(
          eq(orders.recipientPhone, phoneDigits),
          lt(orders.createdAt, options.placedBefore),
          ne(orders.id, options.excludeOrderId),
          isNotNull(orders.pickupPointRef),
          notInArray(orders.pickupPointRef, [...options.placeholderRefs]),
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(options.limit)
  },

  async detachWaybill(orderId: string, carrierDocumentRef: string): Promise<void> {
    await db
      .update(orders)
      .set({
        trackingNumber: null,
        trackingUrl: null,
        carrierDocumentRef: null,
        ...NO_PARCEL,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.carrierDocumentRef, carrierDocumentRef)))
  },

  async setPrepaid(orderId: string, change: PrepaidChange): Promise<boolean> {
    const updated = await db
      .update(orders)
      .set({ prepaidCents: change.prepaidCents, updatedAt: new Date() })
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.carrierDocumentRef, change.carrierDocumentRef),
          eq(orders.prepaidCents, change.previousPrepaidCents),
        ),
      )
      .returning({ id: orders.id })
    return updated.length > 0
  },

  async setInvoiceNumber(orderId: string, invoiceNumber: string | null): Promise<void> {
    await db
      .update(orders)
      .set({ invoiceNumber, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
  },

  // Reported by the payment date: IOSS declares the month the money moved,
  // not the month the order was placed. Legacy rows without paidAt fall back
  // to createdAt so they are not silently dropped from the report.
  async findForIossExport(from: Date, to: Date): Promise<OrderRow[]> {
    return db
      .select()
      .from(orders)
      .where(
        and(
          inArray(orders.status, [
            OrderStatus.Paid,
            OrderStatus.Packed,
            OrderStatus.Shipped,
            OrderStatus.Delivered,
          ]),
          gte(sql`coalesce(${orders.paidAt}, ${orders.createdAt})`, from.toISOString()),
          lt(sql`coalesce(${orders.paidAt}, ${orders.createdAt})`, to.toISOString()),
        ),
      )
      .orderBy(asc(sql`coalesce(${orders.paidAt}, ${orders.createdAt})`))
  },

  async findPage(
    query: OrderListQuery,
    page: { readonly limit: number; readonly offset: number },
  ): Promise<OrderPageRow[]> {
    const rows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        createdAt: orders.createdAt,
        shippingAddress: orders.shippingAddress,
        paymentRoute: orders.paymentRoute,
        totalCents: orders.totalCents,
        prepaidCents: orders.prepaidCents,
        status: orders.status,
        trackingNumber: orders.trackingNumber,
        trackingUrl: orders.trackingUrl,
        parcelStage: orders.parcelStage,
        deliveryKind: orders.deliveryKind,
        carrier: orders.carrier,
        pickupPointRef: orders.pickupPointRef,
        pickupPointLabel: orders.pickupPointLabel,
        carrierDocumentRef: orders.carrierDocumentRef,
        trafficSource: orders.trafficSource,
        trafficDetail: orders.trafficDetail,
        contactPreference: orders.contactPreference,
      })
      .from(orders)
      .where(listCondition(query))
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(page.limit)
      .offset(page.offset)

    // One grouped query for the page rather than a correlated subquery per
    // row — and one whose column names are unambiguous.
    const weights = await parcelWeights(rows.map((row) => row.id))

    return rows.map(({ trafficSource, trafficDetail, ...row }) => ({
      ...row,
      buyerName: row.shippingAddress.fullName,
      phone: row.shippingAddress.phone ?? null,
      traffic: trafficSource ? { source: trafficSource, detail: trafficDetail } : null,
      parcelWeightGrams: weights.get(row.id) ?? 0,
    }))
  },

  // The tabs' totals and the result's own total in one pass over the table:
  // the tabs never change while the admin pages through a search, but they
  // are on screen all the same.
  async countList(query: OrderListQuery): Promise<OrderListCounts> {
    const [row] = await db
      .select({
        active: sql<number>`count(*) filter (where ${shelfCondition(OrderShelf.Active)})::int`,
        quick: sql<number>`count(*) filter (where ${shelfCondition(OrderShelf.Quick)})::int`,
        returns: sql<number>`count(*) filter (where ${shelfCondition(OrderShelf.Returns)})::int`,
        archive: sql<number>`count(*) filter (where ${shelfCondition(OrderShelf.Archive)})::int`,
        found: sql<number>`count(*) filter (where ${listCondition(query)})::int`,
      })
      .from(orders)

    return {
      shelves: {
        [OrderShelf.Active]: row?.active ?? 0,
        [OrderShelf.Quick]: row?.quick ?? 0,
        [OrderShelf.Returns]: row?.returns ?? 0,
        [OrderShelf.Archive]: row?.archive ?? 0,
      },
      found: row?.found ?? 0,
    }
  },

  // The status dropdown's numbers: the shelf and the search, never the status
  // filter itself, or every other option would read zero.
  // Grouped by the route itself: an expression would carry its own bound
  // parameter into SELECT and GROUP BY, and Postgres cannot match the two.
  async countStatuses(query: OrderListQuery): Promise<OrderStatusCountRow[]> {
    const rows = await db
      .select({
        status: orders.status,
        paymentRoute: orders.paymentRoute,
        count: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(listCondition({ ...query, status: null }))
      .groupBy(orders.status, orders.paymentRoute)

    return rows.map((row) => ({
      status: row.status,
      isCashOnDelivery: row.paymentRoute === PaymentRoute.CashOnDelivery,
      count: row.count,
    }))
  },

  // Closes a return: only an open one moves, so a second click does nothing.
  async archiveReturn(orderId: string, archivedAt: Date): Promise<boolean> {
    const updated = await db
      .update(orders)
      .set({ archivedAt, updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), shelfCondition(OrderShelf.Returns)))
      .returning({ id: orders.id })
    return updated.length > 0
  },

  // Orders placed in one month ("2026-09", read in `timeZone`): how many
  // left with a waybill, how many of those came back and what they were
  // worth.
  async countReturnsInMonth(month: string, timeZone: string): Promise<MonthReturnsRow> {
    const monthStart = `${month}-01`
    // Sent means it left the shop: a waybill, or a status only a handed-over
    // parcel reaches. A number cleared later must not drop the order out.
    const isSent = or(
      isNotNull(orders.trackingNumber),
      inArray(orders.status, [OrderStatus.Shipped, OrderStatus.Delivered]),
    )
    const isReturned = and(isSent, eq(orders.status, RETURN_ORDER_STATUS))
    const [row] = await db
      .select({
        sent: sql<number>`count(*) filter (where ${isSent})::int`,
        returned: sql<number>`count(*) filter (where ${isReturned})::int`,
        returnedCents: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${isReturned}), 0)::int`,
      })
      .from(orders)
      .where(
        and(
          sql`${orders.createdAt} >= (${monthStart}::timestamp at time zone ${timeZone})`,
          sql`${orders.createdAt} < ((${monthStart}::timestamp + interval '1 month') at time zone ${timeZone})`,
        ),
      )
    return {
      month,
      sent: row?.sent ?? 0,
      returned: row?.returned ?? 0,
      returnedCents: row?.returnedCents ?? 0,
    }
  },

  // Newest first: parcels stuck on a deleted number pile up at the old end,
  // and the cap must cut those, not today's.
  async findTracked(
    carrier: Carrier,
    statuses: readonly OrderStatus[],
    limit: number,
  ): Promise<TrackedOrderRow[]> {
    const rows = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        paymentRoute: orders.paymentRoute,
        paidAt: orders.paidAt,
        trackingNumber: orders.trackingNumber,
        parcelStage: orders.parcelStage,
        parcelStatus: orders.parcelStatus,
      })
      .from(orders)
      .where(
        and(
          eq(orders.carrier, carrier),
          isNotNull(orders.trackingNumber),
          inArray(orders.status, [...statuses]),
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(limit)

    return rows.flatMap((row) =>
      row.trackingNumber ? [{ ...row, trackingNumber: row.trackingNumber }] : [],
    )
  },

  // Matched only while the order still has the status and the number the
  // tracking read: an admin who moved it or replaced its waybill meanwhile
  // has the last word.
  async recordParcel(
    orderId: string,
    expected: { readonly status: OrderStatus; readonly trackingNumber: string },
    record: ParcelRecord,
  ): Promise<boolean> {
    const updated = await db
      .update(orders)
      .set({
        parcelStage: record.parcelStage,
        parcelStatus: record.parcelStatus,
        ...(record.parcelUpdatedAt ? { parcelUpdatedAt: record.parcelUpdatedAt } : {}),
        ...(record.status ? { status: record.status } : {}),
        ...(record.paidAt ? { paidAt: record.paidAt } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.status, expected.status),
          eq(orders.trackingNumber, expected.trackingNumber),
        ),
      )
      .returning({ id: orders.id })
    return updated.length > 0
  },

  async findByAccessToken(accessToken: string): Promise<OrderRow | null> {
    const [row] = await db.select().from(orders).where(eq(orders.accessToken, accessToken)).limit(1)

    return row ?? null
  },

  async findItems(orderId: string): Promise<OrderItemRow[]> {
    return db.select(ORDER_ITEM_COLUMNS).from(orderItems).where(eq(orderItems.orderId, orderId))
  },

  // The lines next to the product as it is now — the workshop's name and the
  // bought variant's colour and size; a deleted variant leaves only the
  // snapshot.
  async findPackingSources(orderId: string): Promise<PackingSource[]> {
    return db
      .select({
        quantity: orderItems.quantity,
        productTitle: orderItems.productTitle,
        variantLabel: orderItems.variantLabel,
        packingTitle: products.packingTitle,
        shortTitle: products.shortTitle,
        color: sql<string | null>`${productVariants.options} ->> 'Color'`,
        size: sql<string | null>`${productVariants.options} ->> 'Size'`,
      })
      .from(orderItems)
      .leftJoin(productVariants, eq(productVariants.id, orderItems.variantId))
      .leftJoin(products, eq(products.id, productVariants.productId))
      .where(eq(orderItems.orderId, orderId))
  },

  // Orders placed in the week starting on that Monday, on `timeZone`'s
  // clock, by the channel they came from; cancelled ones were no sale.
  async countByTrafficInWeek(weekStart: string, timeZone: string): Promise<TrafficWeekRow[]> {
    const isReturned = eq(orders.status, RETURN_ORDER_STATUS)
    return db
      .select({
        source: orders.trafficSource,
        orders: sql<number>`count(*)::int`,
        totalCents: sql<number>`coalesce(sum(${orders.totalCents}), 0)::int`,
        returned: sql<number>`count(*) filter (where ${isReturned})::int`,
        returnedCents: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${isReturned}), 0)::int`,
      })
      .from(orders)
      .where(
        and(
          sql`${orders.createdAt} >= (${weekStart}::timestamp at time zone ${timeZone})`,
          sql`${orders.createdAt} < ((${weekStart}::timestamp + interval '7 days') at time zone ${timeZone})`,
          ne(orders.status, OrderStatus.Cancelled),
        ),
      )
      .groupBy(orders.trafficSource)
  },
}

// Finished by status, or a return the admin has closed; a return still open
// has its own shelf; everything else is the day's work.
// What the parcel weighs: the lines of each order added up.
async function parcelWeights(orderIds: readonly string[]): Promise<Map<string, number>> {
  if (orderIds.length === 0) return new Map()

  const rows = await db
    .select({
      orderId: orderItems.orderId,
      grams: sql<number>`coalesce(sum(${orderItems.weightGrams} * ${orderItems.quantity}), 0)::int`,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, [...orderIds]))
    .groupBy(orderItems.orderId)

  return new Map(rows.map((row) => [row.orderId, row.grams]))
}

function listCondition(query: OrderListQuery): SQL {
  const conditions = [
    shelfCondition(query.shelf),
    searchCondition(query.search),
    query.status ? statusFilterCondition(query.status) : undefined,
  ].filter((condition): condition is SQL => condition !== undefined)

  return and(...conditions) ?? shelfCondition(query.shelf)
}

function statusFilterCondition(filter: OrderStatusFilter): SQL {
  const { status, isCashOnDelivery } = statusMatchOf(filter)
  const hasStatus = eq(orders.status, status)
  if (isCashOnDelivery === null) return hasStatus

  const route = isCashOnDelivery
    ? eq(orders.paymentRoute, PaymentRoute.CashOnDelivery)
    : ne(orders.paymentRoute, PaymentRoute.CashOnDelivery)
  return and(hasStatus, route) ?? hasStatus
}

// An order number, a name as it is written on the parcel, or any part of the
// phone — whichever the admin has at hand when a buyer calls.
function searchCondition(search: string): SQL | undefined {
  const text = search.trim()
  if (text === '') return undefined

  const pattern = `%${escapeLikePattern(text)}%`
  const digits = text.replace(/\D/g, '')
  return or(
    ilike(orders.orderNumber, pattern),
    sql`${orders.shippingAddress}->>'fullName' ilike ${pattern}`,
    digits.length >= PHONE_SEARCH_MIN_DIGITS
      ? ilike(orders.recipientPhone, `%${digits}%`)
      : undefined,
  )
}

function shelfCondition(shelf: OrderShelf): SQL {
  const isFinished = inArray(orders.status, [...FINISHED_ORDER_STATUSES])
  const isReturn = eq(orders.status, RETURN_ORDER_STATUS)
  const isClosed = isNotNull(orders.archivedAt)
  // The same rule the model reads: a parcel going to a branch nobody has
  // named yet. A missing reference counts as unnamed, so coalesce rather
  // than `=`, which on null would drop the row from both shelves.
  const isQuick = sql`(${orders.deliveryKind} <> ${DeliveryKind.Courier}
    and coalesce(${orders.pickupPointRef}, ${QUICK_ORDER_POINT_REF}) = ${QUICK_ORDER_POINT_REF})`
  const isOpen = sql`not (${isFinished} or ${isReturn} or ${isClosed})`
  switch (shelf) {
    case OrderShelf.Archive:
      return sql`(${isFinished} or ${isClosed})`
    case OrderShelf.Returns:
      return sql`(${isReturn} and not ${isClosed})`
    case OrderShelf.Quick:
      return sql`(${isOpen} and (${isQuick}))`
    case OrderShelf.Active:
      return sql`(${isOpen} and not (${isQuick}))`
  }
}
