import { getRequestConfig } from 'next-intl/server'
import { DEFAULT_LOCALE } from '@/config/locales'

// The storefront speaks one language and lives at the bare URLs, so the
// request config is static: no locale negotiation, no routing prefix.
export default getRequestConfig(async () => ({
  locale: DEFAULT_LOCALE,
  messages: (await import(`../messages/${DEFAULT_LOCALE}.json`)).default,
}))
