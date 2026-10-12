import { orderPackingService } from '@/features/orders'
import { runCron } from '@/lib/cron'

// Every quarter of an hour (vercel.json): orders past the packing delay are
// moved to Packed.
export async function GET(request: Request): Promise<Response> {
  return runCron(request, 'auto-pack', async () => ({
    packed: await orderPackingService.packDueOrders(new Date()),
  }))
}
