import { orderReminderService } from '@/features/orders'
import { runCron } from '@/lib/cron'

// Every half hour (vercel.json): phone-only orders nobody has called back
// are put in front of the team once. A backlog after the quiet night is a
// message per order, so the run gets a minute.
export const maxDuration = 60

export async function GET(request: Request): Promise<Response> {
  return runCron(request, 'quick-order-reminders', async () => ({
    reminded: await orderReminderService.remindQuickOrders(new Date()),
  }))
}
