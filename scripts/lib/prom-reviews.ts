import { decodeEntities } from './html-text'

// One review as the Prom.ua company page prints it. Most carry only a
// rating; the products are the ones the buyer's deal contained.
export type PromReview = {
  readonly author: string
  readonly writtenAt: Date
  readonly rating: number
  readonly text: string
  // The one-tap tags under a review («Швидко відправили»…), in the page's
  // language: often all a buyer says.
  readonly tags: readonly string[]
  readonly products: readonly { readonly id: number; readonly name: string }[]
  readonly isDealConfirmed: boolean
}

const ITEM_PATTERN = /<li class="b-comments__item">([\s\S]*?)<\/li>\s*(?=<li class="b-comments__item">|<\/ul>)/g
const AUTHOR_PATTERN = /data-qaid="author_name">([\s\S]*?)<\/strong>/
const DATE_PATTERN = /datetime="([^"]+)"/
const RATING_PATTERN = /Рейтинг (\d) з 5/
// The text is one <p>; inline tags inside it (a link, bold) are part of it.
const TEXT_PATTERN = /data-qaid="review_text"[^>]*>([\s\S]*?)<\/p>/
const PRODUCTS_PATTERN = /data-reviews-products="([^"]*)"/
const TAG_PATTERN = /data-tag-title="([^"]*)"/g
const DEAL_MARKER = 'data-qaid="deal_confirmation"'

export function parseTestimonialsPage(html: string): PromReview[] {
  return [...html.matchAll(ITEM_PATTERN)].flatMap((match) => {
    const review = parseItem(match[1] ?? '')
    return review ? [review] : []
  })
}

function parseItem(item: string): PromReview | null {
  const author = AUTHOR_PATTERN.exec(item)?.[1]
  const date = DATE_PATTERN.exec(item)?.[1]
  const rating = RATING_PATTERN.exec(item)?.[1]
  if (!author || !date || !rating) return null

  const text = TEXT_PATTERN.exec(item)?.[1] ?? ''
  const productsJson = PRODUCTS_PATTERN.exec(item)?.[1]

  return {
    author: decodeEntities(author).trim(),
    writtenAt: kyivWallTimeToDate(date),
    rating: Number(rating),
    text: decodeEntities(text.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ''))
      .replace(/\s+/g, ' ')
      .trim(),
    tags: [...item.matchAll(TAG_PATTERN)]
      .map((match) => decodeEntities(match[1] ?? '').trim())
      .filter((tag) => tag.length > 0),
    products: productsJson ? parseProducts(decodeEntities(productsJson)) : [],
    isDealConfirmed: item.includes(DEAL_MARKER),
  }
}

function parseProducts(json: string): PromReview['products'] {
  const parsed: unknown = JSON.parse(json)
  if (!Array.isArray(parsed)) return []

  return parsed.flatMap((entry) =>
    typeof entry === 'object' &&
    entry !== null &&
    typeof (entry as { id?: unknown }).id === 'number' &&
    typeof (entry as { name?: unknown }).name === 'string'
      ? [{ id: (entry as { id: number }).id, name: (entry as { name: string }).name }]
      : [],
  )
}

const KYIV_OFFSET_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Kyiv',
  timeZoneName: 'longOffset',
})

// Prom prints the moment without a zone, on Kyiv's clock. Read it as such
// whatever the machine running the import is set to: the same wall time
// taken as UTC, moved back by Kyiv's offset on that day (summer or winter).
function kyivWallTimeToDate(wallTime: string): Date {
  const asUtc = new Date(`${wallTime}Z`)
  const offsetPart = KYIV_OFFSET_FORMATTER.formatToParts(asUtc).find(
    (part) => part.type === 'timeZoneName',
  )
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(offsetPart?.value ?? '')
  if (!match) return asUtc

  const sign = match[1] === '-' ? -1 : 1
  const offsetMinutes = sign * (Number(match[2]) * 60 + Number(match[3]))
  return new Date(asUtc.getTime() - offsetMinutes * 60_000)
}

// Prom shows no review id, so the moment and the signature stand in for one;
// the import keys its idempotence on this.
export function promReviewSourceId(review: PromReview): string {
  return `${review.writtenAt.toISOString()}|${review.author}`
}
