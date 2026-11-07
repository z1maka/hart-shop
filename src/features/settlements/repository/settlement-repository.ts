import { and, asc, desc, eq, exists, inArray, notExists, sql, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { OrderStatus, SettlementLineKind, SettlementStatus, type SalesChannel } from '@/db/enums'
import { orderItems, orders, workshopSettlementLines, workshopSettlements } from '@/db/schema'
import type {
  CodFee,
  SettlementLineDraft,
  SettlementOrder,
  SettlementOrderLine,
} from '@/features/settlements/model/settlement'
import { DISPLAY_TIME_ZONE } from '@/lib/datetime'
import { db } from '@/lib/db'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
type Executor = typeof db | Transaction

export type SettlementRow = {
  readonly id: string
  readonly number: number
  readonly status: SettlementStatus
  readonly periodFrom: string
  readonly periodTo: string
  readonly codFeeBasisPoints: number
  readonly codFeeFixedCents: number
  readonly totalCents: number
  readonly paidOn: string | null
  readonly createdAt: Date
}

export type SettlementListRow = SettlementRow & { readonly lineCount: number }

export type SettlementLineRow = SettlementLineDraft & { readonly id: string }

// A collected parcel not settled yet, with what the settlement needs of it.
export type UnsettledOrder = SettlementOrder & {
  readonly channel: SalesChannel
  // Null only for a parcel collected while the stamp was being introduced.
  readonly deliveredAt: Date | null
}

// A settled parcel the buyer has returned since: its sale line, waiting for
// the return line that takes the difference back.
export type PendingReturn = SettlementLineDraft & { readonly returnedAt: Date }

// What a settlement copies when it is made: the picked orders are read again
// under their row locks and counted by the model's rules, never by sums the
// browser sent.
export type SettlementCreation = {
  readonly periodFrom: string
  readonly periodTo: string
  readonly fee: CodFee
  readonly saleOrderIds: readonly string[]
  readonly returnOrderIds: readonly string[]
  readonly saleLineOf: (order: SettlementOrder) => SettlementLineDraft | null
  readonly returnLineOf: (sale: SettlementLineDraft) => SettlementLineDraft
  readonly totalOf: (lines: readonly SettlementLineDraft[]) => number
}

const SETTLEMENT_COLUMNS = {
  id: workshopSettlements.id,
  number: workshopSettlements.number,
  status: workshopSettlements.status,
  periodFrom: workshopSettlements.periodFrom,
  periodTo: workshopSettlements.periodTo,
  codFeeBasisPoints: workshopSettlements.codFeeBasisPoints,
  codFeeFixedCents: workshopSettlements.codFeeFixedCents,
  totalCents: workshopSettlements.totalCents,
  paidOn: workshopSettlements.paidOn,
  createdAt: workshopSettlements.createdAt,
}

const LINE_DRAFT_COLUMNS = {
  orderId: workshopSettlementLines.orderId,
  kind: workshopSettlementLines.kind,
  orderNumber: workshopSettlementLines.orderNumber,
  itemsLabel: workshopSettlementLines.itemsLabel,
  trackingNumber: workshopSettlementLines.trackingNumber,
  saleCents: workshopSettlementLines.saleCents,
  costCents: workshopSettlementLines.costCents,
  codFeeCents: workshopSettlementLines.codFeeCents,
  amountCents: workshopSettlementLines.amountCents,
}

const LINE_COLUMNS = { id: workshopSettlementLines.id, ...LINE_DRAFT_COLUMNS }

const UNSETTLED_ORDER_COLUMNS = {
  id: orders.id,
  orderNumber: orders.orderNumber,
  paymentRoute: orders.paymentRoute,
  totalCents: orders.totalCents,
  prepaidCents: orders.prepaidCents,
  trackingNumber: orders.trackingNumber,
  channel: orders.channel,
  deliveredAt: orders.deliveredAt,
}

// The settlements page lists the newest ones; the page says when older
// ones are left out.
export const SETTLEMENT_LIST_MAX_ROWS = 100

// A second tab settled one of the picked orders between the read and the
// insert: the unique pair refused its line, and the whole settlement goes.
class SettlementConflict extends Error {}

export const settlementRepository = {
  // Collected parcels with no sale line yet, oldest collection first. With a
  // range, only those collected on its days (the shop's clock).
  async findUnsettled(
    range: { readonly from: string; readonly to: string } | null,
    limit: number,
  ): Promise<UnsettledOrder[]> {
    const rows = await db
      .select(UNSETTLED_ORDER_COLUMNS)
      .from(orders)
      .where(and(eq(orders.status, OrderStatus.Delivered), notSold(), ...collectedWithin(range)))
      .orderBy(asc(orders.deliveredAt), asc(orders.orderNumber))
      .limit(limit)
    const linesByOrder = await linesOf(
      db,
      rows.map((row) => row.id),
    )

    return rows.map((row) => ({ ...row, lines: linesByOrder.get(row.id) ?? [] }))
  },

  async findPendingReturns(limit: number): Promise<PendingReturn[]> {
    return db
      .select({ ...LINE_DRAFT_COLUMNS, returnedAt: orders.updatedAt })
      .from(workshopSettlementLines)
      .innerJoin(orders, eq(orders.id, workshopSettlementLines.orderId))
      .where(
        and(
          eq(workshopSettlementLines.kind, SettlementLineKind.Sale),
          eq(orders.status, OrderStatus.Refunded),
          notReturned(),
        ),
      )
      .orderBy(asc(orders.updatedAt))
      .limit(limit)
  },

  // Null when the picked orders no longer fit: one was settled, returned or
  // lost its workshop price meanwhile. Nothing is written then.
  async create(creation: SettlementCreation): Promise<SettlementRow | null> {
    try {
      return await db.transaction(async (tx) => {
        const sales = await lockedSaleLines(tx, creation)
        const returns = await lockedReturnLines(tx, creation)
        if (!sales || !returns) return null

        const lines = [...sales, ...returns]
        const number = await nextNumber(tx)
        const [settlement] = await tx
          .insert(workshopSettlements)
          .values({
            number,
            status: SettlementStatus.Created,
            periodFrom: creation.periodFrom,
            periodTo: creation.periodTo,
            codFeeBasisPoints: creation.fee.basisPoints,
            codFeeFixedCents: creation.fee.fixedCents,
            totalCents: creation.totalOf(lines),
          })
          .returning(SETTLEMENT_COLUMNS)
        if (!settlement) throw new Error('Settlement insert returned nothing')

        const inserted = await tx
          .insert(workshopSettlementLines)
          .values(lines.map((line) => ({ ...line, settlementId: settlement.id })))
          .onConflictDoNothing()
          .returning({ id: workshopSettlementLines.id })
        if (inserted.length !== lines.length) throw new SettlementConflict()

        return settlement
      })
    } catch (error) {
      if (error instanceof SettlementConflict) return null
      throw error
    }
  },

  async markPaid(settlementId: string, paidOn: string): Promise<SettlementRow | null> {
    const [row] = await db
      .update(workshopSettlements)
      .set({ status: SettlementStatus.Paid, paidOn, updatedAt: new Date() })
      .where(
        and(
          eq(workshopSettlements.id, settlementId),
          eq(workshopSettlements.status, SettlementStatus.Created),
        ),
      )
      .returning(SETTLEMENT_COLUMNS)
    return row ?? null
  },

  // Its lines go with it, and their orders wait for the next settlement.
  // Not while a later settlement took one of its sales back: that return
  // would then subtract a difference no settlement billed.
  async deleteCreated(settlementId: string): Promise<SettlementRow | null> {
    const [row] = await db
      .delete(workshopSettlements)
      .where(
        and(
          eq(workshopSettlements.id, settlementId),
          eq(workshopSettlements.status, SettlementStatus.Created),
          notExists(returnedSales()),
        ),
      )
      .returning(SETTLEMENT_COLUMNS)
    return row ?? null
  },

  async hasReturnedSales(settlementId: string): Promise<boolean> {
    const [row] = await db
      .select({ one: sql`1` })
      .from(workshopSettlements)
      .where(and(eq(workshopSettlements.id, settlementId), exists(returnedSales())))
      .limit(1)
    return row !== undefined
  },

  async findById(settlementId: string): Promise<SettlementRow | null> {
    const [row] = await db
      .select(SETTLEMENT_COLUMNS)
      .from(workshopSettlements)
      .where(eq(workshopSettlements.id, settlementId))
      .limit(1)
    return row ?? null
  },

  // Sales first, then returns, each in order-number order.
  async findLines(settlementId: string): Promise<SettlementLineRow[]> {
    return db
      .select(LINE_COLUMNS)
      .from(workshopSettlementLines)
      .where(eq(workshopSettlementLines.settlementId, settlementId))
      .orderBy(desc(workshopSettlementLines.kind), asc(workshopSettlementLines.orderNumber))
  },

  // One row past the page, so the page knows older ones exist.
  async list(): Promise<SettlementListRow[]> {
    return db
      .select({
        ...SETTLEMENT_COLUMNS,
        lineCount: sql<number>`count(${workshopSettlementLines.id})::int`,
      })
      .from(workshopSettlements)
      .leftJoin(
        workshopSettlementLines,
        eq(workshopSettlementLines.settlementId, workshopSettlements.id),
      )
      .groupBy(workshopSettlements.id)
      .orderBy(desc(workshopSettlements.number))
      .limit(SETTLEMENT_LIST_MAX_ROWS + 1)
  },

  // What the settlements add up to by status: paid by the workshop, or made
  // out and waiting for its money.
  async totalsByStatus(): Promise<
    { status: SettlementStatus; totalCents: number; count: number }[]
  > {
    return db
      .select({
        status: workshopSettlements.status,
        totalCents: sql<number>`coalesce(sum(${workshopSettlements.totalCents}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(workshopSettlements)
      .groupBy(workshopSettlements.status)
  },
}

function notSold(): SQL {
  return notExists(
    db
      .select({ one: sql`1` })
      .from(workshopSettlementLines)
      .where(
        and(
          eq(workshopSettlementLines.orderId, orders.id),
          eq(workshopSettlementLines.kind, SettlementLineKind.Sale),
        ),
      ),
  )
}

function notReturned(): SQL {
  return notExists(
    db
      .select({ one: sql`1` })
      .from(workshopSettlementLines)
      .where(
        and(
          eq(workshopSettlementLines.orderId, orders.id),
          eq(workshopSettlementLines.kind, SettlementLineKind.Return),
        ),
      ),
  )
}

const returnLines = alias(workshopSettlementLines, 'return_lines')

// The outer settlement's sales that a return line has taken back since.
function returnedSales() {
  return db
    .select({ one: sql`1` })
    .from(workshopSettlementLines)
    .innerJoin(
      returnLines,
      and(
        eq(returnLines.orderId, workshopSettlementLines.orderId),
        eq(returnLines.kind, SettlementLineKind.Return),
      ),
    )
    .where(
      and(
        eq(workshopSettlementLines.settlementId, workshopSettlements.id),
        eq(workshopSettlementLines.kind, SettlementLineKind.Sale),
      ),
    )
}

function collectedWithin(range: { readonly from: string; readonly to: string } | null): SQL[] {
  if (!range) return []
  return [
    sql`${orders.deliveredAt} >= (${range.from}::timestamp at time zone ${DISPLAY_TIME_ZONE})`,
    sql`${orders.deliveredAt} < ((${range.to}::timestamp + interval '1 day') at time zone ${DISPLAY_TIME_ZONE})`,
  ]
}

async function linesOf(
  executor: Executor,
  orderIds: readonly string[],
): Promise<Map<string, SettlementOrderLine[]>> {
  if (orderIds.length === 0) return new Map()

  const rows = await executor
    .select({
      orderId: orderItems.orderId,
      productTitle: orderItems.productTitle,
      variantLabel: orderItems.variantLabel,
      quantity: orderItems.quantity,
      unitPriceCents: orderItems.unitPriceCents,
      unitCostCents: orderItems.unitCostCents,
    })
    .from(orderItems)
    .where(inArray(orderItems.orderId, [...orderIds]))
    .orderBy(asc(orderItems.createdAt), asc(orderItems.id))

  const byOrder = new Map<string, SettlementOrderLine[]>()
  for (const { orderId, ...line } of rows)
    byOrder.set(orderId, [...(byOrder.get(orderId) ?? []), line])
  return byOrder
}

// The picked collected parcels, locked against a status change, each still
// unsettled; null when one of them no longer is or has no workshop price.
async function lockedSaleLines(
  tx: Transaction,
  creation: SettlementCreation,
): Promise<SettlementLineDraft[] | null> {
  if (creation.saleOrderIds.length === 0) return []

  const rows = await tx
    .select(UNSETTLED_ORDER_COLUMNS)
    .from(orders)
    .where(
      and(
        inArray(orders.id, [...creation.saleOrderIds]),
        eq(orders.status, OrderStatus.Delivered),
        notSold(),
      ),
    )
    .for('update', { of: orders })
  if (rows.length !== creation.saleOrderIds.length) return null

  const linesByOrder = await linesOf(
    tx,
    rows.map((row) => row.id),
  )
  const drafts = rows.map((row) =>
    creation.saleLineOf({ ...row, lines: linesByOrder.get(row.id) ?? [] }),
  )
  return drafts.every((draft) => draft !== null) ? drafts : null
}

async function lockedReturnLines(
  tx: Transaction,
  creation: SettlementCreation,
): Promise<SettlementLineDraft[] | null> {
  if (creation.returnOrderIds.length === 0) return []

  const sales = await tx
    .select(LINE_DRAFT_COLUMNS)
    .from(workshopSettlementLines)
    .innerJoin(orders, eq(orders.id, workshopSettlementLines.orderId))
    .where(
      and(
        inArray(workshopSettlementLines.orderId, [...creation.returnOrderIds]),
        eq(workshopSettlementLines.kind, SettlementLineKind.Sale),
        eq(orders.status, OrderStatus.Refunded),
        notReturned(),
      ),
    )
    .for('update', { of: orders })
  if (sales.length !== creation.returnOrderIds.length) return null

  return sales.map((sale) => creation.returnLineOf(sale))
}

// A number taken and not used is burnt, never reissued: the sequence does not
// roll back with the transaction.
async function nextNumber(tx: Transaction): Promise<number> {
  const [row] = await tx.execute<{ value: string }>(
    sql`select nextval('workshop_settlement_number_seq') as value`,
  )
  if (!row) throw new Error('Settlement number sequence returned nothing')
  return Number(row.value)
}
