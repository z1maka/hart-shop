// How the «Хіти продажів» rail is filled, and how far it reaches. Shared
// between the admin that sets it and the storefront that reads it.
export const FeaturedMode = {
  Manual: 'manual',
  Auto: 'auto',
} as const

export type FeaturedMode = (typeof FeaturedMode)[keyof typeof FeaturedMode]

export const FEATURED_MODE_KEY = 'storefront.featured_mode'
export const FEATURED_LIMIT = 8

const MODES: ReadonlySet<string> = new Set(Object.values(FeaturedMode))

export function parseFeaturedMode(value: unknown): FeaturedMode {
  return typeof value === 'string' && MODES.has(value) ? (value as FeaturedMode) : FeaturedMode.Manual
}
