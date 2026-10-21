import { and, eq, gt, sql, type InferSelectModel } from 'drizzle-orm'
import {
  cartItems,
  carts,
  inventoryReservations,
  productImages,
  productVariants,
  products,
} from '@/db/schema'
import { unitPriceCentsFor, wholesaleTierOf } from '@/features/catalog/model/pricing'
import { db } from '@/lib/db'

export type CartRow = InferSelectModel<typeof carts>

export type CartSizeOption = {
  readonly variantId: string
  readonly size: string
  readonly stockQty: number
}

export type CartItemRow = {
  readonly id: string
  readonly variantId: string
  readonly productId: string
  readonly quantity: number
  readonly productSlug: string
  readonly productTitle: string
  readonly variantLabel: string
  // The variant's options as they are now, for the line to set out apart.
  readonly color: string | null
  readonly size: string | null
  // The product's sizes in the line's colour, the line's own included: what
  // the line can be switched to without leaving the cart.
  readonly sizeOptions: readonly CartSizeOption[]
  readonly unitPriceCents: number
  // What one unit costs on its own today; below it the line is at the
  // wholesale price.
  readonly regularUnitPriceCents: number
  // The product's tier, with the variant's own delta folded into the price;
  // both null when the product has none.
  readonly wholesaleMinQty: number | null
  readonly wholesaleUnitPriceCents: number | null
  readonly weightGrams: number
  readonly imageStorageKey: string | null
  readonly sku: string
}

export type AddItemResult =
  | { readonly status: 'added'; readonly quantity: number }
  | { readonly status: 'variant_missing' }
  | { readonly status: 'out_of_stock'; readonly requested: number; readonly available: number }

