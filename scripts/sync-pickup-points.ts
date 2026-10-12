import 'dotenv/config'
import { syncNovaPostDirectory } from '@/features/shipping'
import { closeDb } from '@/lib/db'

// The same refresh the daily cron runs — for a fresh database, or right after
// the carrier changed its network and waiting until tomorrow is too long.
async function main(): Promise<void> {
  const startedAt = Date.now()
  const report = await syncNovaPostDirectory()
  const seconds = Math.round((Date.now() - startedAt) / 1000)
  console.info(
    `Pick-up points: ${report.fetched} fetched, ${report.stored} stored, ` +
      `${report.malformed} malformed, ${report.removed} removed in ${seconds}s`,
  )
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(closeDb)
