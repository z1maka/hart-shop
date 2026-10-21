// Other makers who want the shop to sell their goods. The shop stays the
// seller to the buyer in both formats (owner, 21.10.2026): the maker either
// hands over stock on consignment or keeps it and ships each order.
export const PARTNERS_HREF = '/spivpratsia/'

export type PartnerModelId = 'consignment' | 'dropshipping' | 'undecided'

export const PARTNER_MODEL_IDS: readonly PartnerModelId[] = [
  'consignment',
  'dropshipping',
  'undecided',
]

// The formats the page explains; «undecided» is only a form answer.
export const PARTNER_OFFERED_MODEL_IDS: readonly PartnerModelId[] = ['consignment', 'dropshipping']

// The admin panel and the notification read Russian, the storefront reads
// Ukrainian — the same split as everywhere else in this shop.
export const PARTNER_MODEL_LABELS_RU: Record<PartnerModelId, string> = {
  consignment: 'Реализация',
  dropshipping: 'Дропшиппинг',
  undecided: 'Пока не решили',
}

export const PARTNER_OFFER_KEYS: readonly string[] = ['catalog', 'buyers', 'sale', 'support']

export const PARTNER_REQUIREMENT_KEYS: readonly string[] = [
  'production',
  'documents',
  'photos',
  'stock',
  'contract',
]

export const PARTNER_STEP_KEYS: readonly string[] = ['request', 'samples', 'contract', 'start']

export const PARTNER_FAQ_KEYS: readonly string[] = ['seller', 'brand', 'feed', 'terms', 'photos']

// The owner's own field photo: the page speaks for the workshop, so it shows
// the workshop's work rather than a product card that may change.
export const PARTNERS_HERO_PHOTO = {
  url: '/home/role-maskuvannya.webp',
  alt: 'Маскувальне пончо Гарт у осінній посадці',
} as const
