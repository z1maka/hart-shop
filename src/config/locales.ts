import { Locale } from '@/db/enums'

// Ukrainian is the only storefront language: it lives on the base tables and
// there is no i18n routing. The constants stay typed as Locale so the engine's
// locale-aware queries and actions keep one signature with the EU repository.
export const DEFAULT_LOCALE = Locale.Uk

export const SUPPORTED_LOCALES: readonly Locale[] = [Locale.Uk]

// Narrows a client-supplied string; anything but the supported locale falls
// back to the default instead of reaching the queries.
export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}
