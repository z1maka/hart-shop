import type { Metadata } from 'next'
import Image from 'next/image'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { getCategoryCover } from '@/features/catalog'
import { getActiveBankAccount } from '@/features/billing'
import { getTranslations } from 'next-intl/server'
import { COMPANY } from '@/config/company'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta')

  return {
    title: t('about.title'),
    description: t('about.description'),
    alternates: {
      // Canonical mirrors the indexed WordPress URL, trailing slash included.
      canonical: '/about-us/',
    },
  }
}

const FACT_KEYS = ['founded', 'production', 'model', 'range'] as const
const SHORT_FACT_KEYS: ReadonlySet<string> = new Set(['founded', 'production'])

const BLOCK_KEYS = ['started', 'inHouse', 'designed', 'euRange'] as const

export default async function AboutPage() {
  const t = await getTranslations('about')

  return (
    <div>
      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] items-center gap-9 px-7 py-12">
        <div>
          <p className="mb-5 inline-block border-l-[3px] border-khaki-mark bg-sunken px-3.5 py-2 font-display text-[12.5px] font-semibold tracking-[0.12em] text-accent">
            {t('badge')}
          </p>
          <h1 className="mb-4 max-w-[19ch] font-display text-[clamp(2rem,4.2vw,3rem)] leading-[1.04] font-bold text-balance text-ink">
            {t('title')}
          </h1>
          <p className="max-w-[56ch] text-[15px] leading-relaxed text-pretty text-muted">
            {t('lead')}
          </p>

          {/* Dark tiles on a 1px seam, as the design draws the facts; the
              short ones read as Oswald figures, the long ones as text. */}
          <dl className="mt-7 grid grid-cols-1 gap-px overflow-hidden rounded-card bg-dark-line min-[420px]:grid-cols-2">
            {FACT_KEYS.map((key) => (
              <div key={key} className="bg-header p-4">
                <dt className="text-[12px] text-on-dark-muted">{t(`facts.${key}.label`)}</dt>
                <dd
                  className={
                    SHORT_FACT_KEYS.has(key)
                      ? 'mt-1 font-display text-[22px] font-semibold text-khaki'
                      : 'mt-1 text-[14px] font-bold text-on-dark'
                  }
                >
                  {t(`facts.${key}.value`)}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <Suspense fallback={<Skeleton className="aspect-5/4 w-full rounded-card" />}>
          <WorkshopImage />
        </Suspense>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5 px-7 pb-12">
        {BLOCK_KEYS.map((key) => (
          <article key={key} className="rounded-card border border-subtle bg-surface p-6">
            <h2 className="mb-2.5 font-display text-[20px] font-bold tracking-[0.04em] text-ink">
              {t(`blocks.${key}.heading`)}
            </h2>
            <p className="text-[13.5px] leading-relaxed text-muted">{t(`blocks.${key}.body`)}</p>
          </article>
        ))}
      </section>

      <section className="px-7 pb-14">
        <div className="rounded-card border border-subtle bg-surface p-6">
          <h2 className="mb-2.5 font-display text-[18px] font-bold tracking-[-0.01em] text-ink">
            {t('docsTitle')}
          </h2>
          <p className="max-w-[72ch] text-[13.5px] leading-relaxed text-muted">{t('docsBody')}</p>
        </div>
      </section>

      <section id="seller" className="scroll-mt-28 px-7 pb-14">
        <div className="rounded-card border border-subtle bg-surface p-6">
          <h2 className="mb-3.5 font-display text-[20px] font-bold tracking-[0.04em] text-ink">
            {t('sellerTitle')}
          </h2>
          <dl className="grid gap-2 text-[13.5px] sm:grid-cols-[max-content_1fr] sm:gap-x-6">
            <dt className="text-muted">{t('sellerName')}</dt>
            <dd className="font-semibold text-ink">{COMPANY.legalName}</dd>
            <dt className="text-muted">{t('sellerTaxId')}</dt>
            <dd className="text-ink">{COMPANY.taxId}</dd>
            <Suspense fallback={null}>
              <SellerAccount />
            </Suspense>
            <dt className="text-muted">{t('sellerPhone')}</dt>
            <dd>
              <a href={COMPANY.phoneHref} className="text-accent hover:underline">
                {COMPANY.phone}
              </a>
            </dd>
            <dt className="text-muted">{t('sellerEmail')}</dt>
            <dd>
              <a href={`mailto:${COMPANY.email}`} className="text-accent hover:underline">
                {COMPANY.email}
              </a>
            </dd>
          </dl>
        </div>
      </section>
    </div>
  )
}

// The account the shop invoices to, as the owner set it in the admin; the
// rows are left out until one is stored. The payee is named from the account
// itself: the owner may switch to an account held by another ФОП, and the
// seller's name above must not pass for the account holder.
async function SellerAccount() {
  const [requisites, t] = await Promise.all([getActiveBankAccount(), getTranslations('about')])
  if (!requisites) return null

  return (
    <>
      <dt className="text-muted">{t('sellerPayee')}</dt>
      <dd className="text-ink">
        {requisites.recipient} · {requisites.taxId}
      </dd>
      <dt className="text-muted">{t('sellerIban')}</dt>
      <dd className="font-mono tracking-[0.02em] break-all text-ink">{requisites.ibanGrouped}</dd>
      <dt className="text-muted">{t('sellerBank')}</dt>
      <dd className="text-ink">
        {requisites.bankName}, {t('sellerMfo')} {requisites.mfo}
      </dd>
    </>
  )
}

async function WorkshopImage() {
  const cover = await getCategoryCover('anti-dronovi-nakidki')

  if (!cover) return <Skeleton className="aspect-5/4 w-full rounded-card" />

  return (
    <div className="relative aspect-5/4 overflow-hidden rounded-card bg-sunken shadow-hero">
      <Image
        src={cover.url}
        alt={cover.alt}
        fill
        sizes="(min-width: 1024px) 620px, 100vw"
        className="object-cover"
      />
    </div>
  )
}
