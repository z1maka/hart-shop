import type { MetadataRoute } from 'next'
import { FEED_PATH } from '@/config/merchant-feed'
import { META_CATALOG_PATH } from '@/config/meta-catalog'
import { env } from '@/lib/env'

const SITEMAP_URL = `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`

// Cart and checkout are not here: they are noindex on the page, and
// Storebot-Google reads them to check the buying flow Merchant Center
// advertises, as it could on WordPress.
const PRIVATE_PATHS = ['/admin', '/api']

export default function robots(): MetadataRoute.Robots {
  // While the shop is closed only the product feeds are reachable, so they
  // can be set up before launch. The sitemap is listed either way; opening up
  // is one variable.
  if (!env.SITE_INDEXABLE) {
    return {
      rules: [{ userAgent: '*', allow: [FEED_PATH, META_CATALOG_PATH], disallow: '/' }],
      sitemap: SITEMAP_URL,
    }
  }

  return {
    rules: [{ userAgent: '*', allow: '/', disallow: PRIVATE_PATHS }],
    sitemap: SITEMAP_URL,
    host: env.NEXT_PUBLIC_SITE_URL,
  }
}
