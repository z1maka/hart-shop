import { and, eq, sql } from 'drizzle-orm'
import type { BankAccountDraft } from '@/config/requisites'
import {
  Carrier,
  ContactPreference,
  PaymentRoute,
  SalesChannel,
  type DeliveryKind,
} from '@/db/enums'
import { orders, productVariants, resellers, type ShippingAddress } from '@/db/schema'
import { partnerUnitPriceCents } from '@/features/orders/model/dropship-order'
import { linesSubtotalCents } from '@/features/orders/model/order-edit'
import {
  heldInCarts,
  insertOrderLine,
  lockVariants,
  type LockedVariant,
  type Transaction,
} from '@/features/orders/repository/order-lines-tx'
import { db } from '@/lib/db'
import {
  DropPriceMissingError,
  OutOfStockError,
  ResellerNotFoundError,
  VariantNotFoundError,
} from '@/lib/errors'

// One line as the admin asked for it; a null price takes the card's.
export type PartnerLineRequest = {
  readonly variantId: string
  readonly quantity: number
  readonly agreedPriceCents: number | null
}

export type DropshipOrderDraft = {
  readonly orderNumber: string
  readonly accessToken: string
  readonly resellerId: string
  readonly resellerOrderRef: string | null
  readonly bankRequisites: BankAccountDraft
  readonly shippingAddress: ShippingAddress
  readonly deliveryKind: DeliveryKind
  readonly pickupPoint: { readonly ref: string; readonly label: string } | null
  readonly lines: readonly PartnerLineRequest[]
}

export type PlacedDropshipOrder = {
  readonly id: string
  readonly orderNumber: string
  readonly totalCents: number
}

type PricedLine = PartnerLineRequest & { readonly unitPriceCents: number }

// Delivery is billed by the carrier to the recipient, as on the site.
const SHIPPING_CENTS = 0

export const dropshipOrderRepository = {
  // The order, its lines and the stock leave together, under the variants'
  // row locks: a site checkout in the same second cannot sell the last unit
  // twice.
  async create(draft: DropshipOrderDraft): Promise<PlacedDropshipOrder> {
    return db.transaction(async (tx) => {
      await requireActiveReseller(tx, draft.resellerId)
      const variants = await lockVariants(
        tx,
        draft.lines.map((line) => line.variantId),
      )
      const priced = draft.lines.map((line) => pricedLine(line, variants))
      await takeStock(tx, priced, variants)

      const subtotalCents = linesSubtotalCents(priced)
      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber: draft.orderNumber,
          accessToken: draft.accessToken,
          channel: SalesChannel.Dropship,
          resellerId: draft.resellerId,
          resellerOrderRef: draft.resellerOrderRef,
          // The partner's customer is not the shop's: no mail, no call.
          email: null,
          contactPreference: ContactPreference.NoCall,
          paymentRoute: PaymentRoute.BankTransfer,
          bankRequisites: draft.bankRequisites,
          subtotalCents,
          shippingCents: SHIPPING_CENTS,
          totalCents: subtotalCents + SHIPPING_CENTS,
          shippingAddress: draft.shippingAddress,
          deliveryKind: draft.deliveryKind,
          pickupPointRef: draft.pickupPoint?.ref ?? null,
          pickupPointLabel: draft.pickupPoint?.label ?? null,
          carrier: Carrier.NovaPost,
          trafficSource: null,
          googleClickId: null,
        })
        .returning({
          id: orders.id,
          orderNumber: orders.orderNumber,
          totalCents: orders.totalCents,
        })
      if (!order) throw new Error('Partner order could not be created')

      for (const line of priced) {
        const variant = variants.get(line.variantId)
        if (!variant) throw new VariantNotFoundError(line.variantId)
        await insertOrderLine(tx, order.id, line, variant)
      }

      return order
    })
  },
}

async function requireActiveReseller(tx: Transaction, resellerId: string): Promise<void> {
  const [reseller] = await tx
    .select({ id: resellers.id })
    .from(resellers)
    .where(and(eq(resellers.id, resellerId), eq(resellers.isActive, true)))
    .limit(1)
  if (!reseller) throw new ResellerNotFoundError(resellerId)
}

// Only a variant on sale on the site goes to a partner, and only at a price:
// the card's drop price or one the admin agreed.
function pricedLine(line: PartnerLineRequest, variants: Map<string, LockedVariant>): PricedLine {
  const variant = variants.get(line.variantId)
  if (!variant?.isOnSale) throw new VariantNotFoundError(line.variantId)

  const unitPriceCents = partnerUnitPriceCents(variant, line.agreedPriceCents)
  if (unitPriceCents === null) throw new DropPriceMissingError(variant.productId)

  return { ...line, unitPriceCents }
}

// The units leave the shelf now: the sale happened outside the site, so no
// cart ever held them.
async function takeStock(
  tx: Transaction,
  lines: readonly PricedLine[],
  variants: Map<string, LockedVariant>,
): Promise<void> {
  for (const line of lines) {
    const variant = variants.get(line.variantId)
    if (!variant) throw new VariantNotFoundError(line.variantId)

    const available = variant.stockQty - (await heldInCarts(tx, line.variantId))
    if (line.quantity > available) {
      throw new OutOfStockError(line.variantId, line.quantity, Math.max(0, available))
    }

    await tx
      .update(productVariants)
      .set({ stockQty: sql`${productVariants.stockQty} - ${line.quantity}`, updatedAt: new Date() })
      .where(eq(productVariants.id, line.variantId))
  }
}
