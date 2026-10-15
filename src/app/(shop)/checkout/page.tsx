import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { StreamedPageBody } from '@/components/layout/StreamedPageBody'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { getCart, type CartView } from '@/features/cart'
import { CheckoutFlow, getCheckoutAvailability } from '@/features/checkout'
import { formatMoney } from '@/lib/money'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta')

  return {
    title: t('checkout.title'),
    robots: { index: false, follow: false },
  }
}

export default async function CheckoutPage() {
  const t = await getTranslations('checkout')

  return (
    <div className="px-7 py-10">
      <h1 className="mb-6 font-display text-h1 font-bold text-ink">{t('title')}</h1>
      <StreamedPageBody>
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
          <CheckoutContents />
        </Suspense>
      </StreamedPageBody>
    </div>
  )
}

async function CheckoutContents() {
  const cart = await getCart()

  if (!cart || cart.lines.length === 0) {
    redirect('/cart/')
  }

  const availability = await getCheckoutAvailability()

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="min-w-[min(100%,320px)] flex-[999_1_560px] rounded-card border border-subtle bg-raised p-6">
        <CheckoutFlow
          totalLabel={formatMoney(cart.subtotal)}
          totalCents={cart.subtotal.amountCents}
          analyticsItems={cart.lines.map((line) => ({
            sku: line.sku,
            title: line.title,
            priceCents: line.unitPrice.amountCents,
            quantity: line.quantity,
            categorySlug: null,
          }))}
          cardProviders={availability.cardProviders}
          pickupCarriers={availability.pickupCarriers}
          isBankTransferAvailable={availability.isBankTransferAvailable}
          parcelWeightGrams={cart.weightGrams}
        />
      </div>

      <OrderSummary cart={cart} />
    </div>
  )
}

async function OrderSummary({ cart }: { cart: CartView }) {
  const t = await getTranslations('checkout')

  return (
    <aside className="min-w-[min(100%,300px)] flex-[1_1_320px] rounded-card border border-subtle bg-surface p-5.5">
      <h2 className="mb-4 font-display text-[16px] font-semibold tracking-[0.08em] text-ink">
        {t('summary.yourOrder')}
      </h2>

      <div className="grid gap-3.5 border-b border-subtle pb-4">
        {cart.lines.map((line) => (
          <div key={line.id} className="flex items-center gap-3">
            <span className="relative size-12 shrink-0 overflow-hidden rounded-control bg-sunken">
              {line.imageUrl ? (
                <Image src={line.imageUrl} alt="" fill sizes="48px" className="object-cover" />
              ) : null}
            </span>
            <span className="flex-1">
              <span className="block text-[13.5px] font-bold text-ink">{line.title}</span>
              <span className="mt-0.5 block text-[12px] text-faint">
                {[line.variantLabel, t('summary.pcs', { count: line.quantity })]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
            <span className="text-[13.5px] font-semibold text-ink">
              {formatMoney(line.linePrice)}
            </span>
          </div>
        ))}
      </div>

      <dl className="grid gap-2 py-4 text-[13.5px]">
        <div className="flex justify-between">
          <dt className="text-muted">{t('summary.subtotal')}</dt>
          <dd className="font-bold text-ink">{formatMoney(cart.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">{t('summary.shipping')}</dt>
          <dd className="text-ink">{t('summary.carrierTariff')}</dd>
        </div>
      </dl>

      <Button variant="secondary" className="w-full" asChild>
        <Link href="/cart/">{t('summary.backToCart')}</Link>
      </Button>
    </aside>
  )
}
