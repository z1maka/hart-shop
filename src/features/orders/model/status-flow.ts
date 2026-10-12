import { OrderStatus, PaymentRoute } from '@/db/enums'

// Fulfilment moves forward only; money-back states are reachable from any
// paid state, and terminal states accept nothing. A cash-on-delivery order is
// packed and shipped while still unpaid — the carrier collects the money — so
// Pending can move straight to Packed.
const ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.Pending]: [OrderStatus.Paid, OrderStatus.Packed, OrderStatus.Cancelled],
  [OrderStatus.Paid]: [OrderStatus.Packed, OrderStatus.Cancelled, OrderStatus.Refunded],
  [OrderStatus.Packed]: [OrderStatus.Shipped, OrderStatus.Cancelled, OrderStatus.Refunded],
  [OrderStatus.Shipped]: [OrderStatus.Delivered, OrderStatus.Refunded],
  [OrderStatus.Delivered]: [OrderStatus.Refunded],
  [OrderStatus.Cancelled]: [],
  [OrderStatus.Refunded]: [],
}

export function allowedNextStatuses(
  from: OrderStatus,
  route: PaymentRoute,
): readonly OrderStatus[] {
  // A COD order cannot be paid ahead of delivery — the carrier collects the
  // money at handover, so "Paid" is not a choice the admin can make.
  if (route === PaymentRoute.CashOnDelivery) {
    return ALLOWED[from].filter((next) => next !== OrderStatus.Paid)
  }

  return ALLOWED[from]
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED[from].includes(to)
}

// COD money changes hands at the door: reaching Delivered is the payment.
// Every other route records payment only on an explicit move to Paid.
export function recordsPayment(route: PaymentRoute, next: OrderStatus): boolean {
  if (next === OrderStatus.Paid) return true

  return route === PaymentRoute.CashOnDelivery && next === OrderStatus.Delivered
}
