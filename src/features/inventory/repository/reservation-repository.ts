import { and, eq, gt, lte, sql } from 'drizzle-orm'
import { cartItems, inventoryReservations, productVariants } from '@/db/schema'
import { db } from '@/lib/db'

export type ReservationRequest = {
  readonly variantId: string
  readonly quantity: number
}

export type ReserveResult =
  | { readonly status: 'reserved'; readonly expiresAt: Date }
  | { readonly status: 'out_of_stock'; readonly variantId: string; readonly available: number }

export const reservationRepository = {
  // Everything happens under a row lock per variant: the availability read and
  // the reservation write must not be separated by another transaction.
  async reserve(
    cartId: string,
    requests: readonly ReservationRequest[],
    expiresAt: Date,
  ): Promise<ReserveResult> {
    return db.transaction(async (tx) => {
      await tx
        .delete(inventoryReservations)
        .where(
          and(
            eq(inventoryReservations.cartId, cartId),
            lte(inventoryReservations.expiresAt, new Date()),
          ),
        )

      for (const request of requests) {
        const [variant] = await tx
          .select({ stockQty: productVariants.stockQty })
          .from(productVariants)
          .where(eq(productVariants.id, request.variantId))
          .for('update')
          .limit(1)

        if (!variant) {
          return { status: 'out_of_stock', variantId: request.variantId, available: 0 }
        }

        const [reserved] = await tx
          .select({
            total: sql<number>`coalesce(sum(case when ${inventoryReservations.cartId} = ${cartId} then 0 else ${inventoryReservations.quantity} end), 0)::int`,
          })
          .from(inventoryReservations)
          .where(
            and(
              eq(inventoryReservations.variantId, request.variantId),
              gt(inventoryReservations.expiresAt, new Date()),
            ),
          )

        const available = variant.stockQty - (reserved?.total ?? 0)

        if (request.quantity > available) {
          return { status: 'out_of_stock', variantId: request.variantId, available }
        }

        await tx
          .insert(inventoryReservations)
          .values({
            cartId,
            variantId: request.variantId,
            quantity: request.quantity,
            expiresAt,
          })
          .onConflictDoUpdate({
            target: [inventoryReservations.cartId, inventoryReservations.variantId],
            set: { quantity: request.quantity, expiresAt },
          })
      }

      return { status: 'reserved', expiresAt }
    })
  },

  // Turns a reservation into a sale: the stock leaves the shelf and the hold
  // disappears in the same transaction, so a crash between the two cannot sell
  // the same unit twice.
  async commitForCart(cartId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const held = await tx
        .select({
          variantId: inventoryReservations.variantId,
          quantity: inventoryReservations.quantity,
        })
        .from(inventoryReservations)
        .where(eq(inventoryReservations.cartId, cartId))

      for (const line of held) {
        await tx
          .update(productVariants)
          .set({
            stockQty: sql`greatest(0, ${productVariants.stockQty} - ${line.quantity})`,
            updatedAt: new Date(),
          })
          .where(eq(productVariants.id, line.variantId))
      }

      await tx.delete(inventoryReservations).where(eq(inventoryReservations.cartId, cartId))
    })
  },

  async releaseForCart(cartId: string): Promise<void> {
    await db.delete(inventoryReservations).where(eq(inventoryReservations.cartId, cartId))
  },

  async deleteExpired(): Promise<number> {
    const removed = await db
      .delete(inventoryReservations)
      .where(lte(inventoryReservations.expiresAt, new Date()))
      .returning({ id: inventoryReservations.id })

    return removed.length
  },

  async findCartLines(cartId: string): Promise<ReservationRequest[]> {
    const rows = await db
      .select({ variantId: cartItems.variantId, quantity: cartItems.quantity })
      .from(cartItems)
      .where(eq(cartItems.cartId, cartId))

    return rows
  },
}
