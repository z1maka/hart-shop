import { isSizeAxisProminent, sizeAxisOf, type SizeAxis } from '@/config/variant-size'
import { createMoney, Currency, type Money } from '@/lib/money'

const GRAMS_PER_KILO = 1000
const COLOR_OPTION_KEY = 'Color'
const SIZE_OPTION_KEY = 'Size'

export type ProductImageView = {
  readonly url: string
  readonly alt: string
  readonly width: number
  readonly height: number
}

export type ProductVariantView = {
  readonly id: string
  readonly sku: string
  readonly color: string
  readonly size: string | null
  readonly label: string
  readonly stockQty: number
  readonly isAvailable: boolean
  // Position of this colour's own shot in the product's gallery, if it has one.
  readonly imageIndex: number | null
}

// The second choice spelled out on a card — a cover's Starlink models — when
// its axis belongs there (config/variant-size.ts).
export type CardSizeChoice = {
  readonly axis: SizeAxis
  readonly sizes: readonly string[]
}

// One variant as the card's choice dialog offers it.
export type CardVariantView = {
  readonly id: string
  readonly color: string | null
  readonly size: string | null
  readonly isAvailable: boolean
}

export type ProductCardView = {
  readonly slug: string
  readonly sku: string
  readonly title: string
  readonly badge: string | null
  readonly metaLine: string
  readonly price: Money
  // The pre-sale price, present only while a sale price is active.
  readonly regularPrice: Money | null
  readonly image: ProductImageView | null
  // A colour's own shot, for a card that opens on that colour.
  readonly imagesByColor: Readonly<Record<string, ProductImageView>>
  readonly colors: readonly string[]
  readonly sizeChoice: CardSizeChoice | null
  readonly categorySlug: string
  readonly quickAddVariantId: string | null
  readonly quickAddVariantLabel: string | null
  readonly variantChoiceCount: number
  // Every variant on sale: with more than one in stock, the card asks which.
  readonly variants: readonly CardVariantView[]
  // Published reviews only; null until the product has any.
  readonly rating: { readonly average: number; readonly count: number } | null
  // The volume price, said on the card so a unit buyer sees it before opening.
  readonly wholesale: { readonly minQuantity: number; readonly price: Money } | null
}

// The Ukrainian decimal comma, at the precision the catalogue is weighed in:
// 1350 g reads «1,35 кг», as the descriptions say, not a rounded «1.4».
const WEIGHT_FORMAT = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 })

export function formatWeight(weightGrams: number, unit = 'kg'): string {
  return `${WEIGHT_FORMAT.format(weightGrams / GRAMS_PER_KILO)} ${unit}`
}

// Layer count is a concealment-fabric fact; it means nothing on a stretcher or
// a set of muffs, so single-layer items simply do not show it. A zero weight
// means "not stated" and is left out the same way. The SKU stays off listings —
// it is an internal reference, shown on the product page only.
export function buildMetaLine(
  weightGrams: number,
  layersLabel: string | null,
  weightUnit = 'kg',
): string {
  const parts: string[] = []
  if (weightGrams > 0) parts.push(formatWeight(weightGrams, weightUnit))
  if (layersLabel) parts.push(layersLabel)
  return parts.join(' · ')
}

export function toPrice(priceCents: number): Money {
  return createMoney(priceCents, Currency.Uah)
}

export function effectivePrice(priceCents: number, salePriceCents: number | null): Money {
  return toPrice(salePriceCents ?? priceCents)
}

export function struckPrice(priceCents: number, salePriceCents: number | null): Money | null {
  return salePriceCents === null ? null : toPrice(priceCents)
}

export function colorOf(options: Record<string, string>): string | null {
  return options[COLOR_OPTION_KEY] ?? null
}

export function sizeOf(options: Record<string, string>): string | null {
  return options[SIZE_OPTION_KEY] ?? null
}

