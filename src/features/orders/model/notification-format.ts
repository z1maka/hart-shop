import { bankMfo, paymentPurpose, type BankRequisites } from '@/config/requisites'
import { SizeAxis, sizeAxisOf } from '@/config/variant-size'
import { Carrier, PaymentRoute } from '@/db/enums'
import type { OrderItemRow } from '@/features/orders/repository/order-repository'
import { escapeHtml } from '@/lib/html'
import { groupIban } from '@/lib/iban'
import { createMoney, Currency, formatMoney } from '@/lib/money'
import { formatKilos } from '@/lib/weight'

// Internal notifications (shop mail, Telegram) follow the admin language —
// Russian, the same person who reads the admin panel.
export const PAYMENT_ROUTE_RU: Record<PaymentRoute, string> = {
  [PaymentRoute.CashOnDelivery]: 'наложенный платеж',
  [PaymentRoute.Card]: 'оплата картой',
  [PaymentRoute.BankTransfer]: 'банковский перевод',
}

export function itemLines(items: readonly OrderItemRow[]): string[] {
  return items.map((item) => {
    const variant = item.variantLabel.trim() === '' ? '' : ` (${item.variantLabel})`
    return `${item.quantity} × ${item.productTitle}${variant} — ${money(item.unitPriceCents * item.quantity)}`
  })
}

// One order line as the packing chat reads it: the purchase snapshot, and the
// product as it is now while the bought variant still exists.
export type PackingSource = {
  readonly quantity: number
  readonly productSlug: string
  readonly productTitle: string
  readonly variantLabel: string
  readonly currentSlug: string | null
  readonly packingTitle: string | null
  readonly shortTitle: string | null
  readonly color: string | null
  readonly size: string | null
}

export type PackingItem = {
  readonly productUrl: string
  // The workshop's name; the shop's short title until the owner gives one.
  readonly name: string
  readonly color: string | null
  readonly size: string | null
  readonly quantity: number
}

export function toPackingItem(source: PackingSource, siteUrl: string): PackingItem {
  const slug = source.currentSlug ?? source.productSlug
  // A deleted variant names neither colour nor size: the label bought then
  // stands in for the colour, so the line still says what went in the box.
  const isVariantGone = source.color === null && source.size === null
  return {
    productUrl: `${siteUrl}/product/${encodeURIComponent(slug)}/`,
    name: source.packingTitle?.trim() || source.shortTitle?.trim() || source.productTitle,
    color: source.color ?? (isVariantGone ? source.variantLabel.trim() || null : null),
    size: source.size,
    quantity: source.quantity,
  }
}

const PACKING_SIZE_LABEL: Record<SizeAxis, string> = {
  [SizeAxis.Size]: 'розмір',
  [SizeAxis.StarlinkModel]: 'модель',
}

// The workshop picks goods by its own names (owner's format, 19.10.2026): the
// page, the name, the colour and the size or Starlink model it is cut to; the
// count only when there is more than one.
export function packingItemLines(item: PackingItem): string[] {
  return [
    `${item.productUrl} - ${item.name}`,
    ...(item.color ? [`колір: ${item.color.toLowerCase()}`] : []),
    ...(item.size ? [`${PACKING_SIZE_LABEL[sizeAxisOf([item.size])]}: ${item.size}`] : []),
    ...(item.quantity > 1 ? [`кількість: ${item.quantity}`] : []),
  ]
}

export type WaybillNotice = {
  readonly orderId: string
  readonly orderNumber: string
  readonly waybillNumber: string
  readonly trackingUrl: string
  readonly adminOrderUrl: string
  readonly recipient: string
  readonly phone: string | null
  // Which cabinet wrote the waybill and from which branch it goes: with
  // several cabinets the packer has to know whose label is in their hand.
  readonly sender: string | null
  readonly destination: string
  readonly weightGrams: number
  readonly declaredValueCents: number
  readonly codCents: number
  readonly issuedBy: string
  readonly items: readonly PackingItem[]
}

