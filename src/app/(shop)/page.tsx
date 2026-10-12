import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { JsonLd } from '@/components/JsonLd'
import { TrustRow } from '@/components/layout/TrustRow'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { HERO_PRODUCT_SLUG, ROLE_CARD_COVERS } from '@/config/catalog'
import { FABRIC_LAYERS } from '@/config/fabric-layers'
import {
  getCategories,
  getCategoryCover,
  getFeaturedProducts,
  getProductCover,
  ProductCard,
  ProductRail,
} from '@/features/catalog'
import { CUSTOM_ORDER_HREF } from '@/config/custom-order'
import { CustomOrderBand } from '@/features/enquiries/ui/CustomOrderCta'
import { logger } from '@/lib/logger'
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo'
import { cn } from '@/lib/utils'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta')

  // The home page names what the shop sells; the site name alone, which the
  // layout's template would give, says nothing to a search result.
  return {
    title: { absolute: t('home.title') },
    description: t('home.description'),
    alternates: { canonical: '/' },
  }
}

const FEATURED_COUNT = 8

// The hero fills one of two columns from 772px up (340px minimum per column
// plus the gap) inside the 1440px shell with 28px page padding. A fixed
// 620px here made retina screens fetch the 1600px original for a 540px box.
const HERO_IMAGE_SIZES =
  '(min-width: 1440px) 674px, (min-width: 772px) calc(50vw - 46px), calc(100vw - 56px)'

const ROLE_CARD_SLUGS = ['anti-dronovi-nakidki', 'чохли-для-starlink', 'sholomi-bronepliti'] as const

const DELIVERY_CARD_KEYS = ['branch', 'locker', 'courier'] as const

export default async function HomePage() {
  const t = await getTranslations('home')
  const layersT = await getTranslations('fabricLayers')
  const deliveryT = await getTranslations('deliveryPage')

  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />

      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] items-center gap-9 px-7 py-13">
        <div>
          <p className="mb-5 inline-block border-l-[3px] border-khaki-mark bg-sunken px-3.5 py-2 font-display text-[12.5px] font-semibold tracking-[0.12em] text-accent">
            {t('badge')}
          </p>
          <h1 className="mb-4.5 max-w-[16ch] font-display text-display font-bold text-balance text-ink">
            {t('title')}
          </h1>
          <p className="mb-7 max-w-[50ch] text-[16.5px] leading-relaxed text-pretty text-muted">
            {t('lead')}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/shop">{t('shopCta')}</Link>
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="border-ink bg-transparent hover:bg-ink hover:text-on-dark"
              asChild
            >
              <Link href="/about-us">{t('aboutCta')}</Link>
            </Button>
          </div>
          {/* On the first screen, where someone who needs their own size is
              still deciding whether this shop can help at all. */}
          <p className="mt-4 text-[13.5px] text-muted">
            <Link href={CUSTOM_ORDER_HREF} className="font-bold text-accent hover:text-ink">
              {t('customCta')}
            </Link>
          </p>
        </div>

        <Suspense fallback={<Skeleton className="aspect-5/4 w-full rounded-card" />}>
          <HeroImage cardTitle={t('heroCardTitle')} cardSub={t('heroCardSub')} />
        </Suspense>
      </section>

      <section className="px-7 pb-14">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2.5">
          <div>
            <p className="mb-1 text-[13px] font-bold text-khaki-ink">{t('whatConcealing')}</p>
            <h2 className="font-display text-h2 font-bold text-ink">{t('chooseByTask')}</h2>
          </div>
          <Link href="/shop" className="text-[13.5px] font-bold text-accent hover:text-ink">
            {t('browseAll')}
          </Link>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
          {ROLE_CARD_SLUGS.map((slug) => (
            <Suspense key={slug} fallback={<Skeleton className="h-[380px] rounded-card" />}>
              <RoleCard
                categorySlug={slug}
                title={t(`roles.${slug}.title`)}
                body={t(`roles.${slug}.body`)}
              />
            </Suspense>
          ))}
        </div>
      </section>

      <section className="border-y border-subtle bg-surface px-7 py-12">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2.5">
          <h2 className="font-display text-h2 font-bold text-ink">{t('bestSellers')}</h2>
          <Link href="/shop" className="text-[13.5px] font-bold text-accent hover:text-ink">
            {t('browseAll')}
          </Link>
        </div>
        <Suspense fallback={<Skeleton className="h-[420px] rounded-card" />}>
          <FeaturedProducts />
        </Suspense>
      </section>

      <section className="px-7 py-12">
        <h2 className="mb-2.5 font-display text-h2 font-bold text-ink">{t('fabricTitle')}</h2>
        <p className="mb-6 max-w-[60ch] text-[14.5px] leading-relaxed text-muted">
          {t('fabricLead')}
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
          {FABRIC_LAYERS.map((layer) => (
            <article
              key={layer.number}
              className="rounded-card border border-subtle bg-surface p-5"
            >
              <div className={cn('mb-4 h-9 rounded-chip', layer.swatchClass)} aria-hidden />
              <h3 className="text-[13.5px] font-extrabold text-ink">
                <span className="font-display text-khaki-ink">{layer.number}</span> ·{' '}
                {layersT(`${layer.number}.title`)}
              </h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                {layersT(`${layer.number}.body`)}
              </p>
              <p className="mt-2.5 text-[12px] text-faint">{layersT(`${layer.number}.spec`)}</p>
            </article>
          ))}
        </div>
      </section>

      <CustomOrderBand />

      <section className="border-t border-subtle bg-surface px-7 py-12">
        <h2 className="mb-6 font-display text-h2 font-bold text-ink">{t('deliveryTitle')}</h2>
        <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
          {DELIVERY_CARD_KEYS.map((key) => (
            <article key={key} className="rounded-card border border-subtle bg-raised p-5">
              <DeliveryKindIcon kind={key} />
              <h3 className="mt-3 text-[13.5px] font-extrabold text-ink">
                {deliveryT(`shipping.${key}.heading`)}
              </h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                {deliveryT(`shipping.${key}.body`)}
              </p>
            </article>
          ))}
        </div>
        <div className="border-t border-subtle pt-5">
          <TrustRow />
        </div>
      </section>
    </>
  )
}