const CART_TTL_DAYS = 30

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export const cartRepository = {
  async create(): Promise<CartRow> {
    const [row] = await db.insert(carts).values({ expiresAt: expiryDate() }).returning()

    if (!row) throw new Error('Cart could not be created')

    return row
  },

  async findById(cartId: string): Promise<CartRow | null> {
    const [row] = await db.select().from(carts).where(eq(carts.id, cartId)).limit(1)
    return row ?? null
  },

  async findItems(cartId: string): Promise<CartItemRow[]> {
    return db
      .select({
        id: cartItems.id,
        variantId: cartItems.variantId,
        productId: products.id,
        quantity: cartItems.quantity,
        productSlug: cartItems.productSlug,
        productTitle: cartItems.productTitle,
        variantLabel: cartItems.variantLabel,
        color: sql<string | null>`${productVariants.options} ->> 'Color'`,
        size: sql<string | null>`${productVariants.options} ->> 'Size'`,
        sizeOptions: sql<CartSizeOption[]>`coalesce((
          select json_agg(json_build_object(
            'variantId', sibling.id, 'size', sibling.options ->> 'Size', 'stockQty', sibling.stock_qty
          ) order by sibling.position)
          from product_variants sibling
          where sibling.product_id = ${productVariants.productId}
            and sibling.is_active
            and sibling.options ? 'Size'
            and sibling.options ->> 'Color' is not distinct from ${productVariants.options} ->> 'Color'
        ), '[]'::json)`,
        unitPriceCents: cartItems.unitPriceCents,
        regularUnitPriceCents: sql<number>`(coalesce(${products.salePriceCents}, ${products.priceCents}) + ${productVariants.priceDeltaCents})::int`,
        wholesaleMinQty: products.wholesaleMinQty,
        wholesaleUnitPriceCents: sql<number | null>`(${products.wholesalePriceCents} + ${productVariants.priceDeltaCents})::int`,
        weightGrams: cartItems.weightGrams,
        imageStorageKey: cartItems.imageStorageKey,
        sku: productVariants.sku,
      })
      .from(cartItems)
      .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(eq(cartItems.cartId, cartId))
      .orderBy(cartItems.createdAt)
  },

  // The stock read is locked so two shoppers cannot both pass the availability
  // check on the last unit. See AGENTS.md §14.
  async addItem(cartId: string, variantId: string, quantity: number): Promise<AddItemResult> {
    return db.transaction(async (tx) => {
      const variant = await lockVariant(tx, variantId)
      if (!variant) return { status: 'variant_missing' }

      const existingQuantity = await lineQuantityOf(tx, cartId, variantId)
      const available = await availableFor(tx, variantId, cartId, variant.stockQty)
      const nextQuantity = existingQuantity + quantity

      if (nextQuantity > available) {
        return { status: 'out_of_stock', requested: nextQuantity, available }
      }

      await writeLine(tx, cartId, variant, nextQuantity)
      await repriceProduct(tx, cartId, variant.productId)
      await tx.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId))

      return { status: 'added', quantity: nextQuantity }
    })
  },

  // A line moves to another variant of its product — a cover to the other
  // Starlink model — keeping its quantity and its place in the cart; a line
  // already holding that variant takes the units in. Stock is checked as for
  // an add.
  async switchVariant(cartId: string, itemId: string, variantId: string): Promise<AddItemResult> {
    return db.transaction(async (tx) => {
      const [item] = await tx
        .select({
          quantity: cartItems.quantity,
          variantId: cartItems.variantId,
          productId: productVariants.productId,
        })
        .from(cartItems)
        .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
        .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
        .limit(1)

      if (!item) return { status: 'variant_missing' }
      if (item.variantId === variantId) return { status: 'added', quantity: item.quantity }

      const variant = await lockVariant(tx, variantId)
      if (!variant || variant.productId !== item.productId) return { status: 'variant_missing' }

      const heldQuantity = await lineQuantityOf(tx, cartId, variantId)
      const nextQuantity = heldQuantity + item.quantity
      const available = await availableFor(tx, variantId, cartId, variant.stockQty)
      if (nextQuantity > available) {
        return { status: 'out_of_stock', requested: nextQuantity, available }
      }

      if (heldQuantity > 0) {
        await tx.delete(cartItems).where(eq(cartItems.id, itemId))
        await writeLine(tx, cartId, variant, nextQuantity)
      } else {
        await tx
          .update(cartItems)
          .set({ ...lineSnapshotOf(variant), updatedAt: new Date() })
          .where(eq(cartItems.id, itemId))
      }
      await repriceProduct(tx, cartId, variant.productId)
      await tx.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cartId))

      return { status: 'added', quantity: nextQuantity }
    })
  },

  async setQuantity(cartId: string, itemId: string, quantity: number): Promise<AddItemResult> {
    return db.transaction(async (tx) => {
      const [item] = await tx
        .select({ variantId: cartItems.variantId, productId: productVariants.productId })
        .from(cartItems)
        .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
        .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
        .limit(1)

      if (!item) return { status: 'variant_missing' }

      const [variant] = await tx
        .select({ stockQty: productVariants.stockQty })
        .from(productVariants)
        .where(eq(productVariants.id, item.variantId))
        .for('update')
        .limit(1)

      if (!variant) return { status: 'variant_missing' }

      const available = await availableFor(tx, item.variantId, cartId, variant.stockQty)

      if (quantity > available) return { status: 'out_of_stock', requested: quantity, available }

      await tx
        .update(cartItems)
        .set({ quantity, updatedAt: new Date() })
        .where(eq(cartItems.id, itemId))
      await repriceProduct(tx, cartId, item.productId)

      return { status: 'added', quantity }
    })
  },

  // The lines left behind may drop out of the wholesale tier, so the
  // product is repriced after the delete.
  async removeItem(cartId: string, itemId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [item] = await tx
        .select({ productId: productVariants.productId })
        .from(cartItems)
        .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
        .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
        .limit(1)

      await tx.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
      if (item) await repriceProduct(tx, cartId, item.productId)
    })
  },

  // The cart made it into an order: its lines are snapshotted there, so the
  // working copy goes away instead of resurfacing on the next visit.
  async deleteCart(cartId: string): Promise<void> {
    await db.delete(carts).where(eq(carts.id, cartId))
  },

  async touch(cartId: string): Promise<void> {
    await db
      .update(carts)
      .set({ updatedAt: new Date(), expiresAt: expiryDate() })
      .where(eq(carts.id, cartId))
  },
}

type LockedVariant = {
  readonly id: string
  readonly productId: string
  readonly options: Record<string, string>
  readonly stockQty: number
  readonly priceDeltaCents: number
  readonly productSlug: string
  readonly productTitle: string
  readonly priceCents: number
  readonly salePriceCents: number | null
  readonly weightGrams: number
}

