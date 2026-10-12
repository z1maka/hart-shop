import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { guidesForCategory } from '@/content/guides'

// The guides written for this category, under its grid: the reading a
// buyer does before choosing, linked from where they choose.
export async function GuideLinks({ categorySlug }: { readonly categorySlug: string }) {
  const guides = guidesForCategory(categorySlug)
  if (guides.length === 0) return null

  const t = await getTranslations('guides')

  return (
    <section className="mt-12">
      <h2 className="mb-3 font-display text-h3 font-bold text-ink">{t('categoryTitle')}</h2>
      <ul className="grid gap-2">
        {guides.map((guide) => (
          <li key={guide.slug}>
            <Link
              href={`/guides/${guide.slug}/`}
              className="text-[15px] font-semibold text-accent underline-offset-4 hover:underline"
            >
              {guide.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
