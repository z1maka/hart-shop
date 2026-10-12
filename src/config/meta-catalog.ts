import { OWN_PRODUCTION_CATEGORY_SLUGS } from '@/config/catalog'

// The product feed Meta's Commerce Manager fetches for catalogue ads
// (Data sources → Data feed → scheduled URL). Same RSS format as the Merchant
// Center feed; Meta reads Google's namespace.
export const META_CATALOG_PATH = '/feeds/meta-catalog.xml'

// Only what the workshop sews goes to Meta. Helmets, headsets and other
// bought-in gear stay out: Meta's commerce and ads review is strict about
// equipment sold next to weapons, and one rejected item flags the catalogue.
export const META_CATALOG_CATEGORY_SLUGS: readonly string[] = OWN_PRODUCTION_CATEGORY_SLUGS
