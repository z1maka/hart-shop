import { and, asc, eq, gt, ilike, inArray, or, sql } from 'drizzle-orm'
import { PaymentRoute, ProductStatus } from '@/db/enums'
import {
  inventoryReservations,
  orderItems,
  orders,
  productImages,
  productVariants,
  products,
} from '@/db/schema'
import { wholesaleTierOf, type PricedProduct } from '@/features/catalog/model/pricing'
import { variantLabelOf } from '@/features/catalog/model/product-view'
import {
  linesSubtotalCents,
  orderEditBlockOf,
  repricedLines,
  stockChanges,
  type EditLine,
} from '@/features/orders/model/order-edit'
import { db } from '@/lib/db'
import {
  OrderEmptyError,
  OrderNotEditableError,
  OrderNotFoundError,
  OutOfStockError,
  PrepaymentNotAllowedError,
  ProductNotFoundError,
  VariantNotFoundError,
} from '@/lib/errors'
import { escapeLikePattern } from '@/lib/sql'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

// The admin names variants and quantities; zero takes a line out. A line the
// request does not name keeps its quantity.
export type RequestedLine = {
  readonly variantId: string
  readonly quantity: number
}

export type EditedTotals = {
  readonly previousTotalCents: number
  readonly subtotalCents: number
  readonly totalCents: number
}

// A variant the admin can put in an order: on sale on the site right now.
export type AddableVariantRow = {
  readonly variantId: string
  readonly sku: string
  readonly productTitle: string
  readonly options: Record<string, string>
  readonly unitPriceCents: number
  readonly stockQty: number
}

type LockedVariant = {
  readonly id: string
  readonly productId: string
  readonly sku: string
  readonly options: Record<string, string>
  readonly isOnSale: boolean
  readonly stockQty: number
  readonly priceDeltaCents: number
  readonly priceCents: number
  readonly salePriceCents: number | null
  readonly wholesaleMinQty: number | null
  readonly wholesalePriceCents: number | null
  readonly productSlug: string
  readonly productTitle: string
  readonly weightGrams: number
  readonly costCents: number | null
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
      const after = repricedLines(before, requestedLines(before, requested, variants), (id) =>
        pricingOf(id, variants),
      )
      // A line whose variant was deleted cannot be priced again; it stays.
      const frozen = stored.filter((line) => line.variantId === null)
      if (after.length + frozen.length === 0) throw new OrderEmptyError(orderId)

      await applyStockChanges(tx, stockChanges(before, after), variants)
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

      return { previousTotalCents: order.totalCents, subtotalCents, totalCents }
    })
  },

  // By the product's title or short title, or a variant's SKU.
  async findAddableVariants(search: string, limit: number): Promise<AddableVariantRow[]> {
    const pattern = `%${escapeLikePattern(search)}%`

    return db
      .select({
        variantId: productVariants.id,
        sku: productVariants.sku,
        productTitle: sql<string>`coalesce(${products.shortTitle}, ${products.title})`,
        options: productVariants.options,
        unitPriceCents: sql<number>`(coalesce(${products.salePriceCents}, ${products.priceCents}) + ${productVariants.priceDeltaCents})::int`,
        stockQty: productVariants.stockQty,
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
          ),
        ),
      )
      .orderBy(asc(products.title), asc(productVariants.position), asc(productVariants.id))
      .limit(limit)
  },
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

async function lockVariants(
  tx: Transaction,
  variantIds: readonly string[],
): Promise<Map<string, LockedVariant>> {
  if (variantIds.length === 0) return new Map()

  const rows = await tx
    .select({
      id: productVariants.id,
      productId: products.id,
      sku: productVariants.sku,
      options: productVariants.options,
      isOnSale: sql<boolean>`(${productVariants.isActive} and ${products.status} = ${ProductStatus.Published})`,
      stockQty: productVariants.stockQty,
      priceDeltaCents: productVariants.priceDeltaCents,
      priceCents: products.priceCents,
      salePriceCents: products.salePriceCents,
      wholesaleMinQty: products.wholesaleMinQty,
      wholesalePriceCents: products.wholesalePriceCents,
      productSlug: products.slug,
      // The name the cart, the order and the waybill read.
      productTitle: sql<string>`coalesce(${products.shortTitle}, ${products.title})`,
      weightGrams: products.weightGrams,
      costCents: products.costCents,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(inArray(productVariants.id, [...new Set(variantIds)]))
    // One locking order for every edit, so two of them never wait on each other.
    .orderBy(asc(productVariants.id))
    .for('update', { of: productVariants })

  return new Map(rows.map((row) => [row.id, row]))
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
        // Priced by repricedLines: the product's quantity changes with it.
        unitPriceCents: 0,
      }
    })

  return [...kept, ...added]
}

function pricingOf(productId: string, variants: Map<string, LockedVariant>): PricedProduct {
  const variant = [...variants.values()].find((entry) => entry.productId === productId)
  if (!variant) throw new ProductNotFoundError(productId)

  return {
    priceCents: variant.priceCents,
    salePriceCents: variant.salePriceCents,
    wholesale: wholesaleTierOf(variant.wholesaleMinQty, variant.wholesalePriceCents),
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

async function heldInCarts(tx: Transaction, variantId: string): Promise<number> {
  const [held] = await tx
    .select({
      total: sql<number>`coalesce(sum(${inventoryReservations.quantity}), 0)::int`,
    })
    .from(inventoryReservations)
    .where(
      and(
        eq(inventoryReservations.variantId, variantId),
        gt(inventoryReservations.expiresAt, new Date()),
      ),
    )

  return held?.total ?? 0
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
    await insertLine(tx, orderId, line, variant)
  }
}

// A new line snapshots its variant as checkout does: the names, the weight,
// the cover photo and the workshop price of the moment.
async function insertLine(
  tx: Transaction,
  orderId: string,
  line: EditLine,
  variant: LockedVariant,
): Promise<void> {
  const [cover] = await tx
    .select({ storageKey: productImages.storageKey })
    .from(productImages)
    .where(eq(productImages.productId, variant.productId))
    .orderBy(productImages.position)
    .limit(1)

  await tx.insert(orderItems).values({
    orderId,
    variantId: variant.id,
    sku: variant.sku,
    productSlug: variant.productSlug,
    productTitle: variant.productTitle,
    variantLabel: variantLabelOf(variant.options),
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    unitCostCents: variant.costCents,
    weightGrams: variant.weightGrams,
    imageStorageKey: cover?.storageKey ?? null,
  })
}