// An active variant with what a cart line snapshots of it, its row locked
// for the rest of the transaction.
async function lockVariant(tx: Transaction, variantId: string): Promise<LockedVariant | null> {
  const [variant] = await tx
    .select({
      id: productVariants.id,
      productId: products.id,
      options: productVariants.options,
      stockQty: productVariants.stockQty,
      priceDeltaCents: productVariants.priceDeltaCents,
      productSlug: products.slug,
      // The cart, the order and the waybill description all read this
      // one: the short name where there is one, the full title otherwise.
      productTitle: sql<string>`coalesce(${products.shortTitle}, ${products.title})`,
      priceCents: products.priceCents,
      salePriceCents: products.salePriceCents,
      weightGrams: products.weightGrams,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(eq(productVariants.id, variantId), eq(productVariants.isActive, true)))
    .for('update', { of: productVariants })
    .limit(1)

  return variant ?? null
}

async function lineQuantityOf(tx: Transaction, cartId: string, variantId: string): Promise<number> {
  const [existing] = await tx
    .select({ quantity: cartItems.quantity })
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)))
    .limit(1)

  return existing?.quantity ?? 0
}

// What a line copies from its variant at the moment it is written; the unit
// price is settled by repriceProduct afterwards.
function lineSnapshotOf(variant: LockedVariant) {
  return {
    variantId: variant.id,
    productSlug: variant.productSlug,
    productTitle: variant.productTitle,
    variantLabel: variantLabelOf(variant.options),
    // A live sale price wins at the moment the line snapshots the price.
    unitPriceCents: (variant.salePriceCents ?? variant.priceCents) + variant.priceDeltaCents,
    weightGrams: variant.weightGrams,
  }
}

// The variant's line at the given quantity, snapshotted as the buyer sees it
// now.
async function writeLine(
  tx: Transaction,
  cartId: string,
  variant: LockedVariant,
  quantity: number,
): Promise<void> {
  const [cover] = await tx
    .select({ storageKey: productImages.storageKey })
    .from(productImages)
    .where(eq(productImages.productId, variant.productId))
    .orderBy(productImages.position)
    .limit(1)

  await tx
    .insert(cartItems)
    .values({
      cartId,
      quantity,
      ...lineSnapshotOf(variant),
      imageStorageKey: cover?.storageKey ?? null,
    })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.variantId],
      set: { quantity, updatedAt: new Date() },
    })
}

// The unit price of every line of one product, set from how many of the
// product the cart holds across its variants: the wholesale tier is earned
// by the product, not by a colour. Runs inside the mutation's transaction so
// the price and the quantity change together.
async function repriceProduct(tx: Transaction, cartId: string, productId: string): Promise<void> {
  const lines = await tx
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      priceDeltaCents: productVariants.priceDeltaCents,
      priceCents: products.priceCents,
      salePriceCents: products.salePriceCents,
      wholesaleMinQty: products.wholesaleMinQty,
      wholesalePriceCents: products.wholesalePriceCents,
    })
    .from(cartItems)
    .innerJoin(productVariants, eq(productVariants.id, cartItems.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(and(eq(cartItems.cartId, cartId), eq(products.id, productId)))

  const productQuantity = lines.reduce((total, line) => total + line.quantity, 0)

  for (const line of lines) {
    const unitPriceCents =
      unitPriceCentsFor(
        {
          priceCents: line.priceCents,
          salePriceCents: line.salePriceCents,
          wholesale: wholesaleTierOf(line.wholesaleMinQty, line.wholesalePriceCents),
        },
        productQuantity,
      ) + line.priceDeltaCents

    await tx
      .update(cartItems)
      .set({ unitPriceCents, updatedAt: new Date() })
      .where(eq(cartItems.id, line.id))
  }
}

// A cart must not be blocked by the stock it reserved itself: those units are
// already spoken for by this shopper, not by someone else.
async function availableFor(
  tx: Transaction,
  variantId: string,
  cartId: string,
  stockQty: number,
): Promise<number> {
  const [reserved] = await tx
    .select({
      total: sql<number>`coalesce(sum(case when ${inventoryReservations.cartId} = ${cartId} then 0 else ${inventoryReservations.quantity} end), 0)::int`,
    })
    .from(inventoryReservations)
    .where(
      and(
        eq(inventoryReservations.variantId, variantId),
        gt(inventoryReservations.expiresAt, new Date()),
      ),
    )

  return stockQty - (reserved?.total ?? 0)
}

function expiryDate(): Date {
  const expires = new Date()
  expires.setDate(expires.getDate() + CART_TTL_DAYS)
  return expires
}

function variantLabelOf(options: Record<string, string>): string {
  return Object.values(options).join(' · ')
}
