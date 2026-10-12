import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { Skeleton } from '@/components/ui/Skeleton'
import { decodeSlugParam } from '@/lib/slug'
import { getCategories, type CategoryView } from '@/features/catalog'
import { CatalogBrowser } from '@/features/catalog/ui/CatalogBrowser'
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/seo'
import { CategoryStory } from '@/features/catalog/ui/CategoryStory'
import { GuideLinks } from '@/features/catalog/ui/GuideLinks'

type CategoryParams = PageProps<'/product-category/[slug]'>['params']
type CategorySearchParams = PageProps<'/product-category/[slug]'>['searchParams']

export async function generateStaticParams() {
  const categories = await getCategories()
  return categories.map((category) => ({ slug: category.slug }))
}

export async function generateMetadata({
  params,
}: PageProps<'/product-category/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const categories = await getCategories()
  const match = categories.find((entry) => entry.slug === decodeSlugParam(slug))

  if (!match) return { title: 'Shop' }

  return {
    title: match.seoTitle,
    description: match.seoDescription,
    alternates: {
      // Canonical mirrors the indexed WordPress URL, trailing slash included.
      canonical: `/product-category/${match.slug}/`,
    },
  }
}

// Checked before the first byte: after that notFound() cannot set the status
// and an unknown category would answer 200 — a soft 404 for the crawler.
export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<'/product-category/[slug]'>) {
  const { slug } = await params
  const categories = await getCategories()
  const activeCategory = categories.find((entry) => entry.slug === decodeSlugParam(slug))

  if (!activeCategory) notFound()

  return (
    <div className="px-7 pt-9 pb-14">
      <CategoryHeader category={activeCategory} />

      <Suspense fallback={<Skeleton className="h-[560px] w-full rounded-card" />}>
        <CategoryCatalog params={params} searchParams={searchParams} />
      </Suspense>

      {activeCategory.story.length > 0 || activeCategory.faq.length > 0 ? (
        <>
          {activeCategory.faq.length > 0 ? <JsonLd data={faqJsonLd(activeCategory.faq)} /> : null}
          <CategoryStory story={activeCategory.story} faq={activeCategory.faq} />
        </>
      ) : null}
      <GuideLinks categorySlug={activeCategory.slug} />
    </div>
  )
}

async function CategoryHeader({ category: activeCategory }: { category: CategoryView }) {
  const navT = await getTranslations('nav')

  return (
    <header className="mb-7">
      <Breadcrumbs
        className="mb-3.5"
        items={[
          { label: navT('home'), href: '/' },
          { label: navT('allProducts'), href: '/shop' },
          { label: activeCategory.name },
        ]}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: navT('home'), path: '/' },
          { name: navT('allProducts'), path: '/shop/' },
          { name: activeCategory.name, path: `/product-category/${activeCategory.slug}/` },
        ])}
      />
      <h1 className="mb-2.5 font-display text-h1 font-bold text-ink">{activeCategory.name}</h1>
      <p className="max-w-[64ch] text-[14.5px] leading-relaxed text-muted">
        {activeCategory.description}
      </p>
    </header>
  )
}

async function CategoryCatalog({
  params,
  searchParams,
}: {
  params: CategoryParams
  searchParams: CategorySearchParams
}) {
  const { slug } = await params
  const categories = await getCategories()
  const activeCategory = categories.find((entry) => entry.slug === decodeSlugParam(slug))

  if (!activeCategory) notFound()

  return (
    <CatalogBrowser
      categorySlug={activeCategory.slug}
      categories={categories}
      searchParams={searchParams}
    />
  )
}
