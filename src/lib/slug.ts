// WordPress slugs are carried over verbatim, Cyrillic included, so a route
// param may arrive percent-encoded. Malformed sequences (a hand-typed URL like
// /product/%zz/) must fall through to the not-found path, not crash the page.
export function decodeSlugParam(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
