import { monoPaymentProvider, processPaymentEvent } from '@/features/checkout'

// Signature verification needs the exact bytes monobank signed, so the body is
// read as text before anything parses it. See AGENTS.md §14.
export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text()
  const signature = request.headers.get('x-sign')

  const event = await monoPaymentProvider.verifyWebhook(rawBody, signature)
  if (!event) return new Response('invalid signature', { status: 400 })

  const outcome = await processPaymentEvent(monoPaymentProvider.id, event)
  return new Response(outcome, { status: 200 })
}
