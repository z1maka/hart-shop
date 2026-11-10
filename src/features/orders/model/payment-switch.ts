import { OrderStatus, PaymentRoute, SalesChannel } from '@/db/enums'
import { orderEditBlockOf, type EditableOrder } from '@/features/orders/model/order-edit'

// A buyer who chose cash on delivery may pay the ФОП by transfer instead, or
// the other way round (owner, 10.11.2026). Only while nothing has moved: no
// money taken, no waybill carrying the sum to collect, the order still open.
// A card payment belongs to the acquirer and a partner always pays by
// invoice, so neither switches.

export const PaymentSwitchBlock = {
  Closed: 'closed',
  Waybill: 'waybill',
  Card: 'card',
  Paid: 'paid',
  Partner: 'partner',
} as const
export type PaymentSwitchBlock = (typeof PaymentSwitchBlock)[keyof typeof PaymentSwitchBlock]

export type SwitchableOrder = EditableOrder & { readonly channel: string }

export function paymentSwitchBlockOf(order: SwitchableOrder): PaymentSwitchBlock | null {
  if (order.channel === SalesChannel.Dropship) return PaymentSwitchBlock.Partner
  return orderEditBlockOf(order)
}

// The route a switchable order can move to: the other of the two offline ones.
export function paymentSwitchTargetOf(route: string): PaymentRoute | null {
  if (route === PaymentRoute.CashOnDelivery) return PaymentRoute.BankTransfer
  if (route === PaymentRoute.BankTransfer) return PaymentRoute.CashOnDelivery
  return null
}

// A transfer waits for the money: a cash-on-delivery order the morning round
// already packed goes back to awaiting payment. Every other status stands.
export function statusAfterSwitch(status: OrderStatus, to: PaymentRoute): OrderStatus {
  return to === PaymentRoute.BankTransfer && status === OrderStatus.Packed
    ? OrderStatus.Pending
    : status
}
