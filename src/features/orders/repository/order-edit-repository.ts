import { and, asc, eq, ilike, or, sql } from 'drizzle-orm'
import { InvoiceStatus, PaymentRoute, ProductStatus, type SalesChannel } from '@/db/enums'
import { invoices, orderItems, orders, productImages, productVariants, products } from '@/db/schema'
import { wholesaleTierOf } from '@/features/catalog/model/pricing'
import { linePricingFor, type ChannelPricedProduct } from '@/features/orders/model/channel-pricing'
import {
  lineRepricingFor,
  linesSubtotalCents,
  withAgreedPrices,
  orderEditBlockOf,
  priceQueryCents,
  stockChanges,
  type EditLine,
} from '@/features/orders/model/order-edit'
import { db } from '@/lib/db'
import {
  heldInCarts,
  insertOrderLine,
  lockVariants,
  type LockedVariant,
  type Transaction,
} from '@/features/orders/repository/order-lines-tx'
import {
  DropPriceMissingError,
  OrderEmptyError,
  OrderNotEditableError,
  OrderNotFoundError,
  OutOfStockError,
  PrepaymentNotAllowedError,
  ProductNotFoundError,
  VariantNotFoundError,
} from '@/lib/errors'
import { escapeLikePattern } from '@/lib/sql'

// The admin names variants and quantities; zero takes a line out. A line the
// request does not name keeps its quantity. A price agreed with the buyer
// overrides the channel's pricing for that line.
export type RequestedLine = {
  readonly variantId: string
  readonly quantity: number
  readonly agreedUnitPriceCents?: number
}

export type EditedTotals = {
  readonly previousTotalCents: number
  readonly subtotalCents: number
  readonly totalCents: number
  // The invoice the edit made stale and voided; null when none was live.
  readonly voidedInvoiceNumber: number | null
}

// A variant the admin can put in an order: on sale on the site right now.
export type AddableVariantRow = {
  readonly variantId: string
  readonly productSlug: string
  readonly sku: string
  readonly productTitle: string
  readonly options: Record<string, string>
  // The site's price for one unit, sale included, and the partner's; both
  // with the variant's surcharge. Null drop price: no partner order.
  readonly unitPriceCents: number
  readonly dropUnitPriceCents: number | null
  readonly unitCostCents: number | null
  readonly weightGrams: number
  readonly stockQty: number
  // The variant's own cover, else the product's first photo; square when cut.
  readonly imageStorageKey: string | null
}

type StoredLine = {
  readonly id: string
  readonly variantId: string | null
  readonly quantity: number
  readonly unitPriceCents: number
}

