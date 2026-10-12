import { z } from 'zod'
import { wayforpayStatusOf } from '@/features/checkout/model/acquirer-status'
import type {
  CreatePaymentInput,
  PaymentEvent,
  PaymentProvider,
  PaymentSession,
  PaymentStatus,
} from '@/features/checkout/model/payment'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { createMoney, Currency } from '@/lib/money'
import {
  isValidWayforpaySignature,
  wayforpayRequest,
  wayforpaySignature,
} from '@/lib/wayforpay'

const CURRENCY = 'UAH'
const API_VERSION = 1

const invoiceResponseSchema = z.object({
  reasonCode: z.number(),
  reason: z.string(),
  invoiceUrl: z.string().optional(),
})

const statusResponseSchema = z.object({
  reasonCode: z.number().optional(),
  transactionStatus: z.string().optional(),
})

const webhookSchema = z.object({
  merchantAccount: z.string(),
  orderReference: z.string(),
  amount: z.number(),
  currency: z.string(),
  authCode: z.string().nullish(),
  cardPan: z.string().nullish(),
  transactionStatus: z.string(),
  reasonCode: z.union([z.string(), z.number()]),
  merchantSignature: z.string(),
})

const INVOICE_OK = 1100

// Amounts travel as decimal currency units; the same JS number feeds both the
// JSON body and the signature string, so the two can never disagree.
function toMajorUnits(cents: number): number {
  return cents / 100
}

function merchantDomain(): string {
  return new URL(env.NEXT_PUBLIC_SITE_URL).host
}

export const wayforpayPaymentProvider: PaymentProvider = {
  id: 'wayforpay',
  webhookPath: '/api/webhooks/wayforpay/',

  async createPayment(input: CreatePaymentInput): Promise<PaymentSession> {
    const merchantAccount = env.WAYFORPAY_MERCHANT_ACCOUNT
    if (!merchantAccount) throw new Error('WayForPay is not configured')

    const orderDate = Math.floor(Date.now() / 1000)
    const amount = toMajorUnits(input.amount.amountCents)
    const names = input.lines.map((line) => line.name)
    const counts = input.lines.map((line) => line.quantity)
    const prices = input.lines.map((line) => toMajorUnits(line.unitPrice.amountCents))

    const response = await wayforpayRequest<unknown>({
      transactionType: 'CREATE_INVOICE',
      apiVersion: API_VERSION,
      merchantAccount,
      merchantDomainName: merchantDomain(),
      merchantAuthType: 'SimpleSignature',
      serviceUrl: input.webhookUrl,
      returnUrl: input.returnUrl,
      orderReference: input.reference,
      orderDate,
      amount,
      currency: CURRENCY,
      productName: names,
      productCount: counts,
      productPrice: prices,
      ...(input.customerEmail ? { clientEmail: input.customerEmail } : {}),
      merchantSignature: wayforpaySignature([
        merchantAccount,
        merchantDomain(),
        input.reference,
        orderDate,
        amount,
        CURRENCY,
        ...names,
        ...counts,
        ...prices,
      ]),
    })

    const invoice = invoiceResponseSchema.parse(response)
    if (invoice.reasonCode !== INVOICE_OK || !invoice.invoiceUrl) {
      throw new Error(`WayForPay invoice refused: ${invoice.reasonCode} ${invoice.reason}`)
    }

    // WayForPay keys the whole transaction by orderReference — it has no
    // separate invoice id, so the reference doubles as the provider ref.
    return { providerRef: input.reference, redirectUrl: invoice.invoiceUrl }
  },

  async getStatus(providerRef: string): Promise<PaymentStatus> {
    const merchantAccount = env.WAYFORPAY_MERCHANT_ACCOUNT
    if (!merchantAccount) throw new Error('WayForPay is not configured')

    const response = await wayforpayRequest<unknown>({
      transactionType: 'CHECK_STATUS',
      apiVersion: API_VERSION,
      merchantAccount,
      orderReference: providerRef,
      merchantSignature: wayforpaySignature([merchantAccount, providerRef]),
    })

    const status = statusResponseSchema.parse(response)
    return wayforpayStatusOf(status.transactionStatus)
  },

  // WayForPay signs inside the JSON body, not in a header; the route passes
  // the raw bytes and a null signature.
  async verifyWebhook(rawBody: string): Promise<PaymentEvent | null> {
    const parsed = webhookSchema.safeParse(safeJson(rawBody))
    if (!parsed.success) {
      logger.warn('WayForPay webhook with an unexpected shape')
      return null
    }

    const body = parsed.data
    const isValid = isValidWayforpaySignature(
      [
        body.merchantAccount,
        body.orderReference,
        body.amount,
        body.currency,
        body.authCode ?? '',
        body.cardPan ?? '',
        body.transactionStatus,
        body.reasonCode,
      ],
      body.merchantSignature,
    )

    if (!isValid) {
      logger.error('WayForPay webhook signature did not verify', {
        orderReference: body.orderReference,
      })
      return null
    }

    return {
      providerRef: body.orderReference,
      reference: body.orderReference,
      status: wayforpayStatusOf(body.transactionStatus),
      amount:
        body.currency === CURRENCY
          ? createMoney(Math.round(body.amount * 100), Currency.Uah)
          : null,
    }
  },
}

// The acknowledgement WayForPay expects back from the webhook endpoint; it
// retries the callback until it receives this signed accept.
export function wayforpayWebhookAck(orderReference: string): Record<string, unknown> {
  const time = Math.floor(Date.now() / 1000)
  return {
    orderReference,
    status: 'accept',
    time,
    signature: wayforpaySignature([orderReference, 'accept', time]),
  }
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
