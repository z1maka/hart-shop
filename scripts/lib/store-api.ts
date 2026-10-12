import { z } from 'zod'

const STORE_API_BASE = 'https://fox-armor.com.ua/wp-json/wc/store/v1'
const REQUEST_TIMEOUT_MS = 30_000
const PAGE_SIZE = 100

const StoreImageSchema = z.object({
  id: z.number().int(),
  src: z.url(),
  alt: z.string(),
})

const StoreTermSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
})

const StoreAttributeSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  taxonomy: z.string().nullable(),
  terms: z.array(StoreTermSchema),
})

const StorePricesSchema = z.object({
  price: z.string(),
  regular_price: z.string(),
  sale_price: z.string(),
  currency_code: z.string(),
  currency_minor_unit: z.number().int().min(0).max(4),
})

const StoreCategoryRefSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
})

const StoreVariationSchema = z.object({
  id: z.number().int(),
  attributes: z.array(z.object({ name: z.string(), value: z.string() })),
})

const StoreProductSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  sku: z.string(),
  type: z.string(),
  description: z.string(),
  short_description: z.string(),
  on_sale: z.boolean(),
  prices: StorePricesSchema,
  is_in_stock: z.boolean(),
  attributes: z.array(StoreAttributeSchema),
  images: z.array(StoreImageSchema),
  categories: z.array(StoreCategoryRefSchema),
  variations: z.array(StoreVariationSchema),
})

export type StoreProduct = z.infer<typeof StoreProductSchema>

const StoreCategorySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  count: z.number().int(),
})

export type StoreCategory = z.infer<typeof StoreCategorySchema>

// Variations answer on the product endpoint with the same shape as a product;
// the prices and the shot the shop showed for that colour matter here.
const StoreVariationDetailSchema = z.object({
  id: z.number().int(),
  prices: StorePricesSchema,
  images: z.array(StoreImageSchema),
})

export type StoreImage = z.infer<typeof StoreImageSchema>

export type StoreVariationDetail = {
  readonly regularKopiykas: number
  readonly saleKopiykas: number | null
  // WooCommerce answers with the variation's own photo first, or the
  // product's main one when the variation has none.
  readonly image: StoreImage | null
}

async function storeRequest(path: string): Promise<unknown> {
  const response = await fetch(`${STORE_API_BASE}${path}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Store API returned ${response.status} for ${path}`)
  }

  return response.json()
}

export async function fetchAllProducts(): Promise<StoreProduct[]> {
  const products: StoreProduct[] = []

  for (let page = 1; ; page += 1) {
    const batch = z
      .array(StoreProductSchema)
      .parse(await storeRequest(`/products?per_page=${PAGE_SIZE}&page=${page}`))

    products.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }

  return products
}

export async function fetchStoreCategories(): Promise<StoreCategory[]> {
  return z
    .array(StoreCategorySchema)
    .parse(await storeRequest(`/products/categories?per_page=${PAGE_SIZE}`))
}

export async function fetchVariationDetail(variationId: number): Promise<StoreVariationDetail> {
  const detail = StoreVariationDetailSchema.parse(await storeRequest(`/products/${variationId}`))

  return {
    regularKopiykas: toKopiykas(detail.prices.regular_price, detail.prices.currency_minor_unit),
    saleKopiykas:
      detail.prices.sale_price !== detail.prices.regular_price
        ? toKopiykas(detail.prices.sale_price, detail.prices.currency_minor_unit)
        : null,
    image: detail.images[0] ?? null,
  }
}

export function priceInKopiykas(product: StoreProduct): number {
  return toKopiykas(product.prices.regular_price, product.prices.currency_minor_unit)
}

export function salePriceInKopiykas(product: StoreProduct): number | null {
  if (!product.on_sale) return null
  if (product.prices.sale_price === product.prices.regular_price) return null

  return toKopiykas(product.prices.sale_price, product.prices.currency_minor_unit)
}

function toKopiykas(price: string, minorUnit: number): number {
  const amount = Number(price)

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`Unusable price "${price}"`)
  }

  return Math.round(amount * 10 ** (2 - minorUnit))
}
