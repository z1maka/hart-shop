import { DEFAULT_LOCALE } from '@/config/locales'
import type { Locale } from '@/db/enums'

// The storefront speaks one language; the async shape is kept so call sites
// match the EU engine, where the locale really is negotiated per request.
export async function getLocaleTyped(): Promise<Locale> {
  return DEFAULT_LOCALE
}