// The packing chat's card for a fresh waybill: what goes in the box, where it
// goes and how much the branch collects — enough to pack without the admin.
export function waybillIssuedTelegramText(notice: WaybillNotice): string {
  const kilos = formatKilos(notice.weightGrams, 'ru-RU', 2)
  const recipient = [notice.recipient, notice.phone].filter(Boolean).join(', ')
  const cod = notice.codCents > 0 ? money(notice.codCents) : 'нет — заказ оплачен'

  return [
    `<b>ТТН ${escapeHtml(notice.waybillNumber)} — заказ ${escapeHtml(notice.orderNumber)}</b>`,
    '',
    `Получатель: ${escapeHtml(recipient)}`,
    ...(notice.sender ? [`Отправитель: ${escapeHtml(notice.sender)}`] : []),
    `Куда: ${escapeHtml(notice.destination)}`,
    `Вес: ${kilos} кг · объявленная стоимость ${money(notice.declaredValueCents)}`,
    `Контроль оплаты: ${cod}`,
    '',
    'Товары:',
    ...notice.items.flatMap((item, index) => [
      ...(index > 0 ? [''] : []),
      ...packingItemLines(item).map(escapeHtml),
    ]),
    '',
    `Создал: ${escapeHtml(notice.issuedBy)}`,
    `<a href="${escapeHtml(notice.trackingUrl)}">Отслеживание</a> · <a href="${escapeHtml(notice.adminOrderUrl)}">Заказ в админке</a>`,
  ].join('\n')
}

// Plain text under the label file in the packing chat.
export function waybillLabelCaption(waybillNumber: string, orderNumber: string): string {
  return `Этикетка 100×100 · ТТН ${waybillNumber} · заказ ${orderNumber}`
}

export type QuickOrderReminderNotice = {
  readonly orderId: string
  readonly orderNumber: string
  readonly waitingHours: number
  readonly recipient: string
  readonly phone: string | null
  readonly items: readonly OrderItemRow[]
  readonly adminOrderUrl: string
}

// The orders chat is reminded once about a phone-only order nobody has
// called back: the buyer is waiting for the call, not for a parcel.
export function quickOrderReminderTelegramText(notice: QuickOrderReminderNotice): string {
  const buyer = [notice.recipient || 'без имени', notice.phone].filter(Boolean).join(', ')

  return [
    `<b>Заявка ${escapeHtml(notice.orderNumber)} ждёт звонка уже ${notice.waitingHours} ч</b>`,
    '',
    `Покупатель: ${escapeHtml(buyer)}`,
    'Товары:',
    ...itemLines(notice.items).map((line) => `• ${escapeHtml(line)}`),
    '',
    'Позвоните, впишите получателя и отделение — заказ сам перейдёт в «Активные».',
    `<a href="${escapeHtml(notice.adminOrderUrl)}">Заказ в админке</a>`,
  ].join('\n')
}

export type ParcelRefusalNotice = {
  readonly orderId: string
  readonly orderNumber: string
  readonly waybillNumber: string
  // The carrier's own words: "Відмова одержувача".
  readonly statusText: string
  readonly recipient: string
  readonly phone: string | null
  readonly codCents: number
  readonly adminOrderUrl: string
}

// The orders chat hears once that a parcel is coming back. The order has
// become a return already and waits in its tab; closing it, and giving a
// prepaid buyer the money back, stays with the admin.
export function parcelRefusedTelegramText(notice: ParcelRefusalNotice): string {
  const recipient = [notice.recipient, notice.phone].filter(Boolean).join(', ')
  const isPrepaid = notice.codCents === 0
  const cod = isPrepaid ? 'нет — заказ оплачен' : money(notice.codCents)

  return [
    `<b>Отказ от посылки — заказ ${escapeHtml(notice.orderNumber)}</b>`,
    '',
    `ТТН ${escapeHtml(notice.waybillNumber)}: ${escapeHtml(notice.statusText)}`,
    `Получатель: ${escapeHtml(recipient)}`,
    `Контроль оплаты: ${cod}`,
    '',
    'Заказ получил статус «Возврат» и ждёт во вкладке «Возвраты». Когда посылка вернётся, отправьте его в архив.',
    ...(isPrepaid ? ['Заказ был оплачен заранее — верните деньги покупателю.'] : []),
    `<a href="${escapeHtml(notice.adminOrderUrl)}">Заказ в админке</a>`,
  ].join('\n')
}

