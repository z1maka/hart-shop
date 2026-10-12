import { createHash, createPublicKey, createVerify } from 'node:crypto'
import { monoStatusOf } from '@/features/checkout/model/acquirer-status'
import type {
  CreatePaymentInput,
  PaymentEvent,
  PaymentProvider,
  PaymentSession,
  PaymentStatus,
} from '@/features/checkout/model/payment'
import { createMoney, type Currency, type Money } from '@/lib/money'
import { logger } from '@/lib/logger'
import { monoRequest } from '@/lib/mono'

// ISO 4217 numeric codes; the shop prices in euro, so invoices are raised in euro.
const CURRENCY_CODES: Record<Currency, number> = {
  EUR: 978,
  UAH: 980,
}

const INVOICE_VALIDITY_SECONDS = 60 * 60 * 3

type MonoInvoiceResponse = {
  readonly invoiceId: string
  readonly pageUrl: string
}

type MonoStatusResponse = {
  readonly invoiceId: string
  readonly status: string
  readonly reference?: string
  readonly amount?: number
  readonly ccy?: number
}

let cachedPublicKey: string | null = null

export const monoPaymentProvider: PaymentProvider = {
  id: 'mono',
  webhookPath: '/api/webhooks/payment/',

  async createPayment(input: CreatePaymentInput): Promise<PaymentSession> {
    const invoice = await monoRequest<MonoInvoiceResponse>('/invoice/create', {
      method: 'POST',
      body: {
        amount: input.amount.amountCents,
        ccy: CURRENCY_CODES[input.amount.currency],
        redirectUrl: input.returnUrl,
        webHookUrl: input.webhookUrl,
        validity: INVOICE_VALIDITY_SECONDS,
        paymentType: 'debit',
        merchantPaymInfo: {
          reference: input.reference,
          destination: `Order ${input.reference}`,
          customerEmails: input.customerEmail ? [input.customerEmail] : undefined,
          // Their schema: sum is the price of one unit, total is the line.
          // The code is required — it is what the receipt prints.
          basketOrder: input.lines.map((line) => ({
            name: line.name,
            qty: line.quantity,
            sum: line.unitPrice.amountCents,
            total: line.unitPrice.amountCents * line.quantity,
            code: line.code,
            unit: 'шт.',
            icon: line.imageUrl ?? undefined,
          })),
        },
      },
    })

    return { providerRef: invoice.invoiceId, redirectUrl: invoice.pageUrl }
  },

  async getStatus(providerRef: string): Promise<PaymentStatus> {
    const result = await monoRequest<MonoStatusResponse>(
      `/invoice/status?invoiceId=${encodeURIComponent(providerRef)}`,
    )

    return monoStatusOf(result.status)
  },

  // The signature is over the raw body, so the route handler must pass the exact
  // bytes monobank sent, never a re-serialised object.
  async verifyWebhook(rawBody: string, signature: string | null): Promise<PaymentEvent | null> {
    if (!signature) {
      logger.warn('monobank webhook without a signature header')
      return null
    }

    const publicKey = await getPublicKey()
    const verifier = createVerify('SHA256')
    verifier.update(rawBody)
    verifier.end()

    const isValid = verifier.verify(
      createPublicKey(Buffer.from(publicKey, 'base64')),
      Buffer.from(signature, 'base64'),
    )

    if (!isValid) {
      logger.error('monobank webhook signature did not verify', {
        digest: createHash('sha256').update(rawBody).digest('hex').slice(0, 16),
      })
      return null
    }

    const payload = JSON.parse(rawBody) as MonoStatusResponse

    return {
      providerRef: payload.invoiceId,
      reference: payload.reference ?? null,
      status: monoStatusOf(payload.status),
      amount: toMoney(payload.amount, payload.ccy),
    }
  },
}

async function getPublicKey(): Promise<string> {
  if (cachedPublicKey) return cachedPublicKey

  const result = await monoRequest<{ key: string }>('/pubkey')
  cachedPublicKey = result.key
  return result.key
}

function toMoney(amount: number | undefined, ccy: number | undefined): Money | null {
  if (amount === undefined) return null

  const currency = (Object.keys(CURRENCY_CODES) as Currency[]).find(
    (code) => CURRENCY_CODES[code] === ccy,
  )

  return currency ? createMoney(amount, currency) : null
}
