import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { JsonLd } from '@/components/JsonLd'
import { siteConfig } from '@/config/site'
import { findGuide, GUIDES, type Guide, type GuideLink, type GuideSection } from '@/content/guides'
import { getPublishedProductSlugs } from '@/features/catalog'
import { FaqList } from '@/features/catalog/ui/FaqList'
import { formatDateUk } from '@/lib/datetime'
import { logger } from '@/lib/logger'
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/seo'

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata({ params }: PageProps<'/guides/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const guide = findGuide(slug)
  if (!guide) return { title: siteConfig.name }

  return {
    title: guide.seoTitle,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}/` },
  }
}

export default async function GuidePage({ params }: PageProps<'/guides/[slug]'>) {
  const { slug } = await params
  const guide = findGuide(slug)
  if (!guide) notFound()

  const [t, publishedSlugs] = await Promise.all([
    getTranslations('guides'),
    getPublishedProductSlugs(),
  ])
  const path = `/guides/${guide.slug}/`
  const products = linkedProducts(guide, new Set(publishedSlugs))

  return (
    <article className="mx-auto max-w-[76ch] px-7 py-12">
      <JsonLd
        data={[
          articleJsonLd({
            headline: guide.title,
            description: guide.description,
            path,
            publishedAt: guide.publishedAt,
            updatedAt: guide.updatedAt,
          }),
          breadcrumbJsonLd([
            { name: t('breadcrumbHome'), path: '/' },
            { name: t('title'), path: '/guides/' },
            { name: guide.title, path },
          ]),
          ...(guide.faq.length > 0 ? [faqJsonLd(guide.faq)] : []),
        ]}
      />
      <p className="mb-4 text-[12.5px] font-semibold text-accent">
        <Link href="/guides/" className="hover:underline">
          {t('title')}
        </Link>
      </p>
      <h1 className="mb-4 font-display text-h1 font-bold text-balance text-ink">{guide.title}</h1>
      {/* On the page, not only in the markup: answer engines weigh a date a
          reader can see when they pick a source. */}
      <p className="mb-4 text-[12.5px] text-faint">
        {t('updated')}{' '}
        <time dateTime={guide.updatedAt}>{formatDateUk(new Date(guide.updatedAt))}</time>
      </p>
      <p className="mb-8 text-[16px] leading-relaxed text-pretty text-muted">{guide.lead}</p>

      {guide.sections.map((section) => (
        <GuideSectionView key={section.heading} section={section} />
      ))}

      {guide.faq.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-h3 font-bold text-ink">{t('faqTitle')}</h2>
          <FaqList entries={guide.faq} />
        </section>
      ) : null}

      <aside className="mt-10 rounded-card border border-subtle bg-surface p-5">
        <h2 className="mb-3 font-display text-[17px] font-bold text-ink">{t('productsTitle')}</h2>
        <ul className="grid gap-1.5 text-[14.5px]">
          {products.map((product) => (
            <li key={product.slug}>
              <Link
                href={`/product/${product.slug}/`}
                className="font-semibold text-accent underline-offset-4 hover:underline"
              >
                {product.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13.5px]">
          <Link
            href={`/product-category/${guide.categorySlug}/`}
            className="font-semibold text-ink underline-offset-4 hover:underline"
          >
            {t('toCategory')} →
          </Link>
        </p>
      </aside>
    </article>
  )
}

// A product archived after the guide was written answers with a redirect to
// its shelf: the guide leaves it out, and the log names the link to update.
function linkedProducts(guide: Guide, published: ReadonlySet<string>): readonly GuideLink[] {
  const missing = guide.products.filter((product) => !published.has(product.slug))
  if (missing.length > 0) {
    logger.error('Guide links unpublished products', {
      guide: guide.slug,
      missing: missing.map((product) => product.slug),
    })
  }

  return guide.products.filter((product) => published.has(product.slug))
}

function GuideSectionView({ section }: { readonly section: GuideSection }) {
  return (
    <section className="mb-7">
      <h2 className="mb-3 font-display text-h3 font-bold text-ink">{section.heading}</h2>
      {section.paragraphs.map((paragraph, index) => (
        <p key={index} className="mb-3.5 text-[15.5px] leading-relaxed text-pretty text-muted">
          {paragraph}
        </p>
      ))}
      {section.bullets ? (
        <ul className="grid gap-2 pl-5 text-[15.5px] leading-relaxed text-muted">
          {section.bullets.map((item, index) => (
            <li key={index} className="list-disc">
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
