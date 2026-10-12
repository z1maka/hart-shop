import { z } from 'zod'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

const TURBOSMS_API = 'https://api.turbosms.ua'
const SEND_TIMEOUT_MS = 10_000

// The request went through: 0 OK, 800 queued, 801 sent, 802/803 the same for
// part of the recipients (https://turbosms.ua/api.html). Until 30.09.2026 801
// was missing here and every SMS the shop sent was logged as failed.
const ACCEPTED_CODES: ReadonlySet<number> = new Set([0, 800, 801, 802, 803])

const recipientResultSchema = z.object({
  response_code: z.number(),
  response_status: z.string(),
  message_id: z.string().nullable(),
})

const sendResponseSchema = z.object({
  response_code: z.number(),
  response_status: z.string(),
  response_result: z.array(recipientResultSchema).nullish(),
})

type SendResponse = z.infer<typeof sendResponseSchema>

// Sends one SMS through TurboSMS. A deployment without the token or the
// approved sender is a no-op — TurboSMS rejects a message without a sender.
// Phone numbers are logged masked — they are personal data.
export function isSmsConfigured(): boolean {
  return Boolean(env.TURBO_SMS_API_TOKEN && env.TURBO_SMS_SENDER)
}

export async function sendSms(phone: string, text: string): Promise<void> {
  if (!isSmsConfigured()) return

  const response = await fetch(`${TURBOSMS_API}/message/send.json`, {
    method: 'POST',
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${env.TURBO_SMS_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipients: [phone],
      sms: { sender: env.TURBO_SMS_SENDER, text },
    }),
  })

  const parsed = sendResponseSchema.parse(await response.json())
  if (!isAccepted(parsed)) {
    throw new Error(`TurboSMS send failed: ${refusalOf(parsed)}`)
  }

  logger.info('SMS sent', {
    phone: maskPhone(phone),
    messageId: parsed.response_result?.[0]?.message_id ?? null,
  })
}

// One recipient per request, so the message is out when the request was
// accepted and the recipient, if TurboSMS lists it, got a message id; a
// partial success without one is this recipient's refusal.
function isAccepted(parsed: SendResponse): boolean {
  if (!ACCEPTED_CODES.has(parsed.response_code)) return false

  const recipient = parsed.response_result?.[0]
  return recipient ? recipient.message_id !== null : true
}

function refusalOf(parsed: SendResponse): string {
  const recipient = parsed.response_result?.[0]
  const source = recipient ?? parsed

  return `${source.response_code} ${source.response_status}`
}

function maskPhone(phone: string): string {
  return `${phone.slice(0, 5)}*****${phone.slice(-2)}`
}
