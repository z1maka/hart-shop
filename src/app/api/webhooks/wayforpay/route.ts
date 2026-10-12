import {
  processPaymentEvent,
  wayforpayPaymentProvider,
  wayforpayWebhookAck,
} from '@/features/checkout'

// WayForPay signs inside the JSON body and keeps retrying the callback until
// it receives the signed accept below, so every verified event — duplicates
// included — must be acknowledged.
export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text()

  const event = await wayforpayPaymentProvider.verifyWebhook(rawBody, null)
  if (!event) return new Response('invalid signature', { status: 400 })

  await processPaymentEvent(wayforpayPaymentProvider.id, event)

  return Response.json(wayforpayWebhookAck(event.providerRef))
}
