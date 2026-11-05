import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// The drop price is what a partner pays: as confidential as the workshop's
// cost. No storefront page, feed (Merchant, Meta, partners.yml), JSON-LD or
// llms.txt may read it — only the admin, the partner order and its pricing.
const SRC = path.resolve(__dirname, '../../../src')
const DROP_PRICE = /dropPriceCents|drop_price_cents/

const ALLOWED = [
  /^db\//,
  /^features\/admin\//,
  /^features\/orders\/(model|repository|services)\//,
  /^features\/catalog\/model\/pricing\.ts$/,
]

// Where a buyer, a crawler or a feed reader gets its data from.
const PUBLIC_SOURCES = [
  'app/(shop)',
  'app/(content)',
  'app/feeds',
  'app/llms.txt',
  'app/sitemap.ts',
  'features/catalog/queries',
  'features/catalog/repository',
  'features/catalog/services',
  'features/catalog/ui',
  'features/storefront',
]

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry)
    if (statSync(full).isDirectory()) return filesUnder(full)
    return /\.(ts|tsx)$/.test(entry) ? [full] : []
  })
}

function readingDropPrice(): string[] {
  return filesUnder(SRC)
    .filter((file) => DROP_PRICE.test(readFileSync(file, 'utf8')))
    .map((file) => path.relative(SRC, file).split(path.sep).join('/'))
}

describe('drop price confidentiality', () => {
  it('is read only by the admin and the partner order', () => {
    const outside = readingDropPrice().filter((file) => !ALLOWED.some((rule) => rule.test(file)))
    expect(outside).toEqual([])
  })

  it('is read by no storefront page, feed or catalog query', () => {
    const leaked = readingDropPrice().filter((file) =>
      PUBLIC_SOURCES.some((source) => file.startsWith(source)),
    )
    expect(leaked).toEqual([])
  })
})
