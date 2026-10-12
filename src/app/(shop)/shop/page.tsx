import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Skeleton } from '@/components/ui/Skeleton'
import { getCategories } from '@/features/catalog'
import { CatalogBrowser, type ShopSearchParams } from '@/features/catalog/ui/CatalogBrowser'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta')

  return {
    title: t('shop.title'),
    description: t('shop.description'),
    alternates: {
      // Canonical mirrors the indexed WordPress URL, trailing slash included.
      canonical: '/shop/',
    },
  }
}

export default async function ShopIndexPage({ searchParams }: PageProps<'/shop'>) {
  const pageT = await getTranslations('shopPage')
  const navT = await getTranslations('nav')

  return (
    <div className="px-7 pt-9 pb-14">
      <Breadcrumbs
        className="mb-3.5"
        items={[{ label: navT('home'), href: '/' }, { label: navT('allProducts') }]}
      />
      <header className="mb-7">
        <h1 className="mb-2.5 font-display text-h1 font-bold text-ink">{pageT('title')}</h1>
        <p className="max-w-[64ch] text-[14.5px] leading-relaxed text-muted">{pageT('lead')}</p>
      </header>

      <Suspense fallback={<Skeleton className="h-[560px] w-full rounded-card" />}>
        <CatalogContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function CatalogContent({ searchParams }: { searchParams: Promise<ShopSearchParams> }) {
  const categories = await getCategories()

  return <CatalogBrowser categorySlug={null} categories={categories} searchParams={searchParams} />
}
