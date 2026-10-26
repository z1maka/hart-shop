import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import { DeliveryKind, NotificationStatus } from '@/db/enums'
import { getAdminOrderView } from '@/features/admin/queries/get-admin-desk'
import {
  NOTIFICATION_KIND_LABELS,
  NOTIFICATION_STATUS_LABELS,
} from '@/features/admin/ui/notification-labels'
import type {
  AdminNotificationView,
  AdminOrderLine,
} from '@/features/orders/queries/get-admin-order'
import { OrderActionsPanel } from '@/features/admin/ui/OrderActionsPanel'
import { PhoneLink } from '@/features/admin/ui/order-cells'
import { WaybillPanel } from '@/features/admin/ui/WaybillPanel'
import { trafficLabel } from '@/features/admin/ui/traffic-labels'
import {
  isParcelAlert,
  orderStatusClass,
  orderStatusLabel,
  parcelStageLabel,
  PAYMENT_ROUTE_LABELS,
} from '@/features/admin/ui/order-status'
import type { AdminParcelView } from '@/features/orders'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Заказ',
  robots: { index: false, follow: false },
}

export default function AdminOrderPage({ params }: PageProps<'/admin/orders/[id]'>) {
  return (
    <Suspense fallback={<p className="text-[13.5px] text-muted">Загружаем заказ…</p>}>
      <OrderDetail params={params} />
    </Suspense>
  )
}

