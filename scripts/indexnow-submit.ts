import { COMPANY } from '@/config/company'
import { submitToIndexNow } from '@/lib/indexnow'

const USAGE = `Usage:
  pnpm indexnow:submit                  every URL in the live sitemap
  pnpm indexnow:submit <url> [<url> …]  only these, after a catalogue edit`

const SITEMAP_TIMEOUT_MS = 15_000

// Tells Bing and the other IndexNow engines what to (re)crawl: the whole
// sitemap after a deploy that changes many pages, single URLs after a product
// or category edit. Google does not take part; it reads the sitemap.
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.includes('--help')) {
    console.info(USAGE)
    return
  }

  const urls = args.length > 0 ? args : await liveSitemapUrls()
  const result = await submitToIndexNow(urls)

  console.info(`IndexNow: ${urls.length} URLs → ${result.status} ${result.detail}`.trim())
  if (result.status >= 300) process.exitCode = 1
}

async function liveSitemapUrls(): Promise<string[]> {
  const response = await fetch(`https://${COMPANY.site}/sitemap.xml`, {
    signal: AbortSignal.timeout(SITEMAP_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`The sitemap answered ${response.status}`)

  const xml = await response.text()
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].flatMap((match) => (match[1] ? [match[1]] : []))
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
