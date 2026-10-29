import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { JsonLd } from '@/components/JsonLd'
import { Button } from '@/components/ui/Button'
import { CUSTOM_ORDER_HREF } from '@/config/custom-order'
import { FABRIC_LAYERS } from '@/config/fabric-layers'
import { CONTACT_CHANNELS } from '@/config/contact'
import { COMPANY } from '@/config/company'
import {
  HOME_FABRIC_GUIDE_HREF,
  HOME_FACT_KEYS,
  HERO_PHOTO,
  HOME_FAQ_KEYS,
  HOME_FEATURED_COUNT,
  HOME_STARLINK_CHOOSER,
  HOME_STARLINK_GUIDE_HREF,
  HOME_TILES,
  type HomeTileImage,
} from '@/config/home'
import { GUIDES } from '@/content/guides'
import {
  FaqList,
  getCategoryCover,
  getFeaturedProducts,
  getProductCover,
  getPublishedProductSlugs,
  ProductCard,
  ProductRail,
} from '@/features/catalog'
import { logger } from '@/lib/logger'
import { faqJsonLd, organizationJsonLd, websiteJsonLd } from '@/lib/seo'
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

// The hero fills one of two columns from 772px up (340px minimum per column
// plus the gap) inside the 1440px shell with 28px page padding. A fixed
// 620px here made retina screens fetch the 1600px original for a 540px box.
const HERO_IMAGE_SIZES =
  '(min-width: 1440px) 674px, (min-width: 772px) calc(50vw - 46px), calc(100vw - 56px)'

const SECTION_TITLE = 'font-display text-h2 font-bold text-ink'
const SECTION_LEAD = 'max-w-[62ch] text-[14.5px] leading-relaxed text-muted'
const TEXT_LINK = 'text-[13.5px] font-bold text-accent hover:text-ink'

export default async function HomePage() {
  const t = await getTranslations('home')
  const faq = HOME_FAQ_KEYS.map((key) => ({
    question: t(`faq.${key}.question`),
    answer: t(`faq.${key}.answer`),
  }))

  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd(), faqJsonLd(faq)]} />
      <Hero />
      <FactStrip />
      <HideTiles />
      <section className="border-y border-subtle bg-surface px-7 py-12">
        <SectionHead title={t('starlink.title')} lead={t('starlink.lead')} />
        {/* Cached, so no boundary: a finished one this far down is moved to
            the end of the HTML, where crawlers that run no scripts read the
            terminal choice and the best-sellers' prices last, hidden. */}
        <StarlinkChooser />
        <p className="mt-5">
          <Link href={HOME_STARLINK_GUIDE_HREF} className={TEXT_LINK}>
            {t('starlink.guide')}
          </Link>
        </p>
      </section>
      <ProofSection />
      <section className="border-y border-subtle bg-surface px-7 py-12">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2.5">
          <h2 className={SECTION_TITLE}>{t('bestSellers')}</h2>
          <Link href="/shop/" className={TEXT_LINK}>
            {t('browseAll')}
          </Link>
        </div>
        <FeaturedProducts />
      </section>
      <UnitsBand />
      <GuidesSection />
      <section className="grid gap-x-12 gap-y-6 border-t border-subtle bg-surface px-7 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <FaqAside />
        <FaqList entries={faq} />
      </section>
    </>
  )
}

function SectionHead({ title, lead }: { readonly title: string; readonly lead: string }) {
  return (
    <div className="mb-6">
      <h2 className={cn(SECTION_TITLE, 'mb-2.5')}>{title}</h2>
      <p className={SECTION_LEAD}>{lead}</p>
    </div>
  )
}

async function Hero() {
  const t = await getTranslations('home')

  return (
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
            <Link href="/shop/">{t('shopCta')}</Link>
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="border-ink bg-transparent hover:bg-ink hover:text-on-dark"
            asChild
          >
            <Link href="/about-us/">{t('aboutCta')}</Link>
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

      <HeroImage cardTitle={t('heroCardTitle')} cardSub={t('heroCardSub')} />
    </section>
  )
}

type HeroImageProps = {
  readonly cardTitle: string
  readonly cardSub: string
}

function HeroImage({ cardTitle, cardSub }: HeroImageProps) {
  return (
    <div className="relative">
      <div className="relative aspect-5/4 overflow-hidden rounded-card bg-sunken shadow-hero">
        <Image
          src={HERO_PHOTO.url}
          alt={HERO_PHOTO.alt}
          fill
          sizes={HERO_IMAGE_SIZES}
          // The page's LCP. `priority` is deprecated in Next 16 and only adds a
          // preload link without a fetch priority; the <img> is already in the
          // HTML, so a high fetch priority is all it needs.
          loading="eager"
          fetchPriority="high"
          className="object-cover object-[center_40%]"
        />
      </div>
      <div className="absolute bottom-4.5 left-4.5 rounded-control border-l-[3px] border-khaki bg-header px-4 py-3 shadow-float">
        <p className="text-[13px] font-bold text-on-dark">{cardTitle}</p>
        <p className="mt-0.5 text-[12px] text-on-dark-muted">{cardSub}</p>
      </div>
    </div>
  )
}

