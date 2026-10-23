// The workshop sews single pieces to order. This is the page that sells it
// and the form that starts it; everything else in the shop links here.
export const CUSTOM_ORDER_HREF = '/poshyv-na-zamovlennya/'

// What the workshop actually takes to order. Ponchos are not here on
// purpose: they are sewn to a standard pattern, and offering them as custom
// work would promise something nobody makes.
export type CustomOrderItemId = 'tent' | 'cover' | 'modular' | 'other'

export const CUSTOM_ORDER_ITEM_IDS: readonly CustomOrderItemId[] = [
  'tent',
  'cover',
  'modular',
  'other',
]

// The admin panel and the notification read Russian, the storefront reads
// Ukrainian — the same split as everywhere else in this shop.
export const CUSTOM_ORDER_ITEM_LABELS_RU: Record<CustomOrderItemId, string> = {
  tent: 'Тент нестандартного размера',
  cover: 'Чехол на оборудование',
  modular: 'Модульная система',
  other: 'Другое',
}

// The photograph each card on the page borrows until the workshop supplies
// pictures of its own finished custom work.
export const CUSTOM_ORDER_ITEM_COVERS: Record<CustomOrderItemId, string> = {
  tent: 'antyteploviziynyi-tent-250x150-multykam',
  cover: 'antyteplovizornyy-chokhol-na-starlink-iz-maskuvalnoyu-sitkoyu',
  modular: 'antyteploviziynyi-tent-250x150-olyva',
  other: 'antyteploviziyni-chokhly-na-ruky-uv-em',
}

export const CUSTOM_ORDER_STEP_KEYS: readonly string[] = ['request', 'quote', 'payment', 'sewing']

export const CUSTOM_ORDER_FAQ_KEYS: readonly string[] = [
  'minimum',
  'lead',
  'fabric',
  'payment',
  'returns',
]
