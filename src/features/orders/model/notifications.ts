import { NotificationChannel, NotificationKind } from '@/db/enums'

const CHANNEL_OF_KIND: Record<NotificationKind, NotificationChannel> = {
  [NotificationKind.OrderPlacedMail]: NotificationChannel.Mail,
  [NotificationKind.OrderPlacedShopMail]: NotificationChannel.Mail,
  [NotificationKind.OrderPlacedTelegram]: NotificationChannel.Telegram,
  [NotificationKind.OrderPlacedSms]: NotificationChannel.Sms,
  [NotificationKind.ShippedMail]: NotificationChannel.Mail,
  [NotificationKind.ShippedSms]: NotificationChannel.Sms,
  [NotificationKind.WaybillTelegram]: NotificationChannel.Telegram,
  [NotificationKind.WaybillLabelTelegram]: NotificationChannel.Telegram,
  [NotificationKind.RefusalTelegram]: NotificationChannel.Telegram,
  [NotificationKind.QuickOrderReminderTelegram]: NotificationChannel.Telegram,
  [NotificationKind.ReviewRequestMail]: NotificationChannel.Mail,
}

export function channelOf(kind: NotificationKind): NotificationChannel {
  return CHANNEL_OF_KIND[kind]
}
