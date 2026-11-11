import { googleAdsSalePush } from '@/features/orders'
import { runCron } from '@/lib/cron'
import { logger } from '@/lib/logger'

// Hourly (vercel.json): the ad sales placed six to seven hours ago go to
// Google Ads through the Data Manager API, hours before the daily CSV fetch
// would book them.
export async function GET(request: Request): Promise<Response> {
  return runCron(request, 'google-ads-sales', async () => {
    const report = await googleAdsSalePush.pushDueSales(new Date())
    if (report.sent.length > 0) logger.info('Ad sales pushed to Google Ads', report)
    return report
  })
}
