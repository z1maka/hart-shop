export type ContactChannel = {
  readonly key: 'phone' | 'telegram' | 'whatsapp' | 'email'
  readonly handle: string
  readonly href: string
}

export type HeaderChannel = {
  readonly key: 'phone' | 'telegram' | 'whatsapp' | 'youtube'
  readonly href: string
}

export type ContactTopicId = 'custom' | 'volume' | 'order' | 'product' | 'other'

export type ContactTopic = {
  readonly id: ContactTopicId
  readonly label: string
  readonly detail: string
}

// The handles are the workshop's existing support channels, shared with its
// domestic shop — one team answers both.
export const HEADER_CHANNELS: readonly HeaderChannel[] = [
  { key: 'phone', href: 'tel:+380630630677' },
  { key: 'telegram', href: 'https://t.me/+380630630677' },
  { key: 'whatsapp', href: 'https://wa.me/380630630677' },
]

// A channel without a real handle is hidden rather than shown as a promise
// nobody can use.
export const CONTACT_CHANNELS: readonly ContactChannel[] = [
  { key: 'phone', handle: '+380 63 063 06 77', href: 'tel:+380630630677' },
  { key: 'telegram', handle: '+380 63 063 06 77', href: 'https://t.me/+380630630677' },
  { key: 'whatsapp', handle: '+380 63 063 06 77', href: 'https://wa.me/380630630677' },
  { key: 'email', handle: 'office@hart-shop.com', href: 'mailto:office@hart-shop.com' },
]

export const CONTACT_TOPIC_IDS: readonly ContactTopicId[] = [
  'custom',
  'volume',
  'order',
  'product',
  'other',
]

// Labels for storage and internal mail follow the admin language (Russian):
// the enquiry is read in the admin panel and the shop inbox.
export const CONTACT_TOPIC_LABELS_RU: Record<ContactTopicId, string> = {
  custom: 'Индивидуальный заказ',
  volume: 'Оптовый запрос',
  order: 'Вопрос по заказу',
  product: 'Вопрос о товаре',
  other: 'Другое',
}

export const CUSTOM_ORDER_EXAMPLE_KEYS: readonly string[] = [
  'sizes',
  'pattern',
  'covers',
  'tarps',
  'batch',
]

export function liveContactChannels(): ContactChannel[] {
  return CONTACT_CHANNELS.filter((channel) => channel.handle !== 'TBC')
}
