import { createSign } from 'node:crypto'
import { z } from 'zod'
import { GoogleApiUnavailableError } from '@/lib/errors'
import { postToGoogle } from '@/lib/google-api'
import { logger } from '@/lib/logger'

// A server-to-server sign-in with a service account's key: a JWT signed with
// its private key is traded for an hour-long access token (Google's OAuth 2.0
// for service accounts). node:crypto signs it, so no Google SDK is needed.

const DEFAULT_TOKEN_URI = 'https://oauth2.googleapis.com/token'
const JWT_BEARER_GRANT = 'urn:ietf:params:oauth:grant-type:jwt-bearer'
const TOKEN_LIFETIME_SECONDS = 3600
// Renewed a minute early, so a slow report never goes out with a token that
// expires on the way.
const RENEW_EARLY_SECONDS = 60
const MS_PER_SECOND = 1000

const ServiceAccountKeySchema = z.object({
  client_email: z.email(),
  private_key: z.string().min(1),
  token_uri: z.url().optional(),
})

const TokenAnswerSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
})

export type ServiceAccount = {
  readonly clientEmail: string
  readonly privateKey: string
  readonly tokenUri: string
}

export type ServiceAccountClaims = {
  readonly iss: string
  readonly scope: string
  readonly aud: string
  readonly iat: number
  readonly exp: number
}

type CachedToken = {
  readonly key: string
  readonly value: string
  readonly expiresAt: number
}

let cachedToken: CachedToken | null = null

export function parseServiceAccount(json: string): ServiceAccount {
  const parsed = ServiceAccountKeySchema.safeParse(readKeyJson(json))
  if (!parsed.success) {
    logger.warn('The Google service account key lacks its email or private key')
    throw new GoogleApiUnavailableError('the service account key is not a JSON key file')
  }

  return {
    clientEmail: parsed.data.client_email,
    privateKey: parsed.data.private_key,
    tokenUri: parsed.data.token_uri ?? DEFAULT_TOKEN_URI,
  }
}

export function serviceAccountClaims(
  account: ServiceAccount,
  scope: string,
  nowSeconds: number,
): ServiceAccountClaims {
  return {
    iss: account.clientEmail,
    scope,
    aud: account.tokenUri,
    iat: nowSeconds,
    exp: nowSeconds + TOKEN_LIFETIME_SECONDS,
  }
}

export function signServiceAccountJwt(
  account: ServiceAccount,
  scope: string,
  nowSeconds: number,
): string {
  const header = base64Url({ alg: 'RS256', typ: 'JWT' })
  const claims = base64Url(serviceAccountClaims(account, scope, nowSeconds))
  const signature = signWith(account.privateKey, `${header}.${claims}`)
  return `${header}.${claims}.${signature}`
}

export async function serviceAccountToken(account: ServiceAccount, scope: string): Promise<string> {
  const now = Date.now()
  const key = `${account.clientEmail} ${scope}`
  if (cachedToken?.key === key && cachedToken.expiresAt > now) return cachedToken.value

  const answer = await requestToken(account, scope, Math.floor(now / MS_PER_SECOND))
  cachedToken = {
    key,
    value: answer.access_token,
    expiresAt: now + (answer.expires_in - RENEW_EARLY_SECONDS) * MS_PER_SECOND,
  }
  return answer.access_token
}

async function requestToken(
  account: ServiceAccount,
  scope: string,
  nowSeconds: number,
): Promise<z.infer<typeof TokenAnswerSchema>> {
  const answer = await postToGoogle(account.tokenUri, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: JWT_BEARER_GRANT,
      assertion: signServiceAccountJwt(account, scope, nowSeconds),
    }).toString(),
  })

  const parsed = TokenAnswerSchema.safeParse(answer)
  if (!parsed.success)
    throw new GoogleApiUnavailableError('the token answer came in an unexpected shape')
  return parsed.data
}

function signWith(privateKey: string, payload: string): string {
  try {
    return createSign('RSA-SHA256').update(payload).sign(privateKey, 'base64url')
  } catch {
    logger.warn('The Google service account key cannot sign')
    throw new GoogleApiUnavailableError('the service account key cannot sign')
  }
}

function base64Url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

// Logs without the parser's message: it would quote a piece of the key.
function readKeyJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    logger.warn('The Google service account key is not valid JSON')
    return null
  }
}
