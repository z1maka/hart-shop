type Listable = { readonly slug: string; readonly categorySlug: string }

export type CompanionPools<T extends Listable> = {
  readonly excludeSlug: string
  readonly limit: number
  readonly pinnedOrder: readonly string[]
  readonly pinned: readonly T[]
  readonly categoryOrder: readonly string[]
  readonly fromCategories: readonly T[]
  readonly sameCategory: readonly T[]
}

// Pinned companions in their configured order, then the companion categories
// taken in turn, then the product's own category — never the viewed product,
// never the same product twice.
export function pickCompanions<T extends Listable>(pools: CompanionPools<T>): T[] {
  const bySlug = new Map(pools.pinned.map((row) => [row.slug, row]))
  const pinned = pools.pinnedOrder
    .map((slug) => bySlug.get(slug))
    .filter((row): row is T => row !== undefined)

  const ordered = [
    ...pinned,
    ...interleaveByCategory(pools.fromCategories, pools.categoryOrder),
    ...pools.sameCategory,
  ]

  const seen = new Set<string>([pools.excludeSlug])
  const picked: T[] = []
  for (const row of ordered) {
    if (picked.length === pools.limit) break
    if (seen.has(row.slug)) continue
    seen.add(row.slug)
    picked.push(row)
  }
  return picked
}

export function interleaveByCategory<T extends Listable>(
  rows: readonly T[],
  categoryOrder: readonly string[],
): T[] {
  const buckets = categoryOrder.map((slug) => rows.filter((row) => row.categorySlug === slug))
  const longest = Math.max(0, ...buckets.map((bucket) => bucket.length))
  const result: T[] = []

  for (let round = 0; round < longest; round += 1) {
    for (const bucket of buckets) {
      const row = bucket[round]
      if (row) result.push(row)
    }
  }
  return result
}
