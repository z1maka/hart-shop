import { and, asc, eq, gt, inArray, sql } from 'drizzle-orm'
import { ProductStatus } from '@/db/enums'
import {
  inventoryReservations,
  orderItems,
  productImages,
  productVariants,
  products,
} from '@/db/schema'
import { variantLabelOf } from '@/features/catalog/model/product-view'
import { type db } from '@/lib/db'

// What an admin-made change to an order's lines needs under one transaction:
// the variants locked in one order, the stock other carts hold, and a line
// written as checkout writes it. The line editor and the partner order share
// it, so both take stock and snapshot a line the same way.

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export type LockedVariant = {
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
  readonly dropPriceCents: number | null
}

export async function lockVariants(
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
      dropPriceCents: products.dropPriceCents,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(inArray(productVariants.id, [...new Set(variantIds)]))
    // One locking order for every edit, so two of them never wait on each other.
    .orderBy(asc(productVariants.id))
    .for('update', { of: productVariants })

  return new Map(rows.map((row) => [row.id, row]))
}

export async function heldInCarts(tx: Transaction, variantId: string): Promise<number> {
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

// A new line snapshots its variant as checkout does: the names, the weight,
// the cover photo and the workshop price of the moment.
export async function insertOrderLine(
  tx: Transaction,
  orderId: string,
  line: { readonly quantity: number; readonly unitPriceCents: number },
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