// The sizes a card lists, in the variants' order, each once; none for a
// product sold in one size or on an axis the card leaves to the page.
export function cardSizeChoiceOf(
  variants: readonly { readonly options: Record<string, string> }[],
): CardSizeChoice | null {
  const sizes = [
    ...new Set(variants.map((variant) => sizeOf(variant.options)).filter((size) => size !== null)),
  ]
  if (sizes.length === 0) return null

  const axis = sizeAxisOf(sizes)
  return isSizeAxisProminent(axis) ? { axis, sizes } : null
}

export function isVariantAvailable(stockQty: number): boolean {
  return stockQty > 0
}

// Where the gallery jumps when a colour is picked. Sizes of one colour share
// a shot, so the first variant that names one decides for the colour.
export function coverIndexByColor(
  variants: readonly Pick<ProductVariantView, 'color' | 'imageIndex'>[],
): Readonly<Record<string, number>> {
  const covers: Record<string, number> = {}
  for (const variant of variants) {
    if (variant.imageIndex === null || Object.hasOwn(covers, variant.color)) continue
    covers[variant.color] = variant.imageIndex
  }
  return covers
}

// The cover a colour brings to the front, read from a colour-keyed record
// the safe way: a colour named like an Object.prototype member is no hit.
export function coverIndexFor(
  covers: Readonly<Record<string, number>>,
  color: string | null,
): number | undefined {
  return color !== null && Object.hasOwn(covers, color) ? covers[color] : undefined
}

// The card's photo: the colour it opens on, if that colour has its own shot.
export function cardImageFor(
  product: Pick<ProductCardView, 'image' | 'imagesByColor'>,
  color: string | undefined,
): ProductImageView | null {
  const own =
    color !== undefined && Object.hasOwn(product.imagesByColor, color)
      ? product.imagesByColor[color]
      : undefined
  return own ?? product.image
}

// A thumbnail or arrow choice in the gallery, remembered with the colour it
// was made under; null before the shopper has touched anything.
export type GalleryPick = {
  readonly index: number
  readonly color: string | null
}

export type GalleryState = {
  readonly pick: GalleryPick | null
  readonly color: string | null
  readonly coverIndex: number | undefined
  readonly count: number
}

// Which shot the gallery shows: the shopper's own pick while the colour it
// was made under is on screen (a pick made before any colour arrived counts
// for the first one), else the colour's cover, else the first shot. The
// result is clamped, so a stale index never points past the gallery.
export function galleryIndexFor({ pick, color, coverIndex, count }: GalleryState): number {
  if (count === 0) return 0

  const isPickCurrent = pick !== null && (pick.color === color || pick.color === null)
  const wanted = isPickCurrent || coverIndex === undefined ? (pick?.index ?? 0) : coverIndex

  return Math.min(Math.max(wanted, 0), count - 1)
}

// Google shows about this much of a description; longer text is cut mid-word
// in the result, so the page hands over a whole sentence instead.
type SpecRow = { readonly label: string; readonly value: string }

const specKey = (label: string): string => label.trim().toLocaleLowerCase('uk')

// The page derives weight, layers and colours from the product itself. An
// imported or hand-typed row under one of those names would state the fact a
// second time, possibly differently, and the derived row wins: it is read from
// the live variants. Imported WordPress attributes may also carry blank values;
// an empty row in the spec table reads as a rendering bug.
export function mergeSpecs<Row extends SpecRow>(
  leading: readonly Row[],
  entered: readonly Row[],
  trailing: readonly Row[],
): Row[] {
  const derivedKeys = new Set([...leading, ...trailing].map((row) => specKey(row.label)))
  const kept = entered.filter(
    (row) => row.value.trim() !== '' && !derivedKeys.has(specKey(row.label)),
  )
  return [...leading, ...kept, ...trailing]
}

const META_MAX_LENGTH = 300

// One line, whatever the source: the imported WordPress texts carry emoji
// headings and blank lines that read as noise in a search result.
export function metaDescription(...candidates: readonly (string | null)[]): string {
  const text = candidates.map((candidate) => (candidate ?? '').trim()).find(Boolean) ?? ''
  const line = text.replace(/\s+/g, ' ').trim()
  if (line.length <= META_MAX_LENGTH) return line

  const cut = line.slice(0, META_MAX_LENGTH)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : cut.length).trimEnd()}…`
}
