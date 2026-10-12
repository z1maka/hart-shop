import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { JsonLd } from '@/components/JsonLd'
import { GUIDES } from '@/content/guides'
import { breadcrumbJsonLd } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('guides')

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: { canonical: '/guides/' },
  }
}

export default async function GuidesPage() {
  const t = await getTranslations('guides')

  return (
    <div className="mx-auto max-w-[80ch] px-7 py-12">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t('breadcrumbHome'), path: '/' },
          { name: t('title'), path: '/guides/' },
        ])}
      />
      <h1 className="mb-3 font-display text-h1 font-bold text-ink">{t('title')}</h1>
      <p className="mb-9 max-w-[60ch] text-[15.5px] leading-relaxed text-muted">{t('lead')}</p>

      <ul className="grid gap-4">
        {GUIDES.map((guide) => (
          <li key={guide.slug}>
            <Link
              href={`/guides/${guide.slug}/`}
              className="block rounded-card border border-subtle bg-surface p-5 hover:border-faint hover:shadow-card"
            >
              <h2 className="mb-1.5 font-display text-[19px] font-bold text-ink">{guide.title}</h2>
              <p className="text-[14px] leading-relaxed text-muted">{guide.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
