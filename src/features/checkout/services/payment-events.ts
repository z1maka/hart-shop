import { after } from 'next/server'
import { cartService } from '@/features/cart/services/cart-service'
import { PaymentStatus, type PaymentEvent } from '@/features/checkout/model/payment'
import { paymentEventRepository } from '@/features/checkout/repository/payment-event-repository'
import { orderMail } from '@/features/orders/services/order-mail'
import { orderSms } from '@/features/orders/services/order-sms'
import { orderTelegram } from '@/features/orders/services/order-telegram'
import { orderRepository } from '@/features/orders/repository/order-repository'
import { orderService } from '@/features/orders/services/order-service'
import { logger } from '@/lib/logger'

export type PaymentEventOutcome = 'duplicate' | 'cancelled' | 'ignored' | 'already-paid' | 'paid'

// What happens to an order when an acquirer reports a state change — shared by
// every payment webhook route; the routes differ only in how the vendor signs
// and how it wants to be acknowledged.
export async function processPaymentEvent(
  providerId: string,
  event: PaymentEvent,
): Promise<PaymentEventOutcome> {
  // Keyed by reference and status together: an acquirer sends one callback per
  // state change, and each of them deserves to be handled exactly once.
  const eventId = `${event.providerRef}:${event.status}`
  const isFirstDelivery = await paymentEventRepository.claim(eventId, providerId, event.status)

  if (!isFirstDelivery) return 'duplicate'

  try {
    return await applyPaymentEvent(event)
  } catch (error) {
    // A claim that outlives a failed update would turn every later delivery
    // of the same event into a duplicate, and a paid order would wait
    // forever. Released, the acquirer's retry or the buyer's return applies
    // it again.
    await paymentEventRepository.release(eventId)
    throw error
  }
}

async function applyPaymentEvent(event: PaymentEvent): Promise<PaymentEventOutcome> {
  if (event.status === PaymentStatus.Failure || event.status === PaymentStatus.Expired) {
    await orderService.cancel(event.providerRef)
    return 'cancelled'
  }

  if (event.status !== PaymentStatus.Success) return 'ignored'

  const order = await orderService.markPaid(event.providerRef)
  if (!order) return 'already-paid'

  // The card checkout kept the cart until the acquirer confirmed; the order
  // snapshots every line, so the working cart is done for.
  if (order.cartId) await clearPaidCart(order.cartId, order.orderNumber)

  logger.info('Order paid', { orderNumber: order.orderNumber, total: order.totalCents })

  // The acquirer is waiting on this response; the notifications can take
  // their time.
  after(async () => {
    const items = await orderRepository.findItems(order.id)
    const mailInput = { order, items, carrierName: orderService.carrierName(order.carrier) }

    await Promise.all([
      orderMail.sendConfirmation(mailInput),
      orderMail.sendShopNotification(mailInput),
      orderTelegram.sendNewOrder(mailInput),
      orderSms.sendOrderPlaced(mailInput),
    ])
  })

  return 'paid'
}

// The order is paid by now; a cart that fails to empty must not undo that by
// failing the event — a retry would find the order paid and send nothing.
async function clearPaidCart(cartId: string, orderNumber: string): Promise<void> {
  try {
    await cartService.clearCart(cartId)
  } catch (error) {
    logger.error('Paid order left its cart behind', {
      orderNumber,
      reason: error instanceof Error ? error.message : String(error),
    })
  }
}
