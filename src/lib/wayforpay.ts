import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '@/lib/env'

const WAYFORPAY_API = 'https://api.wayforpay.com/api'
const REQUEST_TIMEOUT_MS = 20_000

export function isWayforpayConfigured(): boolean {
  return Boolean(env.WAYFORPAY_MERCHANT_ACCOUNT && env.WAYFORPAY_MERCHANT_SECRET)
}

// Every WayForPay message is signed the same way: the documented field list,
// joined with semicolons, HMAC-MD5 under the merchant secret (their spec
// predates better digests; the transport is TLS).
export function wayforpaySignature(fields: readonly (string | number)[]): string {
  const secret = env.WAYFORPAY_MERCHANT_SECRET
  if (!secret) throw new Error('WayForPay is not configured')

  return createHmac('md5', secret).update(fields.join(';')).digest('hex')
}

export function isValidWayforpaySignature(
  fields: readonly (string | number)[],
  candidate: string,
): boolean {
  const expected = Buffer.from(wayforpaySignature(fields))
  const received = Buffer.from(candidate)
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export async function wayforpayRequest<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch(WAYFORPAY_API, {
    method: 'POST',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`WayForPay returned ${response.status}: ${text.slice(0, 200)}`)
  }

  return JSON.parse(text) as T
}
