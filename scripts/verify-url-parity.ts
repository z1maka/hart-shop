import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const INVENTORY_PATH = resolve(
  import.meta.dirname,
  '../docs/migration/url-inventory-2026-09-05.txt',
)
const REQUEST_TIMEOUT_MS = 20_000
const ALLOWED_STATUSES = new Set([200, 301, 308])
const OK_STATUS = 200
// A not-found page served with 200 (a cached render, a late notFound()) still
// carries Next's not-found digest. noindex alone is no sign: the cart and the
// checkout are inventoried and noindex on purpose.
const NOT_FOUND_DIGEST = 'NEXT_HTTP_ERROR_FALLBACK;404'

// Usage: pnpm tsx scripts/verify-url-parity.ts https://preview-host.vercel.app
// Every URL from the frozen WordPress inventory must answer 200 or a permanent
// redirect on the new host — a single 404 blocks the DNS switch (AGENTS.md §1).
async function main(): Promise<void> {
  const targetOrigin = process.argv[2]
  if (!targetOrigin) {
    console.error('Usage: pnpm tsx scripts/verify-url-parity.ts <target-origin>')
    process.exitCode = 1
    return
  }

  const sourceUrls = readFileSync(INVENTORY_PATH, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('https://'))

  const failures: string[] = []

  for (const sourceUrl of sourceUrls) {
    const path = new URL(sourceUrl).pathname
    const failure = await parityFailureOf(new URL(path, targetOrigin))
    if (failure) failures.push(`${failure}  ${path}`)
  }

  console.info(`Checked ${sourceUrls.length} URLs against ${targetOrigin}`)

  if (failures.length > 0) {
    console.error(`Parity broken for ${failures.length} URLs:`)
    for (const failure of failures) console.error(`  ${failure}`)
    process.exitCode = 1
    return
  }

  console.info(
    'URL parity holds: every inventoried address answers 200/301, none with a not-found page.',
  )
}

// Null when the address answers as the contract asks.
async function parityFailureOf(target: URL): Promise<string | null> {
  try {
    const response = await fetch(target, {
      redirect: 'manual',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })

    if (!ALLOWED_STATUSES.has(response.status)) return String(response.status)
    if (response.status !== OK_STATUS) return null

    return (await response.text()).includes(NOT_FOUND_DIGEST)
      ? '200 not-found page (soft 404)'
      : null
  } catch (error) {
    return `FETCH FAILED (${error instanceof Error ? error.message : String(error)})`
  }
}

void main()
