export const ProductStatus = {
  Draft: 'draft',
  Published: 'published',
  Archived: 'archived',
} as const

export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus]

export const OrderStatus = {
  Pending: 'pending',
  Paid: 'paid',
  Packed: 'packed',
  Shipped: 'shipped',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
  Refunded: 'refunded',
} as const

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

// How the buyer pays. Cash on delivery is the default of the Ukrainian home
// market: the order is created unpaid and the carrier collects the money. A
// card goes through the acquirer; a transfer is paid against our requisites.
export const PaymentRoute = {
  CashOnDelivery: 'cod',
  Card: 'card',
  BankTransfer: 'bank_transfer',
} as const

export type PaymentRoute = (typeof PaymentRoute)[keyof typeof PaymentRoute]

// How the parcel reaches the buyer: to the door, or to a point the buyer walks to.
export const DeliveryKind = {
  Courier: 'courier',
  Branch: 'branch',
  Locker: 'locker',
} as const

export type DeliveryKind = (typeof DeliveryKind)[keyof typeof DeliveryKind]

// Domestic delivery only; a new carrier is a new pickup-directory
// implementation in shipping/services, never a rewrite (AGENTS.md §9).
export const Carrier = {
  NovaPost: 'nova_post',
} as const

export type Carrier = (typeof Carrier)[keyof typeof Carrier]

// Languages the storefront can speak. English is canonical and lives on the
// base tables; every other locale is a translation row on top of it.
export const Locale = {
  En: 'en',
  Uk: 'uk',
} as const

export type Locale = (typeof Locale)[keyof typeof Locale]

export const AdminRole = {
  Owner: 'owner',
  Staff: 'staff',
} as const

export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole]

export const EnquiryKind = {
  Quote: 'quote',
  Distributor: 'distributor',
  Contact: 'contact',
  // A maker who wants the shop to sell their goods on consignment or by
  // dropshipping (/spivpratsia/).
  Partner: 'partner',
} as const

export type EnquiryKind = (typeof EnquiryKind)[keyof typeof EnquiryKind]

export const EnquiryStatus = {
  New: 'new',
  InProgress: 'in_progress',
  Closed: 'closed',
} as const

export type EnquiryStatus = (typeof EnquiryStatus)[keyof typeof EnquiryStatus]

// A review waits for the shop's eye before it is shown. A rejected one stays
// on record so it can be brought back; nothing is ever edited.
export const ReviewStatus = {
  Pending: 'pending',
  Published: 'published',
  Rejected: 'rejected',
} as const

export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus]

// Where a review came from: the site's own form, or the shop's Prom.ua page
// carried over at launch.
export const ReviewSource = {
  Site: 'site',
  Prom: 'prom',
} as const

export type ReviewSource = (typeof ReviewSource)[keyof typeof ReviewSource]

// What the shop sends about an order and by which door; the admin's order
// page lists these, and the once-only crons key on the kind.
export const NotificationKind = {
  OrderPlacedMail: 'order_placed_mail',
  OrderPlacedShopMail: 'order_placed_shop_mail',
  OrderPlacedTelegram: 'order_placed_telegram',
  OrderPlacedSms: 'order_placed_sms',
  ShippedMail: 'shipped_mail',
  ShippedSms: 'shipped_sms',
  WaybillTelegram: 'waybill_telegram',
  WaybillLabelTelegram: 'waybill_label_telegram',
  RefusalTelegram: 'refusal_telegram',
  QuickOrderReminderTelegram: 'quick_order_reminder_telegram',
  ReviewRequestMail: 'review_request_mail',
} as const

export type NotificationKind = (typeof NotificationKind)[keyof typeof NotificationKind]

export const NotificationChannel = {
  Mail: 'mail',
  Sms: 'sms',
  Telegram: 'telegram',
} as const

export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel]

export const NotificationStatus = {
  Sent: 'sent',
  Failed: 'failed',
  // Nothing to send to: no email, no Ukrainian number, channel not set up.
  Skipped: 'skipped',
} as const

export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus]

// Where a buyer came from: the channel of their last visit, within the window,
// that came from somewhere other than typing the address. Null on an order is
// unknown — the buyer refused tracking, or the order predates it.
export const TrafficSource = {
  GoogleAds: 'google_ads',
  Meta: 'meta',
  Search: 'search',
  Social: 'social',
  // Another tagged link (utm_*): a mailing, a Telegram post, a partner.
  Tagged: 'tagged',
  Referral: 'referral',
  Direct: 'direct',
} as const

export type TrafficSource = (typeof TrafficSource)[keyof typeof TrafficSource]

// How the buyer wants the order confirmed: the shop's usual call, no contact
// at all because they are sure, or a message in their messenger instead.
export const ContactPreference = {
  Call: 'call',
  NoCall: 'no_call',
  Viber: 'viber',
  Telegram: 'telegram',
  WhatsApp: 'whatsapp',
} as const

export type ContactPreference = (typeof ContactPreference)[keyof typeof ContactPreference]
