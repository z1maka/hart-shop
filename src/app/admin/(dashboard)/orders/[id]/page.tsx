import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DeliveryKind, NotificationStatus } from '@/db/enums'
import { getAdminOrderView } from '@/features/admin/queries/get-admin-desk'
import {
  NOTIFICATION_KIND_LABELS,
  NOTIFICATION_STATUS_LABELS,
} from '@/features/admin/ui/notification-labels'
import type { AdminNotificationView } from '@/features/orders/queries/get-admin-order'
import { OrderActionsPanel } from '@/features/admin/ui/OrderActionsPanel'
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
        <div className="grid min-w-[min(100%,340px)] flex-[999_1_460px] gap-4">
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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr className="text-left text-[12px] text-muted">
                    <th className="pb-2 font-semibold">Товар</th>
                    <th className="pb-2 font-semibold">Артикул</th>
                    <th className="pb-2 text-right font-semibold">Кол-во</th>
                    <th className="pb-2 text-right font-semibold">Сумма</th>
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
                      <td className="py-2.5 text-right text-muted">{line.quantity}</td>
                      <td className="py-2.5 text-right font-semibold whitespace-nowrap">
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
            </dl>
          </section>

          <section className="rounded-card border border-subtle bg-surface p-5">
            <h2 className="mb-3 text-[14px] font-semibold text-ink">Покупатель и доставка</h2>
            <dl className="grid gap-1.5 text-[13.5px]">
              <Row label="Получатель" value={order.address.fullName} />
              {order.email ? <Row label="Почта" value={order.email} /> : null}
              {order.address.phone ? <Row label="Телефон" value={order.address.phone} /> : null}
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

        <aside className="grid min-w-[min(100%,300px)] flex-[1_1_320px] gap-4">
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

function Row({ label, value, isStrong }: { label: string; value: string; isStrong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={isStrong ? 'font-semibold text-ink' : 'text-right text-ink'}>{value}</dd>
    </div>
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
