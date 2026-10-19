import { randomBytes } from 'node:crypto'
import type { BankAccountDraft } from '@/config/requisites'
import { CARRIER_NAMES } from '@/config/delivery'
import { DEFAULT_LOCALE } from '@/config/locales'
import {
  OrderStatus,
  type Carrier,
  type ContactPreference,
  type DeliveryKind,
  type PaymentRoute,
} from '@/db/enums'
import { cartRepository } from '@/features/cart/repository/cart-repository'
import { inventoryService } from '@/features/inventory'
import { formatOrderNumber } from '@/features/orders/model/order-number'
import {
  orderRepository,
  type OrderDraft,
  type OrderRow,
  type OrderTraffic,
  type ShippingAddress,
} from '@/features/orders/repository/order-repository'
import { OrderNotFoundError } from '@/lib/errors'
import { logger } from '@/lib/logger'

const ACCESS_TOKEN_BYTES = 24

export type OrderDraftInput = {
  readonly cartId: string
  readonly email: string | null
  readonly paymentRoute: PaymentRoute
  readonly carrier: Carrier
  readonly shippingCents: number
  readonly address: Omit<ShippingAddress, 'country'>
  readonly deliveryKind: DeliveryKind
  readonly pickupPoint: { readonly ref: string; readonly label: string } | null
  readonly customerNote: string | null
  readonly contactPreference: ContactPreference
  // The account a transfer order is told to pay to, fixed at checkout.
  readonly bankRequisites: BankAccountDraft | null
  // The channel the shopper came from; null when unknown.
  readonly traffic: OrderTraffic | null
}

const COUNTRY = 'UA'

export const orderService = {
  // The order exists before the money does: a shopper who pays and then closes
  // the tab still has a record, and the webhook only has to flip its status.
  async createPendingOrder(input: OrderDraftInput): Promise<OrderRow> {
    const items = await cartRepository.findItems(input.cartId)
    if (items.length === 0) throw new Error(`Cart ${input.cartId} is empty`)

    const subtotalCents = items.reduce(
      (total, item) => total + item.unitPriceCents * item.quantity,
      0,
    )

    const draft: OrderDraft = {
      cartId: input.cartId,
      orderNumber: formatOrderNumber(
        new Date().getUTCFullYear(),
        await orderRepository.nextOrderSequence(),
      ),
      accessToken: randomBytes(ACCESS_TOKEN_BYTES).toString('base64url'),
      email: input.email,
      locale: DEFAULT_LOCALE,
      paymentRoute: input.paymentRoute,
      subtotalCents,
      shippingCents: input.shippingCents,
      totalCents: subtotalCents + input.shippingCents,
      shippingAddress: { ...input.address, country: COUNTRY },
      deliveryKind: input.deliveryKind,
      pickupPointRef: input.pickupPoint?.ref ?? null,
      pickupPointLabel: input.pickupPoint?.label ?? null,
      customerNote: input.customerNote,
      contactPreference: input.contactPreference,
      country: COUNTRY,
      carrier: input.carrier,
      bankRequisites: input.bankRequisites,
      traffic: input.traffic,
      items: items.map((item) => ({
        variantId: item.variantId,
        sku: item.sku,
        productSlug: item.productSlug,
        productTitle: item.productTitle,
        variantLabel: item.variantLabel,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        weightGrams: item.weightGrams,
        imageStorageKey: item.imageStorageKey,
      })),
    }

    return orderRepository.createPending(draft)
  },

  // A checkout the acquirer refused leaves an order nobody can pay: it is
  // cancelled rather than deleted, so the number stays spent and the attempt
  // stays visible.
  async abandon(orderNumber: string): Promise<void> {
    await orderRepository.markCancelledByNumber(orderNumber)
  },

  async attachPayment(orderId: string, provider: string, paymentRef: string): Promise<void> {
    await orderRepository.attachPaymentRef(orderId, provider, paymentRef)
  },

  // Idempotent by construction: markPaid only moves an order not paid yet, so
  // a webhook delivered twice does the work once and reports success both times.
  async markPaid(paymentRef: string): Promise<OrderRow | null> {
    const order = await orderRepository.findByPaymentRef(paymentRef)
    if (!order) throw new OrderNotFoundError(paymentRef)

    const moved = await orderRepository.markPaid(order.id)
    if (!moved) {
      logger.info('Payment webhook repeated for an order already handled', {
        orderNumber: order.orderNumber,
        status: order.status,
      })
      return null
    }

    if (order.status === OrderStatus.Cancelled) {
      logger.warn('Payment arrived for a cancelled order; it is paid again', {
        orderNumber: order.orderNumber,
      })
    }

    if (order.cartId) await inventoryService.commitCart(order.cartId)

    return { ...order, status: OrderStatus.Paid, paidAt: new Date() }
  },

  async cancel(paymentRef: string): Promise<void> {
    const order = await orderRepository.findByPaymentRef(paymentRef)
    if (!order) return

    await orderRepository.markCancelled(order.id)
  },

  carrierName(carrier: Carrier | null): string {
    return carrier ? CARRIER_NAMES[carrier] : 'Нова Пошта'
  },
}
