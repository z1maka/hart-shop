import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { StreamedPageBody } from '@/components/layout/StreamedPageBody'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { getCheckoutAvailability, QuickOrderPanel } from '@/features/checkout'
import { getCart, type CartView } from '@/features/cart'
import { getCartCompanions, getFeaturedProducts } from '@/features/catalog'
import { ProductGrid } from '@/features/catalog/ui/ProductGrid'
import { CartLineControls } from '@/features/cart/ui/CartLineControls'

const CART_COMPANION_COUNT = 3

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta')

  return {
    title: t('cart.title'),
    robots: { index: false, follow: false },
  }
}

export default async function CartPage() {
  const t = await getTranslations('cart')

  return (
    <div className="px-7 py-10">
      {/* The way back to the catalogue is a quiet text link beside the title,
          as the Гарт design sets it: there for whoever wants to add one more
          thing, without competing with the order panel below. */}
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-h1 font-bold text-ink">{t('title')}</h1>
        <Link href="/shop/" className="text-[13.5px] font-bold text-accent hover:text-ink">
          {t('continueShopping')}
        </Link>
      </div>
      <StreamedPageBody>
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
          <CartContents />
        </Suspense>
      </StreamedPageBody>
    </div>
  )
}

async function CartContents() {
  const [cart, t] = await Promise.all([getCart(), getTranslations('cart')])

  if (!cart || cart.lines.length === 0) {
    return <EmptyCart />
  }

  // On a wide screen the order panel spans both rows, so the companions fill
  // the column under a short list instead of leaving it empty; on a phone they
  // come after the panel and never push the phone field down.
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_1fr]">
      <div className="overflow-hidden rounded-card border border-subtle bg-raised">
        {cart.lines.map((line) => (
          <article
            key={line.id}
            className="flex flex-wrap items-center gap-4 border-b border-subtle p-4 last:border-b-0"
          >
            <Link
              href={`/product/${line.productSlug}/`}
              className="relative size-24 shrink-0 overflow-hidden rounded-chip bg-sunken"
            >
              {line.imageUrl ? (
                <Image
                  src={line.imageUrl}
                  alt={line.title}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : null}
            </Link>

            <div className="min-w-40 flex-1">
              <Link
                href={`/product/${line.productSlug}/`}
                className="text-[15px] font-extrabold text-ink hover:text-accent"
              >
                {line.title}
              </Link>
              <p className="mt-1 text-[12.5px] text-muted">{line.variantLabel}</p>
              {line.isWholesalePrice ? (
                <span className="mt-1.5 inline-block rounded-chip bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">
                  {t('wholesaleTag')}
                </span>
              ) : null}
              {line.wholesaleHint ? (
                <p className="mt-1.5 text-[12px] leading-relaxed font-semibold text-khaki-ink">
                  {t('wholesaleHint', {
                    min: line.wholesaleHint.minQuantity,
                    price: line.wholesaleHint.unitPriceLabel,
                    missing: line.wholesaleHint.missing,
                  })}
                </p>
              ) : null}
              {/* For a single piece the unit price repeats the line total. */}
              {line.quantity > 1 ? (
                <p className="mt-0.5 text-[12px] text-faint">
                  {t('eachPlain', { price: line.unitPriceLabel })}
                </p>
              ) : null}
            </div>

            <CartLineControls itemId={line.id} quantity={line.quantity} />

            <div className="w-24 text-right font-display text-[18px] font-semibold text-ink">
              {line.linePriceLabel}
            </div>
          </article>
        ))}
      </div>

      <CartSummaryPanel cart={cart} />
      <CartCompanions productSlugs={[...new Set(cart.lines.map((line) => line.productSlug))]} />
    </div>
  )
}

async function CartCompanions({ productSlugs }: { readonly productSlugs: readonly string[] }) {
  const [companions, t] = await Promise.all([
    getCartCompanions(productSlugs, CART_COMPANION_COUNT),
    getTranslations('pdp'),
  ])

  if (companions.length === 0) return null

  return (
    <section className="lg:col-start-1">
      <h2 className="mb-4 font-display text-h3 font-bold text-ink">{t('companions')}</h2>
      <ProductGrid products={companions} layout="compact" />
    </section>
  )
}

async function EmptyCart() {
  const [picks, t] = await Promise.all([getFeaturedProducts(3), getTranslations('cart')])

  return (
    <div className="flex flex-col gap-9">
      <div className="rounded-card border border-subtle bg-surface p-12 text-center">
        <h2 className="mb-2.5 font-display text-h2 font-bold text-ink">{t('emptyTitle')}</h2>
        <p className="mb-5 text-[14.5px] text-muted">{t('emptyLead')}</p>
        <Button asChild>
          <Link href="/shop/">{t('browse')}</Link>
        </Button>
      </div>

      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2.5">
          <h3 className="font-display text-h3 font-bold text-ink">{t('startWith')}</h3>
          <Link href="/shop/" className="text-[13.5px] font-bold text-accent hover:text-ink">
            {t('allProducts')}
          </Link>
        </div>
        <ProductGrid products={picks} layout="compact" />
      </section>
    </div>
  )
}

async function CartSummaryPanel({ cart }: { cart: CartView }) {
  const t = await getTranslations('cart')
  const { isCardPaymentAvailable } = await getCheckoutAvailability()

  return (
    <aside className="flex flex-col gap-3.5 lg:col-start-2 lg:row-span-2 lg:row-start-1">
      <dl className="grid gap-2 rounded-card border border-subtle bg-raised p-5 text-[14px]">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">{t('totalItems', { count: cart.itemCount })}</dt>
          <dd className="font-bold text-ink">{cart.subtotalLabel}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">{t('deliveryRow')}</dt>
          <dd className="text-right text-ink">{t('deliveryByCarrier')}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-subtle pt-2.5">
          <dt className="font-extrabold text-ink">{t('toPay')}</dt>
          <dd className="font-display text-[22px] font-bold text-ink">{cart.subtotalLabel}</dd>
        </div>
      </dl>

      {/* Anchored: the mini-cart and the product page send a buyer straight
          to the phone field rather than through the full checkout. */}
      <div id="quick" className="scroll-mt-24">
        <QuickOrderPanel
          totalLabel={cart.subtotalLabel}
          totalCents={cart.subtotal.amountCents}
          analyticsItems={cart.lines.map((line) => ({
            sku: line.sku,
            title: line.title,
            priceCents: line.unitPrice.amountCents,
            quantity: line.quantity,
            categorySlug: null,
          }))}
          isCardPaymentAvailable={isCardPaymentAvailable}
        />
      </div>
      <p className="text-[12px] leading-relaxed text-faint">{t('deliveryNote')}</p>
    </aside>
  )
}