async function OrderDetail({ params }: { params: PageProps<'/admin/orders/[id]'>['params'] }) {
  const { id } = await params
  const order = await getAdminOrderView(id)

  if (!order) notFound()

  return (
    <div>
      <Link
        href="/admin/orders"
        className="mb-3 inline-block text-[13px] font-semibold text-accent-hover hover:underline"
      >
        ← Ко всем заказам
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-[22px] font-bold text-ink">{order.orderNumber}</h1>
        <span
          className={cn(
            'inline-block rounded-pill px-2.5 py-1.5 text-[11px] font-semibold',
            orderStatusClass(order.status, order.paymentRoute),
          )}
        >
          {orderStatusLabel(order.status, order.paymentRoute)}
        </span>
        <span className="text-[13px] text-muted">{order.placedAt}</span>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="grid min-w-[min(100%,340px)] flex-[999_1_460px] grid-cols-1 gap-4">
          {/* First thing the team sees: whether to call at all. */}
          {order.contact.isSpecial ? (
            <section className="rounded-card border border-accent-edge bg-accent-tint p-5">
              <h2 className="mb-2 text-[14px] font-semibold text-ink">Связь с покупателем</h2>
              <p className="text-[13.5px] leading-relaxed text-ink first-letter:uppercase">
                {order.contact.label}
                {order.contact.chatUrl ? (
                  <>
                    {' · '}
                    <a
                      href={order.contact.chatUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold underline underline-offset-2 hover:text-accent-hover"
                    >
                      открыть чат
                    </a>
                  </>
                ) : null}
              </p>
            </section>
          ) : null}

          {/* Above the lines: the buyer's words can change what goes in the box. */}
          {order.customerNote ? (
            <section className="rounded-card border border-accent-edge bg-accent-tint p-5">
              <h2 className="mb-2 text-[14px] font-semibold text-ink">Комментарий покупателя</h2>
              <p className="text-[13.5px] leading-relaxed whitespace-pre-line text-ink">
                {order.customerNote}
              </p>
            </section>
          ) : null}

          <section className="rounded-card border border-subtle bg-surface p-5">
            <h2 className="mb-3 text-[14px] font-semibold text-ink">Состав заказа</h2>
            <OrderLinesList lines={order.lines} />
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr className="text-left text-[12px] text-muted">
                    <th className="pb-2 font-semibold">Товар</th>
                    <th className="pb-2 font-semibold">Артикул</th>
                    <th className="pb-2 pl-3 text-right font-semibold">Кол-во</th>
                    <th className="pb-2 pl-4 text-right font-semibold">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((line) => (
                    <tr key={line.id} className="border-t border-subtle">
                      <td className="py-2.5 pr-3">
                        {line.title}
                        <span className="block text-[12px] text-faint">{line.variantLabel}</span>
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-muted">{line.sku}</td>
                      <td className="py-2.5 pl-3 text-right text-muted">{line.quantity}</td>
                      <td className="py-2.5 pl-4 text-right font-semibold whitespace-nowrap">
                        {line.linePriceLabel}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="mt-4 grid gap-1.5 border-t border-subtle pt-3.5 text-[13.5px]">
              <Row label="Товары" value={order.subtotalLabel} />
              <Row label="Доставка" value={order.shippingLabel} />
              <Row label="Итого" value={order.totalLabel} isStrong />
              {order.prepaidLabel ? <Row label="Предоплата" value={order.prepaidLabel} /> : null}
              {order.codLabel ? <Row label="Контроль оплаты" value={order.codLabel} /> : null}
            </dl>
          </section>

          <section className="rounded-card border border-subtle bg-surface p-5">
            <h2 className="mb-3 text-[14px] font-semibold text-ink">Покупатель и доставка</h2>
            <dl className="grid gap-1.5 text-[13.5px]">
              <Row label="Получатель" value={order.address.fullName} />
              {order.email ? <Row label="Почта" value={order.email} /> : null}
              {order.address.phone ? (
                <Row label="Телефон" value={<PhoneLink phone={order.address.phone} />} />
              ) : null}
              <Row label="Связь" value={order.contact.label} />
              {order.buyerCompany ? <Row label="Компания" value={order.buyerCompany} /> : null}
              <Row
                label="Адрес"
                value={
                  order.deliveryKind === DeliveryKind.Courier
                    ? `${order.address.line1}${order.address.line2 ? `, ${order.address.line2}` : ''}, ${order.address.city}`
                    : (order.pickupPointLabel ?? '—')
                }
              />
              <Row label="Оплата" value={PAYMENT_ROUTE_LABELS[order.paymentRoute]} />
              <Row label="Источник" value={trafficLabel(order.traffic)} />
              {order.paidAt ? <Row label="Оплачен" value={order.paidAt} /> : null}
              {order.paymentRef ? <Row label="Платёжная ссылка" value={order.paymentRef} /> : null}
              {order.invoiceNumber ? <Row label="Счёт" value={order.invoiceNumber} /> : null}
              {order.trackingNumber ? (
                <Row label="Трек-номер" value={order.trackingNumber} />
              ) : null}
              <ParcelRow parcel={order.parcel} isTracked={order.isParcelTracked} />
            </dl>
          </section>
        </div>

        <aside className="grid min-w-[min(100%,300px)] flex-[1_1_320px] grid-cols-1 gap-4">
          <WaybillPanel
            orderId={order.id}
            waybill={order.waybill}
            trackingNumber={order.trackingNumber}
            trackingUrl={order.trackingUrl}
          />
          <OrderActionsPanel
            // Fresh fields after a waybill is issued or removed next to it.
            key={order.waybill.documentRef ?? 'no-waybill'}
            orderId={order.id}
            status={order.status}
            allowedNextStatuses={order.allowedNextStatuses}
            carrier={order.carrier}
            trackingNumber={order.trackingNumber}
            invoiceNumber={order.invoiceNumber}
            transferAccount={order.transferAccount}
            paymentRoute={order.paymentRoute}
            isTrackingFromWaybill={order.waybill.documentRef !== null}
          />
          <NotificationsPanel notifications={order.notifications} />
        </aside>
      </div>
    </div>
  )
}

// Where the parcel is, in the carrier's own words, for a waybill issued here
// or typed from the cabinet alike.
function ParcelRow({
  parcel,
  isTracked,
}: {
  readonly parcel: AdminParcelView | null
  readonly isTracked: boolean
}) {
  if (!parcel) {
    return isTracked ? (
      <Row label="Посылка" value="статус появится после ближайшей проверки — раз в час" />
    ) : null
  }

  const details = [parcel.statusText ? `«${parcel.statusText}»` : '', parcel.updatedAt ?? '']
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">Посылка</dt>
      <dd className="text-right">
        <span
          className={cn(
            'block',
            isParcelAlert(parcel.stage) ? 'font-semibold text-alert' : 'text-ink',
          )}
        >
          {parcelStageLabel(parcel.stage)}
        </span>
        <span className="block text-[12px] text-faint">{details.filter(Boolean).join(' · ')}</span>
      </dd>
    </div>
  )
}

function Row({ label, value, isStrong }: { label: string; value: ReactNode; isStrong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      {/* An address or a payment reference breaks rather than widening the card. */}
      <dd
        className={cn('min-w-0 wrap-anywhere text-ink', isStrong ? 'font-semibold' : 'text-right')}
      >
        {value}
      </dd>
    </div>
  )
}

// The order lines on a phone: four table columns do not fit, and the
// quantity pressed against the sum read as one number («1» + «2 900» = «12 900»).
function OrderLinesList({ lines }: { readonly lines: readonly AdminOrderLine[] }) {
  return (
    <ul className="grid sm:hidden">
      {lines.map((line) => (
        <li
          key={line.id}
          className="grid gap-0.5 border-t border-subtle py-2.5 text-[13.5px] first:border-t-0 first:pt-0"
        >
          <span className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-ink">{line.title}</span>
            <span className="font-semibold whitespace-nowrap text-ink">{line.linePriceLabel}</span>
          </span>
          <span className="text-[12px] text-faint">{line.variantLabel}</span>
          <span className="text-[12px] wrap-anywhere text-muted">
            {line.sku} · {line.quantity} × {line.unitPriceLabel}
          </span>
        </li>
      ))}
    </ul>
  )
}

// What the shop sent about the order and whether it arrived at the door:
// the answer to «а покупателю ушло?» without opening the logs.
function NotificationsPanel({
  notifications,
}: {
  readonly notifications: readonly AdminNotificationView[]
}) {
  return (
    <section className="rounded-card border border-subtle bg-surface p-5">
      <h2 className="mb-3 text-[14px] font-semibold text-ink">Уведомления</h2>
      {notifications.length === 0 ? (
        <p className="text-[12.5px] text-muted">Пока ничего не отправлялось.</p>
      ) : (
        <ul className="grid gap-2.5 text-[12.5px]">
          {notifications.map((notification) => (
            <li key={notification.id} className="grid gap-0.5">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-ink">{NOTIFICATION_KIND_LABELS[notification.kind]}</span>
                <span
                  className={cn(
                    'font-semibold whitespace-nowrap',
                    notification.status === NotificationStatus.Failed && 'text-alert',
                    notification.status === NotificationStatus.Skipped && 'text-faint',
                    notification.status === NotificationStatus.Sent && 'text-accent-hover',
                  )}
                >
                  {NOTIFICATION_STATUS_LABELS[notification.status]}
                </span>
              </span>
              <span className="text-[12px] text-faint">
                {notification.at}
                {notification.detail ? ` · ${notification.detail}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
