import { syncNovaPostDirectory } from '@/features/shipping'
import { runCron } from '@/lib/cron'
import { logger } from '@/lib/logger'

// The whole country is ~55 pages of about a second each plus the upserts —
// a minute or so, with headroom for a slow day on their side.
export const maxDuration = 300

// Daily refresh of the pick-up point copy, scheduled in vercel.json; a
// failed run leaves the previous copy as it was.
export async function GET(request: Request): Promise<Response> {
  return runCron(request, 'pickup-points', async () => {
    const report = await syncNovaPostDirectory()
    logger.info('Nova Poshta directory synced', report)
    return report
  })
}