export function money(cents: number): string {
  return formatMoney(createMoney(cents, Currency.Uah))
}

export { escapeHtml }

// Buyer-facing summary lines of the confirmation mail. Delivery is billed by
// Nova Poshta on receipt, so a zero shipping charge means "carrier's tariff",
// never "free"; a card order is already paid when the mail goes out.
export function buyerThanksLine(orderNumber: string, route: PaymentRoute): string {
  return route === PaymentRoute.Card
    ? `Замовлення ${orderNumber} оплачене — дякуємо.`
    : `Замовлення ${orderNumber} прийняте — дякуємо.`
}

export function buyerShippingLine(carrierName: string, shippingCents: number): string {
  return shippingCents === 0
    ? `Доставка: ${carrierName}, за тарифами перевізника, оплата при отриманні`
    : `Доставка (${carrierName}): ${money(shippingCents)}`
}

export function buyerTotalLabel(route: PaymentRoute): string {
  return route === PaymentRoute.Card ? 'Сплачено карткою' : 'Разом до сплати'
}

// A buyer paying by transfer needs the account in the letter itself: it is
// what they copy into their banking app. Without stored details the letter
// promises them rather than printing an empty block.
export function bankTransferLines(
  requisites: BankRequisites | null,
  orderNumber: string,
  totalCents: number,
): string[] {
  if (!requisites)
    return ['Реквізити для оплати надішлемо окремо — відправка після надходження коштів.']

  return [
    'Реквізити для оплати:',
    `Отримувач: ${requisites.recipient}`,
    `IBAN: ${groupIban(requisites.iban)}`,
    `ІПН / ЄДРПОУ: ${requisites.taxId}`,
    `Банк: ${requisites.bankName}, МФО ${bankMfo(requisites)}, ЄДРПОУ банку ${requisites.bankEdrpou}`,
    `Сума: ${money(totalCents)}`,
    `Призначення платежу: ${paymentPurpose(orderNumber)}`,
    'Відправимо замовлення, щойно кошти надійдуть на рахунок.',
  ]
}

// The carrier in the instrumental case, as the SMS names it.
const CARRIER_BY_UK: Record<Carrier, string> = {
  [Carrier.NovaPost]: 'Новою Поштою',
}

// One SMS when the parcel is on its way: the order, the carrier and the
// waybill number the buyer types into the carrier's app. Two Cyrillic
// segments at most, so no link here — the confirmation SMS carried it.
export function orderShippedSmsText(
  orderNumber: string,
  carrier: Carrier | null,
  trackingNumber: string | null,
): string {
  const sentBy = CARRIER_BY_UK[carrier ?? Carrier.NovaPost]
  const waybill = trackingNumber ? ` ТТН ${trackingNumber}.` : ''
  return `Замовлення ${orderNumber} відправлено ${sentBy}.${waybill}`
}

export type ReviewRequestProduct = {
  readonly name: string
  readonly url: string
}

export const REVIEW_REQUEST_MAIL = {
  subject: (product: ReviewRequestProduct) => `Як вам ${product.name}?`,
  thanks: (orderNumber: string) => `Дякуємо за замовлення ${orderNumber}!`,
  ask: (product: ReviewRequestProduct) =>
    `Якщо ${product.name} уже в роботі, розкажіть, як усе працює: ваш відгук допоможе іншим обрати.`,
  leaveReview: 'Залишити відгук',
  moderation: 'Публікуємо після перевірки, зазвичай протягом доби.',
} as const

// A quick order has nothing settled but the phone, so its SMS says a
// consultant will call (owner's wording, 18.09.2026); a full order only
// confirms. This runs to three Cyrillic segments instead of two.
export function orderPlacedSmsText(
  orderNumber: string,
  trackingUrl: string,
  isQuick: boolean,
): string {
  return isQuick
    ? `Ваше замовлення ${orderNumber} прийнято. Наш консультант скоро зв'яжеться з вами. Відстеження: ${trackingUrl}`
    : `Ваше замовлення ${orderNumber} прийнято. Дякуємо! Відстеження: ${trackingUrl}`
}
