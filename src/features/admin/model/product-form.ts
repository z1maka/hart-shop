import { slugify } from '@/lib/utils'

export type SpecEntry = {
  readonly label: string
  readonly value: string
}

// A spec row is dropped when either half is blank: a row added in the editor
// and left empty is simply not saved.
export function parseSpecs(labels: readonly string[], values: readonly string[]): SpecEntry[] {
  return labels
    .map((label, index) => ({ label: label.trim(), value: (values[index] ?? '').trim() }))
    .filter((spec) => spec.label !== '' && spec.value !== '')
}

export function parseStock(
  variantIds: readonly string[],
  quantities: readonly string[],
): Record<string, number> | null {
  const stock: Record<string, number> = {}

  for (const [index, variantId] of variantIds.entries()) {
    if (!variantId) return null

    const quantity = Number(quantities[index])
    if (!Number.isInteger(quantity) || quantity < 0) return null

    stock[variantId] = quantity
  }

  return stock
}

// One entry per variant, in the form's order: the storage key of the photo
// chosen for the colour, or blank for "the product's first photo". A form
// that does not answer for every variant is refused rather than guessed.
export function parseVariantCovers(
  variantIds: readonly string[],
  storageKeys: readonly string[],
): Record<string, string | null> | null {
  if (storageKeys.length !== variantIds.length) return null

  const covers: Record<string, string | null> = {}

  for (const [index, variantId] of variantIds.entries()) {
    if (!variantId) return null

    const key = (storageKeys[index] ?? '').trim()
    covers[variantId] = key === '' ? null : key
  }

  return covers
}

const PERCENT = 100

// A slug the admin left alone is kept letter for letter: the imported
// WordPress addresses are Cyrillic and indexed, and normalising them would
// mint a new address and a dead link. Only a slug they typed is normalised.
export function nextSlug(currentSlug: string, typedSlug: string): string {
  return typedSlug.trim() === currentSlug ? currentSlug : slugify(typedSlug)
}

// A sale price exists to be lower: equal or higher would show the same or a
// larger number struck through, and zero would give the product away.
export function isValidSalePrice(priceCents: number, salePriceCents: number | null): boolean {
  return salePriceCents === null || (salePriceCents > 0 && salePriceCents < priceCents)
}

// The discount the storefront reads as "−18%", rounded to whole percent.
export function discountPercent(priceCents: number, salePriceCents: number | null): number | null {
  if (salePriceCents === null || !isValidSalePrice(priceCents, salePriceCents)) return null
  return Math.round((1 - salePriceCents / priceCents) * PERCENT)
}

// How the admin types a price in hryvnias or a weight in kilos: digits with
// up to three decimals after a dot or a comma. The form's preview and the
// save action read it through this one rule, so they never disagree.
export const DECIMAL_INPUT_PATTERN = /^\d{1,6}([.,]\d{1,3})?$/

export function parseDecimalInput(input: string): number | null {
  const trimmed = input.trim()
  return DECIMAL_INPUT_PATTERN.test(trimmed) ? Number(trimmed.replace(',', '.')) : null
}

const KOPIYKAS_PER_HRYVNIA = 100

export function hryvniasToKopiykas(hryvnias: number): number {
  return Math.round(hryvnias * KOPIYKAS_PER_HRYVNIA)
}

export function kopiykasToHryvnias(kopiykas: number): number {
  return kopiykas / KOPIYKAS_PER_HRYVNIA
}

const GRAMS_PER_KILO = 1000

// The heaviest parcel the shop sends in one box.
export const MAX_PRODUCT_WEIGHT_KG = 20

export function kilosToGrams(kilos: number): number {
  return Math.round(kilos * GRAMS_PER_KILO)
}

export function gramsToKilosInput(grams: number): string {
  return grams > 0 ? String(grams / GRAMS_PER_KILO) : ''
}

export const MAX_CATALOG_POSITION = 999

const WHOLE_NUMBER_PATTERN = /^\d+$/

// The place the owner types in the admin list. Blank takes the product off
// the arranged shelf; anything but digits comes back as NaN for the schema
// to refuse, so "1,5" or "-2" is never read as some other place.
export function parseCatalogPosition(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === '') return null
  return WHOLE_NUMBER_PATTERN.test(trimmed) ? Number(trimmed) : Number.NaN
}

export function catalogPositionInput(catalogOrder: number | null): string {
  return catalogOrder === null ? '' : String(catalogOrder)
}
