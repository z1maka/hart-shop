import type { MetadataRoute } from 'next'
import { connection } from 'next/server'
import { GUIDES } from '@/content/guides'
import { getCatalogSitemap } from '@/features/catalog'
import { env } from '@/lib/env'

// Cart and checkout are deliberately absent: they are per-visitor pages with
// nothing to index, and their metadata says noindex.
const STATIC_PATHS: readonly string[] = [
  '/',
  '/shop/',
  '/about-us/',
  '/delivery/',
  '/refund-policy/',
  '/privacy-policy/',
  '/publichna-oferta/',
  '/contact/',
  '/poshyv-na-zamovlennya/',
  '/spivpratsia/',
  '/guides/',
]

const HOME_PRIORITY = 1
const PRODUCT_PRIORITY = 0.9
const CATEGORY_PRIORITY = 0.8
const PAGE_PRIORITY = 0.7

type PageEntry = {
  readonly path: string
  readonly lastModified?: Date
  readonly priority: number
}

// The sitemap is built whether or not the shop is indexable: robots.txt decides
// who may crawl, and keeping the file populated means the switch at launch is
// one variable rather than a deploy that also has to be checked.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Rendered per request so a published or renamed product shows up at once:
  // prerendered, the file kept its build-time catalogue for a day, because a
  // `catalog` tag purge does not reach a static metadata route. The catalogue
  // read itself stays cached under that tag.
  await connection()
  const { categories, products } = await getCatalogSitemap()

  // Static pages have no stored edit date, so they carry no lastmod: stamping
  // them with the render time moves the date on every regeneration and teaches
  // crawlers to ignore lastmod for the real product and category dates too.
  const entries: readonly PageEntry[] = [
    ...STATIC_PATHS.map((path) => ({
      path,
      priority: path === '/' ? HOME_PRIORITY : PAGE_PRIORITY,
    })),
    ...categories.map((category) => ({
      path: `/product-category/${category.slug}/`,
      lastModified: category.lastModified,
      priority: CATEGORY_PRIORITY,
    })),
    ...products.map((product) => ({
      path: `/product/${product.slug}/`,
      lastModified: product.lastModified,
      priority: PRODUCT_PRIORITY,
    })),
    ...GUIDES.map((guide) => ({
      path: `/guides/${guide.slug}/`,
      lastModified: new Date(guide.updatedAt),
      priority: PAGE_PRIORITY,
    })),
  ]

  return entries.map(({ path, lastModified, priority }) => ({
    url: absolute(path),
    lastModified,
    changeFrequency: 'weekly' as const,
    priority,
  }))
}

// Every URL ends with a trailing slash, mirroring the indexed WordPress
// structure (AGENTS.md §1); Cyrillic slugs are percent-encoded by URL.
function absolute(path: string): string {
  return new URL(path, env.NEXT_PUBLIC_SITE_URL).toString()
}
