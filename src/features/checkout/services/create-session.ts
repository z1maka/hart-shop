import { PaymentRoute, type Carrier, type DeliveryKind } from '@/db/enums'
import type { BankAccountDraft } from '@/config/requisites'
import { bankAccountService, requisitesSnapshot } from '@/features/billing'
import { cartService } from '@/features/cart/services/cart-service'
import { paymentReturnPath } from '@/features/checkout/model/payment-return'
import {
  activePaymentProvider,
  paymentProviderById,
} from '@/features/checkout/services/payment-provider'
import { inventoryService } from '@/features/inventory'
import { orderMail } from '@/features/orders/services/order-mail'
import { orderSms } from '@/features/orders/services/order-sms'
import { orderTelegram } from '@/features/orders/services/order-telegram'
import { orderRepository, type OrderTraffic } from '@/features/orders/repository/order-repository'
import { orderService } from '@/features/orders/services/order-service'
import type { ShippingAddressInput } from '@/features/checkout/schema/checkout-schema'
import {
  AppError,
  CartNotFoundError,
  PaymentFailedError,
  PaymentRouteUnavailableError,
} from '@/lib/errors'
import { addMoney, createMoney, Currency } from '@/lib/money'
import { publicUrl } from '@/lib/storage'
import { logger } from '@/lib/logger'

export type CheckoutSession = {
  readonly redirectUrl: string
}

export type PlaceOrderInput = {
  readonly cartId: string
  readonly email: string | null
  readonly carrier: Carrier
  readonly deliveryKind: DeliveryKind
  readonly paymentRoute: PaymentRoute
  // Null when the buyer expressed no preference, or the route is not a card.
  readonly cardProvider: string | null
  readonly address: ShippingAddressInput
  readonly pickupPoint?: { readonly ref: string; readonly label: string }
  // Where the acquirer returns the buyer and sends its webhook: the host this
  // checkout ran on, so a deployment always hears about its own payments.
  readonly callbackOrigin: string
  // The channel the shopper came from; null when unknown.
  readonly traffic: OrderTraffic | null
}

// Delivery is billed by the carrier on receipt, so the order itself carries no
// shipping charge (docs/COMMERCE.md §3).
const SHIPPING_CENTS = 0

export const checkoutService = {
  async placeOrder(input: PlaceOrderInput): Promise<CheckoutSession> {
    const summary = await cartService.getSummary(input.cartId)

    if (!summary || summary.items.length === 0) {
      throw new CartNotFoundError(input.cartId)
    }
    const bankRequisites = await transferAccountFor(input.paymentRoute)

    await inventoryService.reserveCart(input.cartId)

    let orderNumber: string | null = null

    try {
      const order = await orderService.createPendingOrder({
        cartId: input.cartId,
        email: input.email,
        paymentRoute: input.paymentRoute,
        carrier: input.carrier,
        shippingCents: SHIPPING_CENTS,
        address: input.address,
        deliveryKind: input.deliveryKind,
        pickupPoint: input.pickupPoint ?? null,
        bankRequisites,
        traffic: input.traffic,
      })
      orderNumber = order.orderNumber

      // An offline route has no acquirer to wait for: the order is placed, the
      // stock is committed, and the shopper lands on their order page.
      if (input.paymentRoute !== PaymentRoute.Card) {
        await inventoryService.commitCart(input.cartId)
        // The order snapshots every line, so the working cart is done for.
        await cartService.clearCart(input.cartId)
        await notifyOrderPlaced(order)
        return { redirectUrl: `/order/${order.accessToken}/` }
      }

      // Every amount is recomputed from the cart snapshot in our database; the
      // browser only ever names a variant and a payment route.
      const total = addMoney(
        summary.totals.subtotal,
        createMoney(SHIPPING_CENTS, summary.totals.subtotal.currency),
      )

      const provider = paymentProviderById(input.cardProvider)
      const session = await provider.createPayment({
        reference: order.orderNumber,
        amount: total,
        customerEmail: input.email,
        returnUrl: `${input.callbackOrigin}${paymentReturnPath(order.accessToken)}`,
        webhookUrl: `${input.callbackOrigin}${provider.webhookPath}`,
        lines: summary.items.map((item) => ({
          name: [item.productTitle, item.variantLabel]
            .filter((part) => part.trim() !== '')
            .join(' — '),
          code: item.sku,
          quantity: item.quantity,
          unitPrice: createMoney(item.unitPriceCents, Currency.Uah),
          imageUrl: item.imageStorageKey ? publicUrl(item.imageStorageKey) : null,
        })),
      })

      await orderService.attachPayment(order.id, provider.id, session.providerRef)

      return { redirectUrl: session.redirectUrl }
    } catch (error) {
      // Stock must not stay locked for half an hour because the acquirer was
      // down, and an order nobody can pay for must not sit in the list looking
      // like business.
      await inventoryService.releaseCart(input.cartId)
      if (orderNumber) await orderService.abandon(orderNumber)

      // The acquirer refusing us is our problem, not the shopper's: it reaches
      // the logs as itself and the checkout as something a person can act on.
      if (error instanceof AppError) throw error

      logger.error('Placing the order failed', {
        provider: activePaymentProvider().id,
        orderNumber,
        reason: error instanceof Error ? error.message : String(error),
      })

      throw new PaymentFailedError('The order could not be placed right now')
    }
  },
}

// A transfer order keeps the account it was told to pay to, so switching the
// active account later changes nothing for it. The route is offered only
// while an account exists; a checkout opened before the owner removed the
// last one must not place an order nobody can pay.
async function transferAccountFor(route: PaymentRoute): Promise<BankAccountDraft | null> {
  if (route !== PaymentRoute.BankTransfer) return null

  const account = await bankAccountService.active()
  if (!account) throw new PaymentRouteUnavailableError(route)

  return requisitesSnapshot(account)
}

// A card order is confirmed by the payment webhook; an offline order is
// confirmed here, and a mail outage must not cost the shopper their order.
async function notifyOrderPlaced(
  order: Awaited<ReturnType<typeof orderService.createPendingOrder>>,
) {
  try {
    const items = await orderRepository.findItems(order.id)
    const mailInput = { order, items, carrierName: orderService.carrierName(order.carrier) }

    await Promise.all([
      orderMail.sendConfirmation(mailInput),
      orderMail.sendShopNotification(mailInput),
      orderTelegram.sendNewOrder(mailInput),
      orderSms.sendOrderPlaced(mailInput),
    ])
  } catch (error) {
    logger.error('Order confirmation mail failed', {
      orderNumber: order.orderNumber,
      reason: error instanceof Error ? error.message : String(error),
    })
  }
}
