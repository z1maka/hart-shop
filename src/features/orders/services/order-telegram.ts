import {
  escapeHtml,
  itemLines,
  money,
  parcelRefusedTelegramText,
  PAYMENT_ROUTE_RU,
  quickOrderReminderTelegramText,
  waybillIssuedTelegramText,
  waybillLabelCaption,
  type ParcelRefusalNotice,
  type QuickOrderReminderNotice,
  type WaybillNotice,
} from '@/features/orders/model/notification-format'
import type { OrderMailInput } from '@/features/orders/services/order-mail'
import { NotificationKind } from '@/db/enums'
import { deliverNotification, skipNotification } from '@/features/orders/services/notification-log'
import { env } from '@/lib/env'
import { isTelegramConfigured, sendTelegramDocument, sendTelegramMessage } from '@/lib/telegram'

const NOT_CONFIGURED = 'Telegram не настроен'

// Pushes the order into the shop's Telegram chats — the channel the team
// watched on the WordPress site. A notifier never throws: losing a Telegram
// message must not cost the shopper their order, so every attempt ends in
// the order's notification log instead.
export const orderTelegram = {
  async sendNewOrder(input: OrderMailInput): Promise<boolean | null> {
    const { order } = input
    if (!isTelegramConfigured(env.TELEGRAM_CHAT_ID)) {
      return skipNotification(order.id, NotificationKind.OrderPlacedTelegram, NOT_CONFIGURED)
    }

    const address = order.shippingAddress
    const lines = [
      `<b>Новый заказ ${escapeHtml(order.orderNumber)} — ${money(order.totalCents)}</b>`,
      '',
      `Покупатель: ${escapeHtml(address.fullName)}`,
      ...(address.phone ? [`Телефон: ${escapeHtml(address.phone)}`] : []),
      ...(order.email ? [`Email: ${escapeHtml(order.email)}`] : []),
      `Доставка: ${escapeHtml([address.line1, address.city].filter(Boolean).join(', '))}`,
      `Перевозчик: ${escapeHtml(input.carrierName)}`,
      `Оплата: ${PAYMENT_ROUTE_RU[order.paymentRoute]}`,
      ...(order.customerNote ? ['', `Комментарий: ${escapeHtml(order.customerNote)}`] : []),
      '',
      'Товары:',
      ...itemLines(input.items).map((line) => `• ${escapeHtml(line)}`),
    ]

    return deliverNotification(order.id, NotificationKind.OrderPlacedTelegram, () =>
      sendTelegramMessage(lines.join('\n'), env.TELEGRAM_CHAT_ID),
    )
  },

  async sendWaybillIssued(notice: WaybillNotice): Promise<boolean | null> {
    if (!isTelegramConfigured(env.TELEGRAM_WAYBILL_CHAT_ID)) {
      return skipNotification(notice.orderId, NotificationKind.WaybillTelegram, NOT_CONFIGURED)
    }

    return deliverNotification(notice.orderId, NotificationKind.WaybillTelegram, () =>
      sendTelegramMessage(waybillIssuedTelegramText(notice), env.TELEGRAM_WAYBILL_CHAT_ID),
    )
  },

  async sendQuickOrderReminder(notice: QuickOrderReminderNotice): Promise<boolean | null> {
    if (!isTelegramConfigured(env.TELEGRAM_CHAT_ID)) {
      return skipNotification(notice.orderId, NotificationKind.QuickOrderReminderTelegram, NOT_CONFIGURED)
    }

    return deliverNotification(notice.orderId, NotificationKind.QuickOrderReminderTelegram, () =>
      sendTelegramMessage(quickOrderReminderTelegramText(notice), env.TELEGRAM_CHAT_ID),
    )
  },

  async sendParcelRefused(notice: ParcelRefusalNotice): Promise<boolean | null> {
    if (!isTelegramConfigured(env.TELEGRAM_CHAT_ID)) {
      return skipNotification(notice.orderId, NotificationKind.RefusalTelegram, NOT_CONFIGURED)
    }

    return deliverNotification(notice.orderId, NotificationKind.RefusalTelegram, () =>
      sendTelegramMessage(parcelRefusedTelegramText(notice), env.TELEGRAM_CHAT_ID),
    )
  },

  // The label follows its card, so the packer prints it from the chat.
  async sendWaybillLabel(label: {
    readonly orderId: string
    readonly orderNumber: string
    readonly waybillNumber: string
    readonly pdf: ArrayBuffer
  }): Promise<boolean | null> {
    if (!isTelegramConfigured(env.TELEGRAM_WAYBILL_CHAT_ID)) {
      return skipNotification(label.orderId, NotificationKind.WaybillLabelTelegram, NOT_CONFIGURED)
    }

    return deliverNotification(label.orderId, NotificationKind.WaybillLabelTelegram, () =>
      sendTelegramDocument({
        chatId: env.TELEGRAM_WAYBILL_CHAT_ID,
        fileName: `ttn-${label.waybillNumber}.pdf`,
        contentType: 'application/pdf',
        bytes: label.pdf,
        caption: waybillLabelCaption(label.waybillNumber, label.orderNumber),
      }),
    )
  },
}
