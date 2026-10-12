import { storeProductImage, type StoredImage } from '@/lib/product-image'

const REQUEST_TIMEOUT_MS = 60_000
const MAX_ATTEMPTS = 4
const RETRY_BASE_DELAY_MS = 800

export type ImportImageInput = {
  readonly sourceUrl: string
  readonly productSlug: string
  readonly index: number
}

export async function importProductImage(input: ImportImageInput): Promise<StoredImage> {
  // Eight hundred transfers over a home connection will drop a few; a single
  // dropped TLS record used to kill the whole import halfway through.
  return withRetries(() => fetchAndStore(input), `image ${input.productSlug}/${input.index}`)
}

async function withRetries<T>(operation: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt === MAX_ATTEMPTS) break

      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)
      console.warn(`    retry ${attempt}/${MAX_ATTEMPTS - 1} for ${label} in ${delay}ms`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

async function fetchAndStore(input: ImportImageInput): Promise<StoredImage> {
  const response = await fetch(input.sourceUrl, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Image ${input.sourceUrl} returned ${response.status}`)
  }

  const original = Buffer.from(await response.arrayBuffer())

  return storeProductImage(original, input.productSlug, input.index)
}
