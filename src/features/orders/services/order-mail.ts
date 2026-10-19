import { CARRIER_NAMES } from '@/config/delivery'
import { siteConfig } from '@/config/site'
import { parseRequisitesSnapshot } from '@/config/requisites'
import { NotificationKind, PaymentRoute } from '@/db/enums'
import { bankAccountService } from '@/features/billing'
import { CONTACT_PREFERENCE_RU, isSpecialContact } from '@/features/orders/model/contact-preference'
import {
  deliverNotification,
  skipNotification,
} from '@/features/orders/services/notification-log'
import {
  bankTransferLines,
  buyerShippingLine,
  buyerThanksLine,
  buyerTotalLabel,
  REVIEW_REQUEST_MAIL,
  type ReviewRequestProduct,
  escapeHtml,
  itemLines,
  money,
  PAYMENT_ROUTE_RU,
} from '@/features/orders/model/notification-format'
import type { OrderItemRow, OrderRow } from '@/features/orders/repository/order-repository'
import { enquiryRecipient, env } from '@/lib/env'
import { sendMail } from '@/lib/mailer'

export type OrderMailInput = {
  readonly order: OrderRow
  readonly items: readonly OrderItemRow[]
  readonly carrierName: string
}

// The storefront is single-locale, so buyer mail is always Ukrainian; the
// shop notification is Russian — the admin language of the same person.
const COPY = {
  confirmedSubject: (n: string) => `${siteConfig.name} — замовлення ${n} підтверджене`,
  follow: 'Стежити за замовленням',
  followLink: 'Стежити за замовленням',
  shippedSubject: (n: string) => `${siteConfig.name} — замовлення ${n} відправлене`,
  onItsWay: (n: string, carrier: string) => `Замовлення ${n} вже в дорозі${carrier}.`,
  withCarrier: (c: string) => ` з ${c}`,
  trackingNumber: 'Номер відстеження',
  trackParcel: 'Відстежити посилку',
  customsNote: 'Посилка вже у перевізника — стежте за нею за номером відстеження.',
  orderPage: 'Сторінка замовлення',
  openOrderPage: 'Відкрити сторінку замовлення',
} as const

