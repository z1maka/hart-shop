import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { COMPANY } from '@/config/company'
import { HEADER_CHANNELS } from '@/config/contact'
import {
  CUSTOM_ORDER_FAQ_KEYS,
  CUSTOM_ORDER_ITEM_COVERS,
  CUSTOM_ORDER_ITEM_IDS,
  CUSTOM_ORDER_STEP_KEYS,
  type CustomOrderItemId,
} from '@/config/custom-order'
import { getProductCover } from '@/features/catalog'
import { CustomOrderForm, type CustomOrderItem } from '@/features/enquiries/ui/CustomOrderForm'

const FORM_ANCHOR = 'zayavka'
const HERO_ITEM: CustomOrderItemId = 'tent'
const FACT_KEYS = ['workshop', 'single', 'quote'] as const

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('customOrderPage.meta')

  return {
    title: t('title'),
    description: t('description'),
    alternates: { canonical: '/poshyv-na-zamovlennya/' },
    openGraph: { title: t('title'), description: t('description'), type: 'website' },
  }
}

// The page the catalogue sends anyone whose size, pattern or piece it does
// not carry. It answers three things in order — do you make it, how does it
// work, what will it cost me to ask — and then takes the request.
export default async function CustomOrderPage({
  searchParams,
}: PageProps<'/poshyv-na-zamovlennya'>) {
  const t = await getTranslations('customOrderPage')

  return (
    <div className="pb-14">
      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] items-center gap-9 px-7 py-12">
        <div>
          <p className="mb-5 inline-block rounded-pill bg-accent-soft px-3.5 py-2 text-[12px] font-semibold tracking-[0.04em] text-accent-hover">
            {t('kicker')}
          </p>
          <h1 className="mb-4 max-w-[18ch] font-display text-display font-bold text-balance text-ink">
            {t('title')}
          </h1>
          <p className="mb-6 max-w-[52ch] text-[16.5px] leading-relaxed text-pretty text-muted">
            {t('lead')}
          </p>

          <ul className="mb-7 flex flex-wrap gap-2">
            {FACT_KEYS.map((key) => (
              <li
                key={key}
                className="rounded-pill border border-accent-edge bg-surface px-3.5 py-1.5 text-[12.5px] font-medium text-ink"
              >
                {t(`facts.${key}`)}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <a href={`#${FORM_ANCHOR}`}>{t('heroCta')}</a>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <a href={COMPANY.phoneHref}>{t('callCta')}</a>
            </Button>
          </div>
        </div>

        <Suspense fallback={<Skeleton className="aspect-5/4 w-full rounded-card" />}>
          <HeroImage alt={t('title')} />
        </Suspense>
      </section>

      <section className="border-t border-subtle bg-surface px-7 py-12">
        <h2 className="mb-2.5 font-display text-h2 font-bold text-ink">{t('whatTitle')}</h2>
        <p className="mb-7 max-w-[62ch] text-[14.5px] leading-relaxed text-muted">{t('whatLead')}</p>
        <Suspense fallback={<CardsSkeleton />}>
          <ItemCards />
        </Suspense>
      </section>

      <section className="px-7 py-12">
        <h2 className="mb-2.5 font-display text-h2 font-bold text-ink">{t('howTitle')}</h2>
        <p className="mb-7 max-w-[62ch] text-[14.5px] leading-relaxed text-muted">{t('howLead')}</p>
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-5">
          {CUSTOM_ORDER_STEP_KEYS.map((key, index) => (
            <li key={key} className="rounded-card border border-subtle bg-surface p-5">
              <span className="mb-3 inline-flex size-8 items-center justify-center rounded-pill bg-ink font-display text-[14px] font-bold text-on-dark">
                {index + 1}
              </span>
              <h3 className="mb-1.5 text-[13.5px] font-semibold text-ink">
                {t(`steps.${key}.title`)}
              </h3>
              <p className="text-[12.5px] leading-relaxed text-muted">{t(`steps.${key}.body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id={FORM_ANCHOR} className="scroll-mt-24 border-t border-subtle bg-surface px-7 py-12">
        <div className="flex flex-wrap items-start gap-8">
          <div className="min-w-[min(100%,320px)] flex-[999_1_460px]">
            <h2 className="mb-2.5 font-display text-h2 font-bold text-ink">{t('formTitle')}</h2>
            <p className="mb-6 max-w-[56ch] text-[14.5px] leading-relaxed text-muted">
              {t('formLead')}
            </p>
            <Suspense fallback={<Skeleton className="h-[560px] w-full rounded-card" />}>
              <RequestPanel searchParams={searchParams} />
            </Suspense>
          </div>

          <aside className="min-w-[min(100%,280px)] flex-[1_1_300px]">
            <div className="rounded-card border border-subtle bg-raised p-5">
              <h3 className="mb-3 text-[14px] font-semibold text-ink">{t('channelsTitle')}</h3>
              <p className="mb-4 text-[12.5px] leading-relaxed text-muted">{t('channelsLead')}</p>
              <div className="grid gap-2">
                <a
                  href={COMPANY.phoneHref}
                  className="text-[13.5px] font-semibold text-accent-hover hover:underline"
                >
                  {COMPANY.phone}
                </a>
                {HEADER_CHANNELS.filter((channel) => channel.key === 'telegram').map((channel) => (
                  <a
                    key={channel.key}
                    href={channel.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13.5px] font-semibold text-accent-hover hover:underline"
                  >
                    Telegram
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="px-7 py-12">
        <h2 className="mb-6 font-display text-h2 font-bold text-ink">{t('faqTitle')}</h2>
        <div className="grid gap-3">
          {CUSTOM_ORDER_FAQ_KEYS.map((key) => (
            <details key={key} className="rounded-card border border-subtle bg-surface px-5 py-4">
              <summary className="cursor-pointer list-none text-[14px] font-semibold text-ink">
                {t(`faq.${key}.question`)}
              </summary>
              <p className="mt-2.5 max-w-[68ch] text-[13.5px] leading-relaxed text-muted">
                {t(`faq.${key}.answer`)}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}

async function HeroImage({ alt }: { readonly alt: string }) {
  const cover = await getProductCover(CUSTOM_ORDER_ITEM_COVERS[HERO_ITEM])

  if (!cover) return null

  return (
    <div className="relative aspect-5/4 overflow-hidden rounded-card bg-sunken">
      <Image
        src={cover.url}
        alt={alt}
        fill
        priority
        sizes="(min-width: 1024px) 520px, 100vw"
        className="object-cover"
      />
    </div>
  )
}

// A card per thing the workshop sews. Clicking one opens this same page with
// that choice already made in the form below.
async function ItemCards() {
  const t = await getTranslations('customOrderPage.items')
  const covers = await Promise.all(
    CUSTOM_ORDER_ITEM_IDS.map((id) => getProductCover(CUSTOM_ORDER_ITEM_COVERS[id])),
  )

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-5">
      {CUSTOM_ORDER_ITEM_IDS.map((id, index) => {
        const cover = covers[index]

        return (
          <Link
            key={id}
            href={`/poshyv-na-zamovlennya/?item=${id}#${FORM_ANCHOR}`}
            className="group overflow-hidden rounded-card border border-subtle bg-raised transition-colors hover:border-accent"
          >
            <div className="relative aspect-4/3 bg-sunken">
              {cover ? (
                <Image
                  src={cover.url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 280px, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : null}
            </div>
            <div className="p-5">
              <h3 className="mb-1.5 text-[14px] font-semibold text-ink">{t(`${id}.title`)}</h3>
              <p className="text-[12.5px] leading-relaxed text-muted">{t(`${id}.body`)}</p>
              <p className="mt-3 text-[12.5px] font-semibold text-accent-hover">{t('cta')} →</p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-5">
      {CUSTOM_ORDER_ITEM_IDS.map((id) => (
        <Skeleton key={id} className="h-80 w-full rounded-card" />
      ))}
    </div>
  )
}

// Only the form waits on the query string; the rest of the page is served
// from the cache.
async function RequestPanel({
  searchParams,
}: {
  searchParams: PageProps<'/poshyv-na-zamovlennya'>['searchParams']
}) {
  const t = await getTranslations('customOrderPage.items')
  const params = await searchParams
  const requested = typeof params.item === 'string' ? params.item : null
  const fromProduct = typeof params.from === 'string' ? params.from.slice(0, 200) : null

  const items: CustomOrderItem[] = CUSTOM_ORDER_ITEM_IDS.map((id) => ({
    id,
    label: t(`${id}.chip`),
  }))
  const initialItem = CUSTOM_ORDER_ITEM_IDS.find((id) => id === requested) ?? HERO_ITEM

  return <CustomOrderForm items={items} initialItem={initialItem} fromProduct={fromProduct} />
}
