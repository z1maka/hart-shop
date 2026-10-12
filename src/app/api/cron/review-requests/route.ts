import { reviewRequestService } from '@/features/orders'
import { runCron } from '@/lib/cron'

// Once a day, mid-morning in Kyiv (vercel.json): buyers whose parcel was
// handed over a couple of days ago are asked how the product is. The mails
// go one by one, so a busy week needs the headroom.
export const maxDuration = 120

export async function GET(request: Request): Promise<Response> {
  return runCron(request, 'review-requests', async () => ({
    asked: await reviewRequestService.sendDue(new Date()),
  }))
}