export const orderMail = {
  async sendConfirmation(input: OrderMailInput): Promise<boolean | null> {
    const { order } = input
    const email = order.email
    if (!email) return skipNotification(order.id, NotificationKind.OrderPlacedMail, 'нет email')

    const c = COPY
    const trackingUrl = `${env.NEXT_PUBLIC_SITE_URL}/order/${order.accessToken}`
    const lines = itemLines(input.items)

    const thanks = buyerThanksLine(order.orderNumber, order.paymentRoute)
    const shipping = buyerShippingLine(input.carrierName, order.shippingCents)
    const totalLabel = buyerTotalLabel(order.paymentRoute)
    const transfer = await transferInstructions(order)

    const text = [
      thanks,
      '',
      ...lines.map((line) => `  ${line}`),
      '',
      shipping,
      `${totalLabel}: ${money(order.totalCents)}`,
      ...(transfer.length > 0 ? ['', ...transfer] : []),
      '',
      `${c.follow}: ${trackingUrl}`,
    ].join('\n')

    const html = [
      `<p>${escapeHtml(thanks)}</p>`,
      `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`,
      `<p>${escapeHtml(shipping)}<br>`,
      `${totalLabel}: <strong>${money(order.totalCents)}</strong></p>`,
      transfer.length > 0 ? `<p>${transfer.map(escapeHtml).join('<br>')}</p>` : '',
      `<p><a href="${trackingUrl}">${c.followLink}</a></p>`,
    ].join('')

    return deliverNotification(order.id, NotificationKind.OrderPlacedMail, () =>
      sendMail({
      to: email,
      subject: c.confirmedSubject(order.orderNumber),
      text,
      html,
      }),
    )
  },

  async sendShippedNotice(order: OrderRow): Promise<boolean | null> {
    const email = order.email
    if (!email) return skipNotification(order.id, NotificationKind.ShippedMail, 'нет email')

    const carrierName = order.carrier ? CARRIER_NAMES[order.carrier] : null
    const c = COPY
    const orderPageUrl = `${env.NEXT_PUBLIC_SITE_URL}/order/${order.accessToken}`
    const carrierLine = carrierName ? c.withCarrier(carrierName) : ''
    const trackingLines = [
      order.trackingNumber ? `${c.trackingNumber}: ${order.trackingNumber}` : null,
      order.trackingUrl ? `${c.trackParcel}: ${order.trackingUrl}` : null,
    ].filter((line): line is string => line !== null)

    const text = [
      c.onItsWay(order.orderNumber, carrierLine),
      '',
      ...trackingLines,
      '',
      c.customsNote,
      '',
      `${c.orderPage}: ${orderPageUrl}`,
    ].join('\n')

    const html = [
      `<p>${escapeHtml(c.onItsWay(order.orderNumber, carrierLine))}</p>`,
      order.trackingNumber
        ? `<p>${c.trackingNumber}: <strong>${escapeHtml(order.trackingNumber)}</strong></p>`
        : '',
      order.trackingUrl ? `<p><a href="${order.trackingUrl}">${c.trackParcel}</a></p>` : '',
      `<p>${escapeHtml(c.customsNote)}</p>`,
      `<p><a href="${orderPageUrl}">${c.openOrderPage}</a></p>`,
    ].join('')

    return deliverNotification(order.id, NotificationKind.ShippedMail, () =>
      sendMail({
      to: email,
      subject: c.shippedSubject(order.orderNumber),
      text,
      html,
      }),
    )
  },

  async sendReviewRequest(order: OrderRow, product: ReviewRequestProduct): Promise<boolean | null> {
    const email = order.email
    if (!email) return skipNotification(order.id, NotificationKind.ReviewRequestMail, 'нет email')

    const c = REVIEW_REQUEST_MAIL
    const text = [
      c.thanks(order.orderNumber),
      '',
      c.ask(product),
      `${c.leaveReview}: ${product.url}`,
      '',
      c.moderation,
    ].join('\n')
    const html = [
      `<p>${escapeHtml(c.thanks(order.orderNumber))}</p>`,
      `<p>${escapeHtml(c.ask(product))}</p>`,
      `<p><a href="${escapeHtml(product.url)}">${c.leaveReview}</a></p>`,
      `<p>${escapeHtml(c.moderation)}</p>`,
    ].join('')

    return deliverNotification(order.id, NotificationKind.ReviewRequestMail, () =>
      sendMail({ to: email, subject: c.subject(product), text, html }),
    )
  },

  async sendShopNotification(input: OrderMailInput): Promise<boolean> {
    const { order } = input
    const address = order.shippingAddress

    const rows: readonly (readonly [string, string])[] = [
      ['Заказ', order.orderNumber],
      ['Сумма', money(order.totalCents)],
      ['Покупатель', order.email ? `${address.fullName} <${order.email}>` : address.fullName],
      ['Телефон', address.phone ?? '—'],
      ['Доставка', [address.line1, address.city].filter(Boolean).join(', ')],
      ['Перевозчик', input.carrierName],
      ['Оплата', PAYMENT_ROUTE_RU[order.paymentRoute]],
      ...(isSpecialContact(order.contactPreference)
        ? [['Связь', CONTACT_PREFERENCE_RU[order.contactPreference]] as const]
        : []),
      ['Товары', itemLines(input.items).join(' · ')],
      ...(order.customerNote ? [['Комментарий', order.customerNote] as const] : []),
    ]

    return deliverNotification(order.id, NotificationKind.OrderPlacedShopMail, () =>
      sendMail({
      to: enquiryRecipient,
      replyTo: order.email ?? undefined,
      subject: `Новый заказ ${order.orderNumber} — ${money(order.totalCents)}`,
      text: rows.map(([label, value]) => `${label}: ${value}`).join('\n'),
      html: `<table>${rows
        .map(
          ([label, value]) =>
            `<tr><th align="left">${label}</th><td style="white-space:pre-line">${escapeHtml(value)}</td></tr>`,
        )
        .join('')}</table>`,
      }),
    )
  },
}

async function transferInstructions(order: OrderRow): Promise<string[]> {
  if (order.paymentRoute !== PaymentRoute.BankTransfer) return []

  // The account fixed on the order; the active one for an order placed
  // before accounts were kept on it.
  const requisites =
    parseRequisitesSnapshot(order.bankRequisites) ?? (await bankAccountService.active())
  return bankTransferLines(requisites, order.orderNumber, order.totalCents)
}
