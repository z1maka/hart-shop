import {
  returnOutcomeOf,
  returnPagePath,
  ReturnOutcome,
} from '@/features/checkout/model/payment-return'
import { PaymentStatus } from '@/features/checkout/model/payment'
import { processPaymentEvent } from '@/features/checkout/services/payment-events'
import { paymentProviderById } from '@/features/checkout/services/payment-provider'
import { orderRepository, type OrderRow } from '@/features/orders'
import { logger } from '@/lib/logger'
import { createMoney, Currency, formatMoney } from '@/lib/money'

export type PaymentReturnView = {
  readonly outcome: ReturnOutcome
  readonly order: {
    readonly number: string
    readonly totalLabel: string
    // Which acquirer took the payment: the buyer recognises it from the page
    // they have just left.
    readonly providerId: string | null
  } | null
}

export type ReturnDestination = {
  readonly path: string
  // The buyer's cart is finished only when the money is confirmed; anything
  // short of it keeps the cart for another attempt.
  readonly isPaid: boolean
}

export const paymentReturnService = {
  async describe(accessToken: string): Promise<PaymentReturnView> {
    const order = await orderRepository.findByAccessToken(accessToken)
    if (!order) return { outcome: ReturnOutcome.Unknown, order: null }

    // An order that never went to an acquirer (cash on delivery, transfer)
    // has no payment to report: the page says so without naming the order.
    const outcome = await outcomeOf(order)
    if (outcome === ReturnOutcome.Unknown) return { outcome, order: null }

    return {
      outcome,
      order: {
        number: order.orderNumber,
        totalLabel: formatMoney(createMoney(order.totalCents, Currency.Uah)),
        providerId: order.paymentProvider,
      },
    }
  },

  // What the waiting page polls: the outcome alone, one acquirer call, no
  // settling — a paid outcome sends the buyer through the return route,
  // which settles the order and ends the cart.
  async check(accessToken: string): Promise<ReturnOutcome> {
    const order = await orderRepository.findByAccessToken(accessToken)
    return order ? outcomeOf(order) : ReturnOutcome.Unknown
  },

  // The buyer usually arrives before the webhook does, so a confirmed payment
  // is applied right here — the webhook then finds its event already claimed —
  // and they land on their order instead of a page telling them to wait.
  async complete(accessToken: string, attempt: number): Promise<ReturnDestination> {
    const fallback = { path: returnPagePath(accessToken, attempt), isPaid: false }

    try {
      const order = await orderRepository.findByAccessToken(accessToken)
      if (!order) return fallback
      if ((await outcomeOf(order)) !== ReturnOutcome.Paid) return fallback

      await settle(order)
      return { path: `/order/${order.accessToken}/`, isPaid: true }
    } catch (error) {
      logger.error('Payment return could not be resolved', {
        reason: error instanceof Error ? error.message : String(error),
      })
      return fallback
    }
  },
}

async function outcomeOf(order: OrderRow): Promise<ReturnOutcome> {
  if (order.paidAt) return ReturnOutcome.Paid
  if (!order.paymentRef) return ReturnOutcome.Unknown

  try {
    const status = await paymentProviderById(order.paymentProvider).getStatus(order.paymentRef)
    return returnOutcomeOf(status)
  } catch (error) {
    // The acquirer not answering says nothing about the money: the buyer is
    // told the payment is being confirmed and the page asks again.
    logger.warn('Payment status check failed', {
      orderNumber: order.orderNumber,
      reason: error instanceof Error ? error.message : String(error),
    })
    return ReturnOutcome.Processing
  }
}

async function settle(order: OrderRow): Promise<void> {
  if (order.paidAt || !order.paymentRef) return

  await processPaymentEvent(paymentProviderById(order.paymentProvider).id, {
    providerRef: order.paymentRef,
    reference: order.orderNumber,
    status: PaymentStatus.Success,
    amount: null,
  })
}
