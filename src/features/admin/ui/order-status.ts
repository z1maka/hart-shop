import { OrderStatus, PaymentRoute } from '@/db/enums'
import { DayMark, OrderGroup } from '@/features/orders/model/order-groups'
import { OrderStatusFilter, statusMatchOf } from '@/features/orders/model/status-filter'
import type { ParcelStage } from '@/features/shipping'

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: 'Ожидает оплаты',
  [OrderStatus.Paid]: 'Оплачен',
  [OrderStatus.Packed]: 'Упакован',
  [OrderStatus.Shipped]: 'Отправлен',
  [OrderStatus.Delivered]: 'Доставлен',
  [OrderStatus.Cancelled]: 'Отменён',
  [OrderStatus.Refunded]: 'Возврат',
}

const STATUS_CLASSES: Record<OrderStatus, string> = {
  [OrderStatus.Pending]: 'bg-alert-soft text-alert',
  [OrderStatus.Paid]: 'bg-accent-soft text-accent-hover',
  [OrderStatus.Packed]: 'bg-accent-soft text-accent-hover',
  [OrderStatus.Shipped]: 'bg-accent-soft text-accent-hover',
  [OrderStatus.Delivered]: 'bg-sunken text-muted',
  [OrderStatus.Cancelled]: 'bg-sunken text-muted',
  [OrderStatus.Refunded]: 'bg-sunken text-muted',
}

export const PAYMENT_ROUTE_LABELS: Record<PaymentRoute, string> = {
  [PaymentRoute.CashOnDelivery]: 'Наложенный платёж',
  [PaymentRoute.Card]: 'Картой онлайн',
  [PaymentRoute.BankTransfer]: 'По счёту',
}

// A fresh COD order is not waiting for money — the carrier collects it at
// handover — so "awaiting payment" would send the admin looking for a payment
// that never comes. It is simply new work to pack.
export function orderStatusLabel(status: OrderStatus, route: PaymentRoute): string {
  if (status === OrderStatus.Pending && route === PaymentRoute.CashOnDelivery) {
    return 'Новый'
  }

  return STATUS_LABELS[status]
}

// The header filter names each option the way the chips in the rows do.
export function statusFilterLabel(filter: OrderStatusFilter): string {
  if (filter === OrderStatusFilter.New) {
    return orderStatusLabel(OrderStatus.Pending, PaymentRoute.CashOnDelivery)
  }

  return STATUS_LABELS[statusMatchOf(filter).status]
}

export function orderStatusClass(status: OrderStatus, route: PaymentRoute): string {
  if (status === OrderStatus.Pending && route === PaymentRoute.CashOnDelivery) {
    return 'bg-accent-soft text-accent-hover'
  }

  return STATUS_CLASSES[status]
}

// Where the parcel is, as the hourly tracking last saw it. Keys are spelled
// out rather than imported: this file also reaches client components, and
// the shipping barrel is server code.
const PARCEL_STAGE_LABELS: Record<ParcelStage, string> = {
  created: 'ТТН создана, ждёт отправки',
  in_transit: 'В пути',
  arrived: 'Прибыл, ждёт получателя',
  received: 'Получен',
  refused: 'Отказ — едет назад',
  missing: 'ТТН не найдена в Новой Почте',
  unknown: 'Статус Новой Почты не распознан',
}

const PARCEL_ALERT_STAGES: ReadonlySet<ParcelStage> = new Set(['refused', 'missing'])

export function parcelStageLabel(stage: ParcelStage): string {
  return PARCEL_STAGE_LABELS[stage]
}

export function isParcelAlert(stage: ParcelStage): boolean {
  return PARCEL_ALERT_STAGES.has(stage)
}

// The three shelves inside «Активные», in the admin's words.
const ORDER_GROUP_LABELS: Record<OrderGroup, string> = {
  [OrderGroup.NeedsWaybill]: 'Нужна ТТН',
  [OrderGroup.AwaitingHandover]: 'ТТН создана, ждут отправки',
  [OrderGroup.InTransit]: 'В дороге',
}

export function orderGroupLabel(group: OrderGroup): string {
  return ORDER_GROUP_LABELS[group]
}

// A divider names the day; a date it cannot name relative to now shows
// the row's own date instead.
const DAY_MARK_LABELS: Record<DayMark, string | null> = {
  [DayMark.Today]: 'Сегодня',
  [DayMark.Yesterday]: 'Вчера',
  [DayMark.Other]: null,
}

export function dayMarkLabel(mark: DayMark, fallback: string): string {
  return DAY_MARK_LABELS[mark] ?? fallback
}
