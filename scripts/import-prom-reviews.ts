import 'dotenv/config'
import { reviewRepository } from '@/features/reviews/repository/review-repository'
import { reviewService, type ImportReviewInput } from '@/features/reviews/services/review-service'
import { closeDb } from '@/lib/db'
import { catalogSlugFor, catalogSlugForText } from './lib/prom-review-products'
import { parseTestimonialsPage, promReviewSourceId, type PromReview } from './lib/prom-reviews'

// Usage: pnpm import:prom-reviews [--dry-run]
//   production: DOTENV_CONFIG_PATH=.env.production pnpm import:prom-reviews
// Without that variable dotenv reads .env, which is the local copy of the
// database; the first line of output names the host it is about to write to.
// Carries the shop's Prom.ua reviews over to the catalogue: every review that
// the marketplace tied to a product we still sell is stored under that
// product, published, with its original date and the deal confirmation as
// «Купив у нас». Re-runs add what is new and refresh the tags of what is
// already here. After a run the storefront cache needs «Обновить витрину»
// in the admin.
const TESTIMONIALS_URL = 'https://foxshoes.com.ua/ua/testimonials'
const REQUEST_TIMEOUT_MS = 20_000
const PAGE_LIMIT = 200
const PAUSE_BETWEEN_PAGES_MS = 500

type Outcome = {
  readonly fetched: number
  readonly linked: number
  readonly skipped: Map<string, number>
  readonly written: number
}

async function main(): Promise<void> {
  const isDryRun = process.argv.includes('--dry-run')
  process.stdout.write(`database: ${databaseHost()}${isDryRun ? ' (dry run)' : ''}\n`)
  const reviews = await fetchAllReviews()
  const { rows, skipped } = await linkToCatalog(reviews)

  const written = isDryRun ? 0 : await reviewService.importFromProm(rows)

  report({ fetched: reviews.length, linked: rows.length, skipped, written }, isDryRun)
}

function databaseHost(): string {
  const url = process.env.DATABASE_URL
  return url ? new URL(url).host : '(DATABASE_URL is not set)'
}

async function fetchAllReviews(): Promise<PromReview[]> {
  const all: PromReview[] = []
  const seen = new Set<string>()

  // Prom answers any page past the last one with the first page again, so
  // the walk ends when a page brings nothing new.
  for (let page = 1; page <= PAGE_LIMIT; page += 1) {
    const url = page === 1 ? TESTIMONIALS_URL : `${TESTIMONIALS_URL}/page_${page}`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (fox-armor.com.ua review import)' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) throw new Error(`Prom answered ${response.status} for ${url}`)

    const reviews = parseTestimonialsPage(await response.text()).filter((review) => {
      const key = promReviewSourceId(review)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    if (reviews.length === 0) break

    all.push(...reviews)
    process.stdout.write(`page ${page}: ${reviews.length} reviews\n`)
    await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_PAGES_MS))
  }

  return all
}

async function linkToCatalog(
  reviews: readonly PromReview[],
): Promise<{ rows: ImportReviewInput[]; skipped: Map<string, number> }> {
  const productIds = new Map<string, string | null>()
  const skipped = new Map<string, number>()
  const rows: ImportReviewInput[] = []

  for (const review of reviews) {
    // A review on several products counts for each of them: the buyer had
    // them all in one parcel. One tied to no listing at all goes by its words.
    const fromListings = [
      ...new Set(review.products.map((product) => catalogSlugFor(product.name))),
    ].filter((slug): slug is string => slug !== null)
    const slugs = review.products.length === 0 ? slugsFromText(review.text) : fromListings

    if (slugs.length === 0) {
      for (const product of review.products) {
        skipped.set(product.name, (skipped.get(product.name) ?? 0) + 1)
      }
      if (review.products.length === 0) skipped.set('(без товару)', (skipped.get('(без товару)') ?? 0) + 1)
      continue
    }

    for (const slug of slugs) {
      if (!productIds.has(slug)) {
        const product = await reviewRepository.findProductBySlug(slug)
        productIds.set(slug, product?.id ?? null)
        if (!product) process.stderr.write(`no catalogue product for slug ${slug}\n`)
      }
      const productId = productIds.get(slug)
      if (!productId) continue

      rows.push({
        productId,
        sourceId: `${promReviewSourceId(review)}|${slug}`,
        authorName: review.author,
        rating: review.rating,
        body: review.text,
        tags: review.tags,
        isVerifiedPurchase: review.isDealConfirmed,
        createdAt: review.writtenAt,
      })
    }
  }

  return { rows, skipped }
}

function slugsFromText(text: string): string[] {
  const slug = catalogSlugForText(text)
  return slug ? [slug] : []
}

function report(outcome: Outcome, isDryRun: boolean): void {
  const skippedTotal = [...outcome.skipped.values()].reduce((sum, count) => sum + count, 0)
  process.stdout.write(
    `\n${isDryRun ? 'Dry run: ' : ''}fetched ${outcome.fetched}, linked ${outcome.linked}, ` +
      `${isDryRun ? 'would write' : 'written (new or refreshed)'} ${isDryRun ? outcome.linked : outcome.written}, ` +
      `skipped ${skippedTotal} on ${outcome.skipped.size} listings without a catalogue product\n`,
  )
  const top = [...outcome.skipped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
  for (const [name, count] of top) process.stdout.write(`  ${String(count).padStart(3)}  ${name}\n`)
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
  .finally(() => closeDb())
