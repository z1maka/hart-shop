import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { getTranslations } from 'next-intl/server'
import { TrackEventOnce } from '@/features/analytics'
import { BankTransferDetails, getOrderByToken } from '@/features/orders'
import { OrderTimeline } from '@/features/orders/ui/OrderTimeline'

export const metadata: Metadata = {
  title: 'Ваше замовлення',
  robots: { index: false, follow: false },
}

export default function OrderPage({ params }: PageProps<'/order/[token]'>) {
  return (
    <div className="px-7 py-12">
      <Suspense fallback={<Skeleton className="h-96 w-full max-w-5xl rounded-card" />}>
        <OrderDetail params={params} />
      </Suspense>
    </div>
  )
}

async function OrderDetail({ params }: { params: PageProps<'/order/[token]'>['params'] }) {
  const { token } = await params
  const order = await getOrderByToken(token)

  if (!order) notFound()

  const t = await getTranslations('orderPage')

  return (
    <article className="max-w-5xl">
      <p className="mb-2 text-[12.5px] font-semibold text-accent">
        {t('kicker', { number: order.orderNumber })}
      </p>
      <h1 className="mb-2.5 font-display text-h1 font-bold text-ink">{t('title')}</h1>
      <ContactNote email={order.email} phone={order.address.phone ?? null} />

      <TrackEventOnce
        dedupeKey={`hart_purchase_${order.orderNumber}`}
        event={{
          name: 'purchase',
          orderNumber: order.orderNumber,
          items: order.analyticsItems,
          valueCents: order.totalCents,
          shippingCents: order.shippingCents,
          taxCents: 0,
          customer: order.customer,
          orderToken: token,
        }}
      />

      {order.isParcelReturning ? (
        <section className="mb-6 rounded-card border border-alert-edge bg-alert-soft p-6">
          <h2 className="mb-2 font-display text-h3 font-bold text-alert">{t('returningTitle')}</h2>
          <p className="max-w-[70ch] text-[13.5px] leading-relaxed text-alert">
            {t('returningNote')}
            {order.isPrepaid ? ` ${t('returningRefund')}` : ''}
          </p>
        </section>
      ) : null}

      {order.isAwaitingTransfer ? (
        <BankTransferDetails
          amountLabel={order.totalLabel}
          amountCents={order.totalCents}
          paymentPurpose={order.paymentPurpose}
          requisites={order.transferRequisites}
        />
      ) : null}

      <section className="mb-6 rounded-card border border-subtle bg-surface p-6">
        <h2 className="mb-5 font-display text-h3 font-bold text-ink">{t('statusTitle')}</h2>
        <OrderTimeline steps={order.timeline} />
      </section>

      <div className="flex flex-wrap items-stretch gap-6">
        <section className="min-w-[min(100%,340px)] flex-[1.3_1_440px] rounded-card border border-subtle bg-surface p-6">
          <h2 className="mb-4 font-display text-h3 font-bold text-ink">{t('whatYouOrdered')}</h2>
          <ul className="flex flex-col gap-3">
            {order.lines.map((line) => (
              <li key={line.id} className="flex flex-wrap justify-between gap-3 text-[14px]">
                <span className="max-w-[46ch] text-ink">
                  {line.quantity} × {line.title}
                  {line.variantLabel ? (
                    <span className="block text-[12.5px] text-muted">{line.variantLabel}</span>
                  ) : null}
                </span>
                <span className="font-semibold text-ink">{line.linePriceLabel}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-5 flex flex-col gap-2 border-t border-subtle pt-4 text-[14px]">
            <Row label={t('items')} value={order.subtotalLabel} />
            <Row
              label={t('delivery', { carrier: order.carrierName })}
              value={order.shippingLabel}
            />
            <Row label={t('totalPaid')} value={order.totalLabel} isStrong />
          </dl>

          <p className="mt-4 text-[12.5px] leading-relaxed text-muted">{t('totalNote')}</p>
        </section>

        <section className="min-w-[min(100%,300px)] flex-[1_1_320px] rounded-card border border-subtle bg-surface p-6">
          <div>
            <h2 className="mb-3 font-display text-h3 font-bold text-ink">{t('deliveryTitle')}</h2>
            <address className="text-[14px] leading-relaxed text-muted not-italic">
              <span className="font-semibold text-ink">{order.address.fullName}</span>
              {order.address.phone ? (
                <>
                  <br />
                  {order.address.phone}
                </>
              ) : null}
              {order.address.line1 ? (
                <>
                  <br />
                  {order.address.line1}
                </>
              ) : null}
              {order.address.line2 ? (
                <>
                  <br />
                  {order.address.line2}
                </>
              ) : null}
              <br />
              {order.address.city}
            </address>
            {order.trackingNumber ? (
              <TrackingLine
                label={t('trackingNumber')}
                number={order.trackingNumber}
                url={order.trackingUrl}
              />
            ) : null}
          </div>

          <div className="mt-5 border-t border-subtle pt-5">
            <h2 className="mb-2 font-display text-h3 font-bold text-ink">{t('paymentTitle')}</h2>
            <p className="text-[13.5px] leading-relaxed text-muted">
              {paymentLabel(order.paymentRoute, t)}
            </p>
          </div>
        </section>
      </div>
    </article>
  )
}

function paymentLabel(
  route: string,
  t: Awaited<ReturnType<typeof getTranslations<'orderPage'>>>,
): string {
  return t.has(`payment.${route}`) ? t(`payment.${route}`) : route
}

// Without an email there is no confirmation letter; the phone becomes the
// contact line — the quick-order buyer sees when and why the shop will call.
async function ContactNote({ email, phone }: { email: string | null; phone: string | null }) {
  const t = await getTranslations('orderPage')

  if (email) {
    return <p className="mb-8 text-[13.5px] text-muted">{t('contactEmail', { email })}</p>
  }
  if (phone) {
    return (
      <p className="mb-8 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        {t('callbackNote', { phone })}
      </p>
    )
  }
  return null
}

function Row({ label, value, isStrong }: { label: string; value: string; isStrong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={isStrong ? 'font-semibold text-ink' : 'text-ink'}>{value}</dd>
    </div>
  )
}

// The number links to the carrier's tracking once a waybill exists; a number
// typed in by hand without a link is still shown.
function TrackingLine({
  label,
  number,
  url,
}: {
  readonly label: string
  readonly number: string
  readonly url: string | null
}) {
  return (
    <p className="mt-3 text-[13px] text-ink">
      {label}{' '}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="font-semibold underline underline-offset-4"
        >
          {number}
        </a>
      ) : (
        <strong>{number}</strong>
      )}
    </p>
  )
}
