import { connection } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { COMPANY } from '@/config/company'
import { CUSTOM_ORDER_HREF } from '@/config/custom-order'
import { PARTNERS_HREF } from '@/config/partners'
import { siteConfig } from '@/config/site'
import { GUIDES } from '@/content/guides'
import { getCategories } from '@/features/catalog'
import { buildLlmsTxt, type LlmsTxtLink } from '@/lib/llms-txt'
import { absoluteUrl } from '@/lib/seo'

// The buyer pages in the order a shopper asks about them; each takes the title
// and the search description the page itself carries.
const BUYER_PAGES = [
  { path: '/delivery/', meta: 'meta.delivery' },
  { path: '/refund-policy/', meta: 'meta.refundPolicy' },
  { path: CUSTOM_ORDER_HREF, meta: 'customOrderPage.meta' },
  { path: '/about-us/', meta: 'meta.about' },
  { path: '/contact/', meta: 'meta.contact' },
  { path: PARTNERS_HREF, meta: 'partnersPage.meta' },
  { path: '/publichna-oferta/', meta: 'meta.offer' },
] as const

// What the shop is, for AI assistants, at the path llmstxt.org proposes.
// Rendered per request like the sitemap, so a renamed or hidden category
// shows up at once; the catalogue read itself stays cached.
export async function GET(): Promise<Response> {
  await connection()
  const [categories, t] = await Promise.all([getCategories(), getTranslations()])

  const pageLink = (path: string, meta: string): LlmsTxtLink => ({
    title: t(`${meta}.title`),
    url: absoluteUrl(path),
    note: t(`${meta}.description`),
  })

  const text = buildLlmsTxt({
    title: t('llms.title'),
    summary: siteConfig.description,
    details: [
      t('llms.seller', {
        name: COMPANY.legalName,
        taxId: COMPANY.taxId,
        phone: COMPANY.phone,
        email: COMPANY.email,
      }),
    ],
    sections: [
      {
        heading: t('llms.catalog'),
        links: [
          pageLink('/shop/', 'meta.shop'),
          ...categories.map((category) => ({
            title: category.name,
            url: absoluteUrl(`/product-category/${category.slug}/`),
            note: category.seoDescription,
          })),
        ],
      },
      {
        heading: t('llms.guides'),
        links: GUIDES.map((guide) => ({
          title: guide.title,
          url: absoluteUrl(`/guides/${guide.slug}/`),
          note: guide.description,
        })),
      },
      {
        heading: t('llms.buyers'),
        links: BUYER_PAGES.map((page) => pageLink(page.path, page.meta)),
      },
    ],
  })

  return new Response(text, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
