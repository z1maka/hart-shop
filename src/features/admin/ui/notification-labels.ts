import { NotificationKind, NotificationStatus } from '@/db/enums'

// The order page's log of what the shop sent, in the admin's language.
export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  [NotificationKind.OrderPlacedMail]: 'Письмо покупателю о заказе',
  [NotificationKind.OrderPlacedShopMail]: 'Письмо магазину о заказе',
  [NotificationKind.OrderPlacedTelegram]: 'Telegram: новый заказ',
  [NotificationKind.OrderPlacedSms]: 'SMS о заказе',
  [NotificationKind.ShippedMail]: 'Письмо об отправке',
  [NotificationKind.ShippedSms]: 'SMS об отправке с ТТН',
  [NotificationKind.WaybillTelegram]: 'Telegram: карточка ТТН в чат сборки',
  [NotificationKind.WaybillLabelTelegram]: 'Telegram: этикетка ТТН',
  [NotificationKind.RefusalTelegram]: 'Telegram: отказ от посылки',
  [NotificationKind.QuickOrderReminderTelegram]: 'Telegram: напоминание о заявке',
  [NotificationKind.ReviewRequestMail]: 'Письмо с просьбой об отзыве',
}

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  [NotificationStatus.Sent]: 'ушло',
  [NotificationStatus.Failed]: 'не ушло',
  [NotificationStatus.Skipped]: 'пропущено',
}