type HeroImageProps = {
  readonly cardTitle: string
  readonly cardSub: string
}

async function HeroImage({ cardTitle, cardSub }: HeroImageProps) {
  const cover =
    (await getProductCover(HERO_PRODUCT_SLUG)) ?? (await getCategoryCover('anti-dronovi-nakidki'))

  if (!cover) return <Skeleton className="aspect-5/4 w-full rounded-card" />

  return (
    <div className="relative">
      <div className="relative aspect-5/4 overflow-hidden rounded-card bg-sunken shadow-hero">
        <Image
          src={cover.url}
          alt={cover.alt}
          fill
          sizes={HERO_IMAGE_SIZES}
          priority
          className="object-cover object-[center_22%]"
        />
      </div>
      <div className="absolute bottom-4.5 left-4.5 rounded-control border-l-[3px] border-khaki bg-header px-4 py-3 shadow-float">
        <p className="text-[13px] font-bold text-on-dark">{cardTitle}</p>
        <p className="mt-0.5 text-[12px] text-on-dark-muted">{cardSub}</p>
      </div>
    </div>
  )
}

type RoleCardProps = {
  readonly categorySlug: string
  readonly title: string
  readonly body: string
}

async function RoleCard({ categorySlug, title, body }: RoleCardProps) {
  const [cover, categories] = await Promise.all([
    ROLE_CARD_COVERS[categorySlug] ?? getCategoryCover(categorySlug),
    getCategories(),
  ])

  // A card pointing at a category that no longer exists would be a silent 404,
  // so it stays off the page and says so in the log instead.
  if (!categories.some((category) => category.slug === categorySlug)) {
    logger.error('Home role card points at a missing category', { categorySlug })
    return null
  }

  return (
    <Link
      href={`/product-category/${categorySlug}`}
      className="block overflow-hidden rounded-card border border-subtle bg-surface transition-shadow hover:border-strong hover:shadow-card"
    >
      <div className="relative aspect-4/3 bg-sunken">
        {cover ? (
          <Image
            src={cover.url}
            alt={cover.alt}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="px-5 pt-4.5 pb-5.5">
        <h3 className="mb-1.5 font-display text-[20px] font-semibold tracking-[0.04em] text-ink">
          {title}
        </h3>
        <p className="text-[13.5px] leading-relaxed text-muted">{body}</p>
      </div>
    </Link>
  )
}

// No priority here: the row sits well below the fold, and an eager fetch would
// compete with the hero image for the same connection.
async function FeaturedProducts() {
  const products = await getFeaturedProducts(FEATURED_COUNT)

  return (
    <ProductRail>
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} layout="compact" />
      ))}
    </ProductRail>
  )
}

const DELIVERY_ICON_PATHS: Record<(typeof DELIVERY_CARD_KEYS)[number], string> = {
  branch: 'M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6',
  locker: 'M4 3h16v18H4zM4 9h16M4 15h16M12 3v18',
  courier: 'M3 6h11v10H3zM14 10h4l3 3v3h-7M7.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
}

function DeliveryKindIcon({ kind }: { readonly kind: (typeof DELIVERY_CARD_KEYS)[number] }) {
  return (
    <span className="flex size-10 items-center justify-center rounded-control bg-accent-soft text-accent">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d={DELIVERY_ICON_PATHS[kind]}
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
