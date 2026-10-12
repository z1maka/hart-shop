import nodemailer, { type Transporter } from 'nodemailer'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

type SendMailInput = {
  readonly to: string
  readonly subject: string
  readonly html: string
  readonly text: string
  // Overrides the shop's own inbox. On a notification we send to ourselves,
  // Reply should open a message to the person who wrote in, not to us.
  readonly replyTo?: string
}

// nodemailer waits minutes by default; a mail server that hangs must fail
// fast enough for the request or the cron that sent the mail to finish.
const SMTP_CONNECT_TIMEOUT_MS = 10_000
const SMTP_GREETING_TIMEOUT_MS = 10_000
const SMTP_SOCKET_TIMEOUT_MS = 30_000

const globalForMailer = globalThis as unknown as { foxMailTransport?: Transporter }

const transport =
  globalForMailer.foxMailTransport ??
  nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    connectionTimeout: SMTP_CONNECT_TIMEOUT_MS,
    greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
  })

globalForMailer.foxMailTransport = transport

export async function sendMail(input: SendMailInput): Promise<void> {
  const info = await transport.sendMail({
    from: env.ORDER_EMAIL_FROM,
    bcc: env.ORDER_EMAIL_BCC,
    replyTo: input.replyTo ?? env.ORDER_EMAIL_REPLY_TO,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })

  logger.info('Email sent', { messageId: info.messageId, to: input.to, subject: input.subject })
}
