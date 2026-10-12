import { orderTrackingService } from '@/features/orders'
import { runCron } from '@/lib/cron'
import { logger } from '@/lib/logger'

// Hourly, scheduled in vercel.json: one tracking call per hundred parcels and
// a mail or a message for the few that moved. The mails go one by one, so a
// day's batch of handovers on a slow mail server needs the headroom.
export const maxDuration = 300

export async function GET(request: Request): Promise<Response> {
  return runCron(request, 'parcel-tracking', async () => {
    const report = await orderTrackingService.trackParcels(new Date())
    logger.info('Parcels tracked', report)
    return report
  })
}
