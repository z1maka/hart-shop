import { z } from 'zod'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

const TELEGRAM_API = 'https://api.telegram.org'
const SEND_TIMEOUT_MS = 10_000

const sendResponseSchema = z.object({
  ok: z.boolean(),
  description: z.string().optional(),
})

// Sends one message to a chat of the shop's bot. The chat is always named by
// the caller: a default would quietly reroute a message meant for an
// unconfigured chat into another one. The text is Telegram's HTML subset
// (<b>, <i>, <a>); entities inside dynamic values must be escaped by the
// caller. A deployment without the bot or that chat configured is a silent
// no-op.
export function isTelegramConfigured(chatId: string | undefined): chatId is string {
  return Boolean(env.TELEGRAM_BOT_TOKEN && chatId)
}

export async function sendTelegramMessage(html: string, chatId: string | undefined): Promise<void> {
  if (!isTelegramConfigured(chatId)) return

  const response = await fetch(`${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: html,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    }),
  })

  const parsed = sendResponseSchema.parse(await response.json())
  if (!parsed.ok) {
    throw new Error(`Telegram sendMessage failed: ${parsed.description ?? response.status}`)
  }

  logger.info('Telegram message sent')
}

export type TelegramDocument = {
  readonly chatId: string | undefined
  readonly fileName: string
  readonly contentType: string
  readonly bytes: ArrayBuffer
  // Plain text, shown under the file.
  readonly caption: string
}

// Sends a file — a waybill label the packer prints straight from the chat.
// Same no-op rule as messages when the bot or the chat is not configured.
export async function sendTelegramDocument(document: TelegramDocument): Promise<void> {
  if (!isTelegramConfigured(document.chatId)) return

  const form = new FormData()
  form.append('chat_id', document.chatId)
  form.append('caption', document.caption)
  form.append(
    'document',
    new Blob([document.bytes], { type: document.contentType }),
    document.fileName,
  )

  const response = await fetch(`${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendDocument`, {
    method: 'POST',
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    body: form,
  })

  const parsed = sendResponseSchema.parse(await response.json())
  if (!parsed.ok) {
    throw new Error(`Telegram sendDocument failed: ${parsed.description ?? response.status}`)
  }

  logger.info('Telegram document sent')
}
