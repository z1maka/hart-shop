import { ReviewSource } from '@/db/enums'

// Hints for the moderator, never a verdict. A review that pins where a unit
// stands must not go out, and this is how that usually looks in a sentence: a
// settlement or street abbreviation before a name, a coordinate pair, an MGRS
// grid, or «біля <Place>». JavaScript's \b knows only Latin letters, so the
// Cyrillic patterns anchor on whitespace instead.
const LOCATION_PATTERNS: readonly RegExp[] = [
  /(^|[\s(,])(с|м|смт|сел|вул|просп|пров|обл|р-н|н\.п)\.\s?[А-ЯІЇЄҐ]/u,
  /\b\d{1,2}\.\d{4,}\s*[,;]\s*\d{1,3}\.\d{4,}\b/u,
  /\b\d{2}[A-Z]\s?[A-Z]{2}\s?\d{4,10}\b/u,
  /(^|\s)(біля|поблизу|неподалік|під)\s+[А-ЯІЇЄҐ][а-яіїєґ'’-]+/u,
  /координат/iu,
  /(^|\s)(напрямк|напрямок|позиці)/iu,
]

export function looksLikeLocation(text: string): boolean {
  return LOCATION_PATTERNS.some((pattern) => pattern.test(text))
}

// The site's rule for what the page shows: only reviews with words. The
// marketplace's tag-only reviews and bare ratings count in the average and
// its bars but get no card of their own (owner's decision, 26.09.2026).
export function hasReviewText(body: string): boolean {
  return body.trim().length > 0
}

// Review snippets may carry only reviews the site collected itself, never ones
// aggregated from other websites (Google's structured-data rules): those that
// came through this site's own form once it started collecting.
export function isCollectedHere(
  review: { readonly source: ReviewSource; readonly publishedAt: Date | null },
  collectingSince: Date,
): boolean {
  return (
    review.source === ReviewSource.Site &&
    review.publishedAt !== null &&
    review.publishedAt >= collectingSince
  )
}
