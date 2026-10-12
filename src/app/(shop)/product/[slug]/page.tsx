import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { Suspense } from 'react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { TrustRow } from '@/components/layout/TrustRow'
import { Badge } from '@/components/ui/Badge'
import { Price } from '@/components/ui/Price'
import { NovaPoshtaMark } from '@/components/ui/NovaPoshtaMark'
import { Skeleton } from '@/components/ui/Skeleton'
import { SpecTable } from '@/components/ui/SpecTable'
import { FABRIC_LAYERS } from '@/config/fabric-layers'
import { SelectedColorProvider } from '@/components/ui/SelectedColor'
import {
  coverIndexByColor,
  getArchivedProductDestination,
  getProductBySlug,
  getPublishedProductSlugs,
  getCompanionProducts,
  GalleryVideoControlProvider,
  ProductGallery,
  ProductGrid,
  WatchVideoButton,
  type ProductDetailView,
  type WholesaleView,
} from '@/features/catalog'
import { getProductQuantityInCart } from '@/features/cart'
import { AddToCartForm } from '@/features/cart/ui/AddToCartForm'
import { OWN_PRODUCTION_CATEGORY_SLUGS } from '@/config/catalog'
import { CUSTOM_ORDER_HREF, type CustomOrderItemId } from '@/config/custom-order'
import { CustomOrderNote } from '@/features/enquiries/ui/CustomOrderCta'
import { TrackEventOnce, type AnalyticsItem } from '@/features/analytics'
import { formatMoney } from '@/lib/money'
import { getProductReviewsOrNone, ProductRatingLine, ReviewsSection } from '@/features/reviews'
import { breadcrumbJsonLd, productJsonLd, videoJsonLd } from '@/lib/seo'
import { siteConfig } from '@/config/site'
import {
  featuredVideoOf,
  isoDuration,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
} from '@/features/catalog/model/product-video'
import { requestedColorOf } from '@/features/catalog/model/requested-color'
import { cn } from '@/lib/utils'
import { decodeSlugParam } from '@/lib/slug'
import { getTranslations } from 'next-intl/server'

const RELATED_COUNT = 4

export async function generateStaticParams() {
  const slugs = await getPublishedProductSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: PageProps<'/product/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(decodeSlugParam(slug))

  if (!product) {
    const t = await getTranslations('pdp')
    return { title: t('notFoundTitle') }
  }

  return {
    title: product.seoTitle,
    description: product.seoDescription,
    alternates: {
      // Canonical mirrors the indexed WordPress URL, trailing slash included.
      canonical: `/product/${product.slug}/`,
    },
    openGraph: {
      title: product.seoTitle,
      description: product.seoDescription,
      type: 'website',
      images: product.images[0] ? [{ url: product.images[0].url }] : undefined,
    },
  }
}

// The product is read here, before anything streams: once the response has
// begun, notFound() can no longer set the status, and an unknown slug would
// answer 200 with the not-found page — a soft 404 Google keeps in the index.
// What it reads is handed down, so the page resolves the slug once.
export default async function ProductPage({ params, searchParams }: PageProps<'/product/[slug]'>) {
  const { slug } = await params
  const decodedSlug = decodeSlugParam(slug)
  const product = await getProductBySlug(decodedSlug)

  if (!product) {
    const destination = await getArchivedProductDestination(decodedSlug)
    if (destination) permanentRedirect(destination)
    notFound()
  }

  return <ProductDetail product={product} searchParams={searchParams} />
}

// Enough reviews for the rich result; the page itself lists them all.
const STRUCTURED_REVIEW_COUNT = 5

