import { CARRIER_NAMES } from '@/config/delivery'
import { parseRequisitesSnapshot, paymentPurpose } from '@/config/requisites'
import { OrderStatus, PaymentRoute } from '@/db/enums'
import { requisitesView, type BankRequisitesView } from '@/features/billing'
import { ParcelStage } from '@/features/shipping'
import { toUkrainianMsisdn } from '@/features/orders/model/phone'
import { buildOrderTimeline, type TimelineStep } from '@/features/orders/model/timeline'
import {
  orderRepository,
  type OrderRow,
  type ShippingAddress,
} from '@/features/orders/repository/order-repository'
import { createMoney, Currency, formatMoney } from '@/lib/money'
import { publicUrl } from '@/lib/storage'

export type OrderLineView = {
  readonly id: string
  readonly title: string
  readonly variantLabel: string
  readonly quantity: number
  readonly linePriceLabel: string
  readonly imageUrl: string | null
}

export type OrderView = {
  readonly orderNumber: string
  readonly status: string
  readonly paymentRoute: string
  readonly email: string | null
  readonly countryName: string
  readonly carrier: string | null
  readonly trackingNumber: string | null
  readonly trackingUrl: string | null
  readonly subtotalLabel: string
  readonly shippingLabel: string
  readonly totalLabel: string
  readonly totalCents: number
  readonly shippingCents: number
  readonly analyticsItems: readonly {
    readonly sku: string
    readonly title: string
    readonly priceCents: number
    readonly quantity: number
    readonly categorySlug: null
  }[]
  readonly carrierName: string
  readonly address: ShippingAddress
  // The buyer as the ad platforms match a sale: E.164 phone, or null when
  // the free-form number is not a dialable Ukrainian one.
  readonly customer: {
    readonly email: string | null
    readonly phone: string | null
  }
  // The buyer refused the parcel or never collected it: it is on its way
  // back, and a prepaid order still waits for its money.
  readonly isParcelReturning: boolean
  readonly isPrepaid: boolean
  // A transfer order nobody has paid yet: the page leads with the account
  // and the exact purpose line to put on the payment.
  readonly isAwaitingTransfer: boolean
  readonly paymentPurpose: string
  // The account fixed when the order was placed; null for orders placed
  // before accounts were kept on the order.
  readonly transferRequisites: BankRequisitesView | null
  readonly timeline: readonly TimelineStep[]
  readonly lines: readonly OrderLineView[]
}

export async function getOrderByToken(accessToken: string): Promise<OrderView | null> {
  const order = await orderRepository.findByAccessToken(accessToken)
  return order ? toOrderView(order) : null
}

async function toOrderView(order: OrderRow): Promise<OrderView> {
  const items = await orderRepository.findItems(order.id)

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentRoute: order.paymentRoute,
    email: order.email,
    countryName: 'Україна',
    carrier: order.carrier,
    carrierName: order.carrier ? CARRIER_NAMES[order.carrier] : 'Нова Пошта',
    address: order.shippingAddress,
    customer: {
      email: order.email,
      phone: e164PhoneOf(order.shippingAddress.phone),
    },
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    subtotalLabel: formatMoney(createMoney(order.subtotalCents, Currency.Uah)),
    shippingLabel:
      order.shippingCents === 0
        ? 'за тарифами перевізника'
        : formatMoney(createMoney(order.shippingCents, Currency.Uah)),
    totalLabel: formatMoney(createMoney(order.totalCents, Currency.Uah)),
    totalCents: order.totalCents,
    shippingCents: order.shippingCents,
    isParcelReturning: order.parcelStage === ParcelStage.Refused,
    isPrepaid: order.paidAt !== null,
    isAwaitingTransfer: isAwaitingTransfer(order),
    paymentPurpose: paymentPurpose(order.orderNumber),
    transferRequisites: transferRequisitesOf(order),
    analyticsItems: items.map((item) => ({
      sku: item.sku,
      title: item.productTitle,
      priceCents: item.unitPriceCents,
      quantity: item.quantity,
      categorySlug: null,
    })),
    timeline: buildOrderTimeline(order.status),
    lines: items.map((item) => ({
      id: item.id,
      title: item.productTitle,
      variantLabel: item.variantLabel,
      quantity: item.quantity,
      linePriceLabel: formatMoney(createMoney(item.unitPriceCents * item.quantity, Currency.Uah)),
      imageUrl: item.imageStorageKey ? publicUrl(item.imageStorageKey) : null,
    })),
  }
}

function isAwaitingTransfer(order: OrderRow): boolean {
  return (
    order.paymentRoute === PaymentRoute.BankTransfer &&
    order.status === OrderStatus.Pending &&
    order.paidAt === null
  )
}

function transferRequisitesOf(order: OrderRow): BankRequisitesView | null {
  const snapshot = parseRequisitesSnapshot(order.bankRequisites)
  return snapshot ? requisitesView(snapshot) : null
}

function e164PhoneOf(raw: string | undefined): string | null {
  if (!raw) return null
  const msisdn = toUkrainianMsisdn(raw)
  return msisdn ? `+${msisdn}` : null
}
