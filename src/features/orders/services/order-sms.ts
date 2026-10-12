import {
  orderPlacedSmsText,
  orderShippedSmsText,
} from '@/features/orders/model/notification-format'
import { toUkrainianMsisdn } from '@/features/orders/model/phone'
import { isQuickOrder } from '@/features/orders/model/quick-order'
import type { OrderRow } from '@/features/orders/repository/order-repository'
import type { OrderMailInput } from '@/features/orders/services/order-mail'
import { NotificationKind } from '@/db/enums'
import {
  deliverNotification,
  skipNotification,
} from '@/features/orders/services/notification-log'
import { env } from '@/lib/env'
import { isSmsConfigured, sendSms } from '@/lib/turbosms'

// Two SMS and no more — the budget's rule (owner, 26.09.2026): one the
// moment the order is accepted, with the tracking link, and one when the
// parcel is on its way, with the waybill number. Everything else goes by
// mail. Every Cyrillic segment (67 chars) is billed, so the texts stay
// short. A notifier never throws: every attempt ends in the order's
// notification log instead.
export const orderSms = {
  // null: nothing to send to (no Ukrainian number, or SMS not set up);
  // boolean: whether the SMS went out.
  async sendOrderPlaced(input: OrderMailInput): Promise<boolean | null> {
    const { order } = input
    const msisdn = await recipientOf(order, NotificationKind.OrderPlacedSms)
    if (!msisdn) return null

    const trackingUrl = `${env.NEXT_PUBLIC_SITE_URL}/order/${order.accessToken}/`
    const text = orderPlacedSmsText(
      order.orderNumber,
      trackingUrl,
      isQuickOrder(order.pickupPointRef),
    )

    return deliverNotification(order.id, NotificationKind.OrderPlacedSms, () =>
      sendSms(msisdn, text),
    )
  },

  async sendOrderShipped(order: OrderRow): Promise<boolean | null> {
    const msisdn = await recipientOf(order, NotificationKind.ShippedSms)
    if (!msisdn) return null

    return deliverNotification(order.id, NotificationKind.ShippedSms, () =>
      sendSms(msisdn, orderShippedSmsText(order.orderNumber, order.carrier, order.trackingNumber)),
    )
  },
}

// The number to text, or null with the reason written under the order.
async function recipientOf(order: OrderRow, kind: NotificationKind): Promise<string | null> {
  if (!isSmsConfigured()) return skipNotification(order.id, kind, 'SMS не настроена')

  const rawPhone = order.shippingAddress.phone
  if (!rawPhone) return skipNotification(order.id, kind, 'нет телефона')

  const msisdn = toUkrainianMsisdn(rawPhone)
  if (!msisdn) return skipNotification(order.id, kind, 'номер не украинский')

  return msisdn
}