async function ProductDetail({
  product,
  searchParams,
}: {
  product: ProductDetailView
  searchParams: PageProps<'/product/[slug]'>['searchParams']
}) {
  const [t, navT, layersT, { summary: ratingSummary, reviews }] = await Promise.all([
    getTranslations('pdp'),
    getTranslations('nav'),
    getTranslations('fabricLayers'),
    getProductReviewsOrNone(product.slug),
  ])
  const featuredVideo = featuredVideoOf(product.videos)

  return (
    <article className="pb-14">
      <JsonLd
        data={[
          productJsonLd({
            slug: product.slug,
            title: product.title,
            description: product.seoDescription,
            sku: product.sku,
            price: product.price,
            weightGrams: product.weightGrams,
            imageUrls: product.images.map((image) => image.url),
            inStock: product.stockTotal > 0,
            colors: product.variants.map((variant) => variant.color),
            rating:
              ratingSummary.count > 0
                ? { average: ratingSummary.average, count: ratingSummary.count }
                : null,
            reviews: reviews.slice(0, STRUCTURED_REVIEW_COUNT).map((review) => ({
              author: review.authorName,
              rating: review.rating,
              body: review.body,
              date: review.dateIso,
            })),
          }),
          breadcrumbJsonLd([
            { name: navT('home'), path: '/' },
            { name: navT('allProducts'), path: '/shop/' },
            { name: product.categoryName, path: `/product-category/${product.categorySlug}/` },
            { name: product.title, path: `/product/${product.slug}/` },
          ]),
          ...product.videos.map((video) =>
            videoJsonLd({
              name: video.caption,
              description: `${video.caption}. ${product.title}, ${siteConfig.name}.`,
              thumbnailUrl: youtubeThumbnailUrl(video.youtubeId),
              uploadDate: video.uploadDate,
              duration: isoDuration(video.durationSeconds),
              embedUrl: youtubeEmbedUrl(video.youtubeId),
            }),
          ),
        ]}
      />

      <Breadcrumbs
        className="px-7 pt-7"
        items={[
          { label: navT('home'), href: '/' },
          { label: navT('allProducts'), href: '/shop' },
          { label: product.categoryName, href: `/product-category/${product.categorySlug}` },
        ]}
      />

      {/* Two independent columns on a wide screen — photos with the specs
          under them, the buy panel with the description under it. A grid row
          would hold the description back until the gallery ended, leaving a
          hole beside the buy panel. On a phone the wrappers vanish
          (display: contents) and `order` gives the reading order: photos,
          buy, description, specs. */}
      <SelectedColorProvider>
        <GalleryVideoControlProvider>
          <div
            className={cn(
              'grid gap-9 px-7 pt-6 pb-11',
              'lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start',
            )}
          >
            <div className="contents lg:block">
              <div className="order-1 min-w-0 lg:order-none">
                <ProductGallery
                  images={product.images}
                  title={product.title}
                  coverIndexByColor={coverIndexByColor(product.variants)}
                  videos={product.videos}
                />
              </div>

              {product.specs.length > 0 ? (
                <section className="order-4 min-w-0 rounded-card border border-subtle bg-surface p-6 lg:order-none lg:mt-9">
                  <h2 className="mb-3 font-display text-[22px] font-bold tracking-[0.04em] text-ink">
                    {t('specification')}
                  </h2>
                  <SpecTable rows={product.specs} />
                </section>
              ) : null}
            </div>

            <div className="contents lg:block">
              <div className="order-2 min-w-0 lg:order-none">
                <Suspense fallback={<Skeleton className="h-[560px] w-full rounded-card" />}>
                  <BuyPanel product={product} searchParams={searchParams} />
                </Suspense>
              </div>

              {product.description ? (
                <section id="description" className="order-3 min-w-0 lg:order-none lg:mt-9">
                  <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <h2 className="font-display text-[22px] font-bold tracking-[0.04em] text-ink">
                      {t('description')}
                    </h2>
                    {featuredVideo ? <WatchVideoButton video={featuredVideo} /> : null}
                  </div>
                  <p className="max-w-[62ch] text-[14.5px] leading-relaxed text-pretty break-words whitespace-pre-line text-muted">
                    {product.description}
                  </p>
                </section>
              ) : null}
            </div>
          </div>
        </GalleryVideoControlProvider>
      </SelectedColorProvider>

      <div className="flex flex-wrap gap-6 px-7 pb-11">
        {product.layers > 1 ? (
          <section className="min-w-[min(100%,320px)] flex-[1_1_380px] rounded-card border border-subtle bg-surface p-6">
            <h2 className="mb-4 font-display text-[22px] font-bold tracking-[0.04em] text-ink">
              {t('fabricLayers')}
            </h2>
            <div className="grid gap-3">
              {FABRIC_LAYERS.slice(0, product.layers).map((layer) => (
                <div key={layer.number} className="grid grid-cols-[56px_1fr] items-center gap-3.5">
                  <div className={cn('h-8.5 rounded-chip', layer.swatchClass)} aria-hidden />
                  <div>
                    <p className="text-[13.5px] font-bold text-ink">
                      <span className="font-display text-khaki-ink">{layer.number}</span>{' '}
                      {layersT(`${layer.number}.title`)}
                    </p>
                    <p className="text-[12px] leading-relaxed text-muted">
                      {layersT(`${layer.number}.body`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {product.included.length > 0 || product.careNotes.length > 0 ? (
        <div className="flex flex-wrap gap-6 px-7 pb-11">
          {product.included.length > 0 ? (
            <section className="min-w-[min(100%,320px)] flex-[1_1_380px] rounded-card border border-subtle bg-surface p-6">
              <h2 className="mb-3 font-display text-[22px] font-bold tracking-[0.04em] text-ink">
                {t('inTheBox')}
              </h2>
              <ul className="grid gap-2 text-[13.5px] text-muted">
                {product.included.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-1.5 size-2 shrink-0 bg-khaki-mark" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {product.careNotes.length > 0 ? (
            <section className="min-w-[min(100%,320px)] flex-[1_1_380px] rounded-card border border-subtle bg-surface p-6">
              <h2 className="mb-3 font-display text-[22px] font-bold tracking-[0.04em] text-ink">
                {t('careAndLimits')}
              </h2>
              <ul className="grid gap-2 text-[13.5px] text-muted">
                {product.careNotes.map((note) => (
                  <li key={note} className="flex items-start gap-2.5">
                    <span className="mt-1.5 size-2 shrink-0 bg-strong" aria-hidden />
                    {note}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      <div className="px-7 pb-11">
        <Suspense fallback={<Skeleton className="h-80 w-full rounded-card" />}>
          <ReviewsSection productSlug={product.slug} />
        </Suspense>
      </div>

      <div className="px-7 pb-11">
        <CustomOrderNote />
      </div>

      <section className="px-7">
        <h2 className="mb-4.5 font-display text-h2 font-bold text-ink">{t('companions')}</h2>
        <Suspense fallback={<Skeleton className="h-80 w-full rounded-card" />}>
          <RelatedProducts categorySlug={product.categorySlug} slug={product.slug} />
        </Suspense>
      </section>
    </article>
  )
}

// Reading searchParams here would turn the whole panel into a dynamic hole and
// the price would arrive after the rest of the page. Only the colour picker
// needs the query string, so only it waits.
async function BuyPanel({
  product,
  searchParams,
}: {
  product: ProductDetailView
  searchParams: PageProps<'/product/[slug]'>['searchParams']
}) {
  const t = await getTranslations('pdp')
  const customItem = customOrderItemOf(product)

  return (
    <div>
      <p className="mb-2.5 font-display text-[12.5px] font-semibold tracking-[0.14em] text-khaki-ink">
        {product.kicker}
      </p>
      <h1 className="mb-2.5 font-display text-[clamp(1.75rem,3.2vw,2.375rem)] leading-[1.08] font-bold tracking-[0.01em] text-balance text-ink">
        {product.title}
      </h1>
      <Suspense fallback={null}>
        <ProductRatingLine slug={product.slug} />
      </Suspense>

      {/* Price right under the name, then straight to the choice and the
          button: the long description waits below the panel. */}
      <div className="mb-1.5 flex flex-wrap items-baseline gap-3.5">
        <Price money={product.price} compareAt={product.regularPrice} size="lg" />
        <Badge tone="accent">{t('codBadge')}</Badge>
      </div>
      {product.wholesale ? <WholesaleLine wholesale={product.wholesale} /> : null}
      <p className="mb-1 text-[12px] leading-relaxed text-faint">{t('priceNote')}</p>
      {OWN_PRODUCTION_CATEGORY_SLUGS.includes(product.categorySlug) ? (
        <p className="mb-1 text-[12px] leading-relaxed text-faint">{t('makerNote')}</p>
      ) : null}
      <p className="mb-5 flex items-center gap-2 text-[12.5px] font-medium text-muted">
        <NovaPoshtaMark size={22} />
        {t('deliveryLine')}
      </p>

      {product.summary ? (
        <p className="mb-5 max-w-[54ch] text-[14.5px] leading-relaxed text-pretty whitespace-pre-line text-ink">
          {product.summary}
        </p>
      ) : null}

      <TrackEventOnce event={{ name: 'view_item', item: toAnalyticsItem(product) }} />

      <div className="mb-3">
        <Suspense fallback={<Skeleton className="h-[184px] w-full rounded-card" />}>
          <VariantPicker product={product} searchParams={searchParams} />
        </Suspense>
      </div>

      {/* Right under the choice, where someone finds their size missing — but
          only for the pieces the workshop actually sews to order. A poncho is
          made to one pattern, and offering to change it would be a promise
          nobody keeps. */}
      {customItem ? (
        <p className="mb-5 text-[12.5px] leading-relaxed text-muted">
          <Link
            href={`${CUSTOM_ORDER_HREF}?item=${customItem}&from=${encodeURIComponent(product.title)}`}
            className="font-semibold text-accent underline-offset-4 hover:underline"
          >
            {t('customLine')}
          </Link>
        </p>
      ) : null}

      <TrustRow />
    </div>
  )
}

// The volume price right under the retail one, the way marketplaces print
// it: one quiet line instead of a table. The counter under the button says
// how many units are still missing.
async function WholesaleLine({ wholesale }: { readonly wholesale: WholesaleView }) {
  const t = await getTranslations('pdp.wholesale')

  return (
    <p className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] text-muted">
      <span>{t('line', { min: wholesale.minQuantity })}</span>
      <span className="font-semibold text-ink tabular-nums">{formatMoney(wholesale.price)}</span>
      <span>{t('perUnit')}</span>
      {wholesale.discountPercent > 0 ? (
        <span className="rounded-chip bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent">
          −{wholesale.discountPercent}%
        </span>
      ) : null}
    </p>
  )
}

async function VariantPicker({
  product,
  searchParams,
}: {
  product: ProductDetailView
  searchParams: PageProps<'/product/[slug]'>['searchParams']
}) {
  const [requested, inCartQuantity] = await Promise.all([
    searchParams,
    getProductQuantityInCart(product.slug),
  ])

  return (
    <AddToCartForm
      variants={product.variants}
      priceLabel={formatMoney(product.price)}
      inCartQuantity={inCartQuantity}
      wholesale={
        product.wholesale
          ? {
              minQuantity: product.wholesale.minQuantity,
              priceLabel: formatMoney(product.wholesale.price),
            }
          : null
      }
      initialColor={requestedColorOf(
        requested,
        product.variants.map((variant) => variant.color),
      )}
      analyticsItem={toAnalyticsItem(product)}
    />
  )
}

async function RelatedProducts({ categorySlug, slug }: { categorySlug: string; slug: string }) {
  const related = await getCompanionProducts(categorySlug, slug, RELATED_COUNT)

  if (related.length === 0) return null

  return <ProductGrid products={related} />
}

// Which chip the form should open on — and whether to offer custom work on
// this page at all. Tents and covers are made to order; the rest of the
// catalogue is sewn to a fixed pattern.
function customOrderItemOf(product: ProductDetailView): CustomOrderItemId | null {
  const haystack = `${product.categorySlug} ${product.title}`.toLowerCase()
  if (haystack.includes('tent') || haystack.includes('тент')) return 'tent'
  if (haystack.includes('chokh') || haystack.includes('чохол') || haystack.includes('чохл')) {
    return 'cover'
  }

  return null
}

function toAnalyticsItem(product: ProductDetailView): AnalyticsItem {
  return {
    sku: product.sku,
    title: product.title,
    priceCents: product.price.amountCents,
    quantity: 1,
    categorySlug: product.categorySlug,
  }
}