// The mosaic: the first tile is large, the last one runs wide, so four photos
// never line up as a plain row of equal cards.
const TILE_LAYOUT = [
  'sm:col-span-2 lg:col-span-2 lg:row-span-2',
  '',
  '',
  'sm:col-span-2 lg:col-span-2',
] as const

const TILE_SIZES = [
  '(min-width: 1024px) 50vw, 100vw',
  '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw',
  '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw',
  '(min-width: 1024px) 50vw, 100vw',
] as const

async function HideTiles() {
  const t = await getTranslations('home')

  return (
    <section className="px-7 py-12">
      <h2 className={cn(SECTION_TITLE, 'mb-6')}>{t('tilesTitle')}</h2>
      <ul className="grid auto-rows-[260px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HOME_TILES.map((tile, index) => (
          <li key={tile.key} className={TILE_LAYOUT[index]}>
            <Link
              href={tile.href}
              className="group relative block h-full overflow-hidden rounded-card bg-sunken"
            >
              <Suspense fallback={null}>
                <TileImage source={tile.image} sizes={TILE_SIZES[index] ?? '100vw'} />
              </Suspense>
              <div className="absolute right-4 bottom-4 left-4 max-w-[40ch] rounded-control border-l-[3px] border-khaki bg-header px-4 py-3 shadow-float">
                <p className="font-display text-[18px] font-bold tracking-[0.04em] text-on-dark">
                  {t(`tiles.${tile.key}.title`)} →
                </p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-on-dark-muted">
                  {t(`tiles.${tile.key}.body`)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

async function TileImage({ source, sizes }: { readonly source: HomeTileImage; readonly sizes: string }) {
  const image = await tileImageOf(source)
  if (!image) return null

  return (
    <Image
      src={image.url}
      alt={image.alt}
      fill
      sizes={sizes}
      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
    />
  )
}

async function tileImageOf(source: HomeTileImage): Promise<{ url: string; alt: string } | null> {
  if (source.kind === 'photo') return source
  if (source.kind === 'product') return getProductCover(source.slug)
  return getCategoryCover(source.slug)
}

const TELEGRAM_HREF = CONTACT_CHANNELS.find((channel) => channel.key === 'telegram')?.href

async function FaqAside() {
  const t = await getTranslations('home')

  return (
    <div>
      <h2 className={cn(SECTION_TITLE, 'mb-2.5')}>{t('faqTitle')}</h2>
      <p className={SECTION_LEAD}>{t('faqLead')}</p>
      <div className="mt-5 flex flex-wrap gap-2.5">
        {TELEGRAM_HREF ? (
          <Button variant="secondary" asChild>
            <a href={TELEGRAM_HREF} target="_blank" rel="noopener">
              {t('faqTelegram')}
            </a>
          </Button>
        ) : null}
        <Button variant="secondary" asChild>
          <a href={COMPANY.phoneHref}>{t('faqCall')}</a>
        </Button>
      </div>
    </div>
  )
}

// What the delivery page explains at length, said once in a line.
async function FactStrip() {
  const t = await getTranslations('home')

  return (
    <section aria-label={t('factsLabel')} className="border-y border-subtle bg-surface px-7 py-4">
      <ul className="flex flex-wrap gap-x-7 gap-y-2.5">
        {HOME_FACT_KEYS.map((key) => (
          <li key={key} className="flex items-center gap-2 text-[13px] font-bold text-ink">
            <span className="size-2 bg-khaki-mark" aria-hidden />
            {t(`facts.${key}`)}
          </li>
        ))}
      </ul>
    </section>
  )
}

// A configured product that is no longer published leaves its block quietly
// for the buyer, loudly for the owner.
function reportMissing(block: string, expected: readonly string[], found: ReadonlySet<string>): void {
  const missing = expected.filter((slug) => !found.has(slug))
  if (missing.length > 0) logger.error('Home block points at unpublished products', { block, missing })
}

async function StarlinkChooser() {
  const t = await getTranslations('home')
  const published = new Set(await getPublishedProductSlugs())
  reportMissing(
    'starlink',
    HOME_STARLINK_CHOOSER.flatMap((column) => column.options.map((option) => option.slug)),
    published,
  )

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-5">
      {HOME_STARLINK_CHOOSER.map((column) => (
        <div key={column.key} className="rounded-card border border-subtle bg-raised p-5">
          <h3 className="text-[15px] font-bold text-ink">{t(`starlink.columns.${column.key}.title`)}</h3>
          <p className="mt-1 text-[12.5px] text-muted">{t(`starlink.columns.${column.key}.note`)}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {column.options
              .filter((option) => published.has(option.slug))
              .map((option) => (
                <li key={option.key}>
                  <Link
                    href={`/product/${option.slug}/`}
                    className="inline-block rounded-chip border border-strong px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-ink hover:bg-sunken"
                  >
                    {t(`starlink.options.${option.key}`)}
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

async function ProofSection() {
  const t = await getTranslations('home')
  const layersT = await getTranslations('fabricLayers')

  return (
    <section className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-9 px-7 py-12">
      <div>
        <h2 className={cn(SECTION_TITLE, 'mb-2.5')}>{t('proof.title')}</h2>
        <p className={SECTION_LEAD}>{t('proof.body')}</p>
      </div>
      <div>
        <h3 className="text-[15px] font-bold text-ink">{t('proof.fabricTitle')}</h3>
        <p className="mt-1 mb-4 text-[12.5px] text-muted">{t('proof.fabricLead')}</p>
        <ol className="overflow-hidden rounded-card border border-subtle">
          {FABRIC_LAYERS.map((layer) => (
            <li key={layer.number} className="flex items-stretch border-b border-subtle last:border-b-0">
              <span className={cn('w-3 shrink-0', layer.swatchClass)} aria-hidden />
              <div className="px-4 py-3">
                <p className="text-[13.5px] font-bold text-ink">
                  <span className="font-display text-khaki-ink">{layer.number}</span> ·{' '}
                  {layersT(`${layer.number}.title`)}
                </p>
                <p className="mt-0.5 text-[12px] text-faint">{layersT(`${layer.number}.spec`)}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4">
          <Link href={HOME_FABRIC_GUIDE_HREF} className={TEXT_LINK}>
            {t('proof.guide')}
          </Link>
        </p>
      </div>
    </section>
  )
}

// No priority here: the row sits well below the fold, and an eager fetch would
// compete with the hero image for the same connection.
async function FeaturedProducts() {
  const products = await getFeaturedProducts(HOME_FEATURED_COUNT)

  return (
    <ProductRail>
      {products.map((product) => (
        <ProductCard key={product.slug} product={product} layout="compact" />
      ))}
    </ProductRail>
  )
}

const UNIT_POINT_KEYS = ['wholesale', 'invoice', 'custom'] as const

// Units, funds and anyone buying in batches: the wholesale terms and the
// custom workshop in one place.
async function UnitsBand() {
  const t = await getTranslations('home')

  return (
    <section className="px-7 py-12">
      <div className="flex flex-wrap items-center gap-x-9 gap-y-6 rounded-card bg-header px-7 py-8">
        <div className="min-w-[min(100%,300px)] flex-[999_1_420px]">
          <h2 className="mb-2.5 font-display text-h2 font-bold text-on-dark">{t('units.title')}</h2>
          <p className="max-w-[62ch] text-[14.5px] leading-relaxed text-on-dark-muted">{t('units.lead')}</p>
          <ul className="mt-4 grid gap-2">
            {UNIT_POINT_KEYS.map((key) => (
              <li key={key} className="flex gap-2.5 text-[13.5px] leading-relaxed text-on-dark">
                <span className="mt-2 size-1.5 shrink-0 bg-khaki" aria-hidden />
                {t(`units.points.${key}`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex min-w-[min(100%,260px)] flex-[1_1_260px] flex-col gap-2.5">
          <Button size="lg" variant="khaki" asChild>
            <Link href={CUSTOM_ORDER_HREF}>{t('units.customCta')}</Link>
          </Button>
          <Button size="lg" variant="outlineOnDark" asChild>
            <Link href="/contact/">{t('units.contactCta')}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

async function GuidesSection() {
  const t = await getTranslations('home')

  return (
    <section className="px-7 pb-12">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2.5">
        <div>
          <h2 className={cn(SECTION_TITLE, 'mb-2.5')}>{t('guidesTitle')}</h2>
          <p className={SECTION_LEAD}>{t('guidesLead')}</p>
        </div>
        <Link href="/guides/" className={TEXT_LINK}>
          {t('guidesAll')}
        </Link>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-4">
        {GUIDES.map((guide) => (
          <li key={guide.slug}>
            <Link
              href={`/guides/${guide.slug}/`}
              className="block h-full rounded-card border border-subtle bg-surface p-5 transition-colors hover:border-strong"
            >
              <h3 className="text-[14.5px] leading-snug font-bold text-ink">{guide.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{guide.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