export const orderEditRepository = {
  // Everything under the order's row lock: a waybill issued from another tab,
  // or a second edit, waits for this one, and the stock read and the stock
  // write are not separated by another sale.
  async editLines(orderId: string, requested: readonly RequestedLine[]): Promise<EditedTotals> {
    return db.transaction(async (tx) => {
      const order = await lockOrder(tx, orderId)
      const stored: StoredLine[] = await tx
        .select({
          id: orderItems.id,
          variantId: orderItems.variantId,
          quantity: orderItems.quantity,
          unitPriceCents: orderItems.unitPriceCents,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId))

      const variants = await lockVariants(tx, [
        ...stored.flatMap((line) => (line.variantId ? [line.variantId] : [])),
        ...requested.map((line) => line.variantId),
      ])
      const before = stored.flatMap((line) => editLineOf(line, variants))
      const priceOf = channelUnitPrice(order.channel, variants)
      const repriced = lineRepricingFor(order.channel)
      const after = withAgreedPrices(
        repriced(before, requestedLines(before, requested, variants), priceOf),
        agreedPricesOf(requested),
      )
      // A line whose variant was deleted cannot be priced again; it stays.
      const frozen = stored.filter((line) => line.variantId === null)
      if (after.length + frozen.length === 0) throw new OrderEmptyError(orderId)

      const changes = stockChanges(before, after)
      await applyStockChanges(tx, changes, variants)
      await writeLines(tx, orderId, stored, after, variants)

      const subtotalCents = linesSubtotalCents([...after, ...frozen])
      const totalCents = subtotalCents + order.shippingCents
      const isPrepaid = order.paymentRoute === PaymentRoute.CashOnDelivery && order.prepaidCents > 0
      if (isPrepaid && order.prepaidCents >= totalCents) {
        throw new PrepaymentNotAllowedError(orderId, 'covers_total')
      }

      await tx
        .update(orders)
        .set({ subtotalCents, totalCents, updatedAt: new Date() })
        .where(eq(orders.id, orderId))

      // Saved unchanged, the invoice still matches and stays live.
      const isChanged = changes.size > 0 || totalCents !== order.totalCents
      const voidedInvoiceNumber = isChanged ? await voidLiveInvoice(tx, orderId) : null

      return {
        previousTotalCents: order.totalCents,
        subtotalCents,
        totalCents,
        voidedInvoiceNumber,
      }
    })
  },

  // By the product's title or short title, a variant's SKU, or — when the
  // admin typed a number — one unit's retail or drop price. The catalogue is
  // a few hundred variants, so the scan stays cheap without an index.
  async findAddableVariants(search: string, limit: number): Promise<AddableVariantRow[]> {
    const pattern = `%${escapeLikePattern(search)}%`
    const priceCents = priceQueryCents(search)
    const unitPriceCents = sql<number>`(coalesce(${products.salePriceCents}, ${products.priceCents}) + ${productVariants.priceDeltaCents})::int`
    const dropUnitPriceCents = sql<
      number | null
    >`(${products.dropPriceCents} + ${productVariants.priceDeltaCents})::int`
    const priceMatches =
      priceCents === null
        ? []
        : [sql`${unitPriceCents} = ${priceCents}`, sql`${dropUnitPriceCents} = ${priceCents}`]

    return db
      .select({
        variantId: productVariants.id,
        productSlug: products.slug,
        sku: productVariants.sku,
        productTitle: sql<string>`coalesce(${products.shortTitle}, ${products.title})`,
        options: productVariants.options,
        unitPriceCents,
        dropUnitPriceCents,
        unitCostCents: products.costCents,
        weightGrams: products.weightGrams,
        stockQty: productVariants.stockQty,
        imageStorageKey: sql<string | null>`coalesce(
          (select coalesce(${productImages.squareStorageKey}, ${productImages.storageKey})
             from ${productImages} where ${productImages.id} = ${productVariants.coverImageId}),
          (select coalesce(${productImages.squareStorageKey}, ${productImages.storageKey})
             from ${productImages} where ${productImages.productId} = ${products.id}
             order by ${productImages.position} limit 1))`,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(
        and(
          eq(productVariants.isActive, true),
          eq(products.status, ProductStatus.Published),
          or(
            ilike(products.title, pattern),
            ilike(products.shortTitle, pattern),
            ilike(productVariants.sku, pattern),
            ...priceMatches,
          ),
        ),
      )
      .orderBy(asc(products.title), asc(productVariants.position), asc(productVariants.id))
      .limit(limit)
  },
}

function agreedPricesOf(requested: readonly RequestedLine[]): Map<string, number> {
  return new Map(
    requested.flatMap((line) =>
      line.agreedUnitPriceCents === undefined ? [] : [[line.variantId, line.agreedUnitPriceCents]],
    ),
  )
}

async function lockOrder(tx: Transaction, orderId: string) {
  const [order] = await tx
    .select({
      status: orders.status,
      paymentRoute: orders.paymentRoute,
      paidAt: orders.paidAt,
      carrierDocumentRef: orders.carrierDocumentRef,
      trackingNumber: orders.trackingNumber,
      shippingCents: orders.shippingCents,
      totalCents: orders.totalCents,
      prepaidCents: orders.prepaidCents,
      channel: orders.channel,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .for('update')
    .limit(1)

  if (!order) throw new OrderNotFoundError(orderId)

  const block = orderEditBlockOf(order)
  if (block) throw new OrderNotEditableError(orderId, block)

  return order
}

function editLineOf(line: StoredLine, variants: Map<string, LockedVariant>): EditLine[] {
  const variant = line.variantId ? variants.get(line.variantId) : undefined
  if (!variant) return []

  return [
    {
      variantId: variant.id,
      productId: variant.productId,
      priceDeltaCents: variant.priceDeltaCents,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
    },
  ]
}

// The order's lines at the quantities asked for, new variants appended. Only
// a variant on sale on the site can join the order.
function requestedLines(
  before: readonly EditLine[],
  requested: readonly RequestedLine[],
  variants: Map<string, LockedVariant>,
): EditLine[] {
  const quantities = new Map(requested.map((line) => [line.variantId, line.quantity]))
  const kept = before.map((line) => ({
    ...line,
    quantity: quantities.get(line.variantId) ?? line.quantity,
  }))
  const added = requested
    .filter((line) => line.quantity > 0 && !before.some((old) => old.variantId === line.variantId))
    .map((line) => {
      const variant = variants.get(line.variantId)
      if (!variant?.isOnSale) throw new VariantNotFoundError(line.variantId)

      return {
        variantId: variant.id,
        productId: variant.productId,
        priceDeltaCents: variant.priceDeltaCents,
        quantity: line.quantity,
        // Priced by the channel's repricing: the line is new to the order.
        unitPriceCents: 0,
      }
    })

  return [...kept, ...added]
}

// The order's channel prices the product: the cart's price on a site order,
// the drop price on a partner's.
function channelUnitPrice(channel: SalesChannel, variants: Map<string, LockedVariant>) {
  const pricing = linePricingFor(channel)

  return (productId: string, quantity: number): number => {
    const price = pricing(pricingOf(productId, variants), quantity)
    if (price === null) throw new DropPriceMissingError(productId)
    return price
  }
}

function pricingOf(productId: string, variants: Map<string, LockedVariant>): ChannelPricedProduct {
  const variant = [...variants.values()].find((entry) => entry.productId === productId)
  if (!variant) throw new ProductNotFoundError(productId)

  return {
    priceCents: variant.priceCents,
    salePriceCents: variant.salePriceCents,
    wholesale: wholesaleTierOf(variant.wholesaleMinQty, variant.wholesalePriceCents),
    dropPriceCents: variant.dropPriceCents,
  }
}

// Units added to the order leave the shelf only if no one else's cart holds
// them; units taken out go back.
async function applyStockChanges(
  tx: Transaction,
  changes: Map<string, number>,
  variants: Map<string, LockedVariant>,
): Promise<void> {
  for (const [variantId, change] of changes) {
    const variant = variants.get(variantId)
    if (!variant) throw new VariantNotFoundError(variantId)

    if (change > 0) {
      const available = variant.stockQty - (await heldInCarts(tx, variantId))
      if (change > available) throw new OutOfStockError(variantId, change, Math.max(0, available))
    }

    await tx
      .update(productVariants)
      .set({ stockQty: sql`${productVariants.stockQty} - ${change}`, updatedAt: new Date() })
      .where(eq(productVariants.id, variantId))
  }
}

async function writeLines(
  tx: Transaction,
  orderId: string,
  stored: readonly StoredLine[],
  after: readonly EditLine[],
  variants: Map<string, LockedVariant>,
): Promise<void> {
  const afterByVariant = new Map(after.map((line) => [line.variantId, line]))

  for (const line of stored) {
    if (!line.variantId) continue
    const next = afterByVariant.get(line.variantId)

    if (!next) {
      await tx.delete(orderItems).where(eq(orderItems.id, line.id))
    } else if (next.quantity !== line.quantity || next.unitPriceCents !== line.unitPriceCents) {
      await tx
        .update(orderItems)
        .set({ quantity: next.quantity, unitPriceCents: next.unitPriceCents })
        .where(eq(orderItems.id, line.id))
    }
  }

  const storedVariants = new Set(stored.map((line) => line.variantId))
  for (const line of after.filter((entry) => !storedVariants.has(entry.variantId))) {
    const variant = variants.get(line.variantId)
    if (!variant) throw new VariantNotFoundError(line.variantId)
    await insertOrderLine(tx, orderId, line, variant)
  }
}

// An invoice is a snapshot of the lines it was issued for: once they change,
// it asks for a sum the order no longer has, and the next one takes a new
// number.
async function voidLiveInvoice(tx: Transaction, orderId: string): Promise<number | null> {
  const [voided] = await tx
    .update(invoices)
    .set({ status: InvoiceStatus.Void })
    .where(and(eq(invoices.orderId, orderId), eq(invoices.status, InvoiceStatus.Issued)))
    .returning({ number: invoices.number })

  return voided?.number ?? null
}
