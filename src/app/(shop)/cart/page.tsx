import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { getCheckoutAvailability, QuickOrderPanel } from '@/features/checkout'
import { getCart, type CartView } from '@/features/cart'
import { getFeaturedProducts } from '@/features/catalog'
import { ProductGrid } from '@/features/catalog/ui/ProductGrid'
import { CartLineControls } from '@/features/cart/ui/CartLineControls'

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
      {/* No "continue shopping" link: the cart is the last step before paying,
          and a way back to the catalogue here costs more orders than it adds.
          The empty cart has its own way to the catalogue. */}
      <h1 className="mb-6 font-display text-h1 font-bold text-ink">{t('title')}</h1>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
        <CartContents />
      </Suspense>
    </div>
  )
}

async function CartContents() {
  const [cart, t] = await Promise.all([getCart(), getTranslations('cart')])

  if (!cart || cart.lines.length === 0) {
    return <EmptyCart />
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="min-w-[min(100%,320px)] flex-[999_1_520px] rounded-card border border-subtle bg-surface">
        {cart.lines.map((line) => (
          <article
            key={line.id}
            className="flex flex-wrap items-center gap-4 border-b border-subtle p-4 last:border-b-0"
          >
            <Link
              href={`/product/${line.productSlug}`}
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
                href={`/product/${line.productSlug}`}
                className="text-[15px] font-semibold text-ink hover:text-accent-hover"
              >
                {line.title}
              </Link>
              <p className="mt-1 text-[12.5px] text-muted">{line.variantLabel}</p>
              {line.isWholesalePrice ? (
                <span className="mt-1.5 inline-block rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-hover">
                  {t('wholesaleTag')}
                </span>
              ) : null}
              {line.wholesaleHint ? (
                <p className="mt-1.5 text-[12px] leading-relaxed text-accent-hover">
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

            <div className="w-24 text-right text-[15px] font-semibold text-ink">
              {line.linePriceLabel}
            </div>
          </article>
        ))}
      </div>

      <CartSummaryPanel cart={cart} />
    </div>
  )
}

async function EmptyCart() {
  const [picks, t] = await Promise.all([getFeaturedProducts(3), getTranslations('cart')])

  return (
    <div className="flex flex-col gap-9">
      <div className="rounded-card border border-subtle bg-surface p-12 text-center">
        <h2 className="mb-2.5 font-display text-h3 font-bold text-ink">{t('emptyTitle')}</h2>
        <p className="mb-5 text-[14.5px] text-muted">{t('emptyLead')}</p>
        <Button asChild>
          <Link href="/shop">{t('browse')}</Link>
        </Button>
      </div>

      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2.5">
          <h3 className="font-display text-h3 font-bold text-ink">{t('startWith')}</h3>
          <Link
            href="/shop"
            className="text-[13px] font-semibold text-accent-hover hover:underline"
          >
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
    <aside className="flex min-w-[min(100%,320px)] flex-[1_1_320px] flex-col gap-4 rounded-card border border-subtle bg-surface p-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[16px] font-semibold text-ink">
            {t('totalItems', { count: cart.itemCount })}
          </span>
          <span className="font-display text-[22px] font-bold text-ink">{cart.subtotalLabel}</span>
        </div>
        <p className="text-[12.5px] leading-relaxed text-muted">{t('deliveryNote')}</p>
      </div>

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
    </aside>
  )
}
