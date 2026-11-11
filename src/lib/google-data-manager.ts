import { z } from 'zod'
import { env } from '@/lib/env'
import { GoogleApiUnavailableError } from '@/lib/errors'
import { postToGoogle } from '@/lib/google-api'
import type { DataManagerConversionEvent } from '@/lib/google-data-manager-events'
import { logger } from '@/lib/logger'

// Google's Data Manager API, the successor of the Ads API's offline click
// upload: no developer token and no manager account, only an OAuth client
// whose refresh token an admin of the Ads account granted the
// https://www.googleapis.com/auth/datamanager scope.

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const INGEST_URL = 'https://datamanager.googleapis.com/v1/events:ingest'
const GOOGLE_ADS_ACCOUNT = 'GOOGLE_ADS'
// The Ads UI writes the account as «853-032-5809»; the API wants the digits.
const CUSTOMER_ID = /^\d{3}-?\d{3}-?\d{4}$/
const CUSTOMER_ID_DASHES = /-/g
// Renewed a minute early, so a slow request never goes out with a token
// that expires on the way.
const RENEW_EARLY_SECONDS = 60
const MS_PER_SECOND = 1000

type DataManagerConfig = {
  readonly clientId: string
  readonly clientSecret: string
  readonly refreshToken: string
  readonly customerId: string
  readonly conversionActionId: string
}

type CachedToken = {
  readonly refreshToken: string
  readonly value: string
  readonly expiresAt: number
}

const TokenAnswerSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
})

const IngestAnswerSchema = z.object({ requestId: z.string().min(1) })

let cachedToken: CachedToken | null = null

export function isDataManagerConfigured(): boolean {
  return readConfig() !== null
}

// Hands the conversions to Google and returns the request id its status is
// looked up by. Google checks the request at once and books it within hours;
// a refusal or an outage ends as GoogleApiUnavailableError.
export async function ingestConversionEvents(
  events: readonly DataManagerConversionEvent[],
): Promise<string> {
  const config = readConfig()
  if (!config) throw new GoogleApiUnavailableError('Data Manager is not configured')

  const answer = await postToGoogle(INGEST_URL, {
    headers: {
      Authorization: `Bearer ${await accessToken(config)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      destinations: [
        {
          operatingAccount: { accountType: GOOGLE_ADS_ACCOUNT, accountId: config.customerId },
          productDestinationId: config.conversionActionId,
        },
      ],
      events,
    }),
  })

  const parsed = IngestAnswerSchema.safeParse(answer)
  if (!parsed.success)
    throw new GoogleApiUnavailableError('the ingest answer came in an unexpected shape')
  return parsed.data.requestId
}

// Null while the push is off. A half-filled or mistyped set is off as well,
// but says so in the log: otherwise a bad paste in Vercel would silence the
// push without a trace.
function readConfig(): DataManagerConfig | null {
  const settings = {
    clientId: env.GOOGLE_DATA_MANAGER_CLIENT_ID,
    clientSecret: env.GOOGLE_DATA_MANAGER_CLIENT_SECRET,
    refreshToken: env.GOOGLE_DATA_MANAGER_REFRESH_TOKEN,
    customerId: env.GOOGLE_ADS_CUSTOMER_ID,
    conversionActionId: env.GOOGLE_ADS_SALE_CONVERSION_ACTION_ID,
  }
  const missing = Object.entries(settings).flatMap(([name, value]) => (value ? [] : [name]))
  if (missing.length === Object.keys(settings).length) return null

  const { clientId, clientSecret, refreshToken, customerId, conversionActionId } = settings
  if (!clientId || !clientSecret || !refreshToken || !customerId || !conversionActionId) {
    logger.warn('The Data Manager push is half configured and stays off', { missing })
    return null
  }
  if (!CUSTOMER_ID.test(customerId)) {
    logger.warn('GOOGLE_ADS_CUSTOMER_ID is not a ten-digit Ads account id; the push stays off')
    return null
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
    customerId: customerId.replace(CUSTOMER_ID_DASHES, ''),
    conversionActionId,
  }
}

async function accessToken(config: DataManagerConfig): Promise<string> {
  const now = Date.now()
  if (cachedToken?.refreshToken === config.refreshToken && cachedToken.expiresAt > now) {
    return cachedToken.value
  }

  const answer = await postToGoogle(TOKEN_URL, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  })

  const parsed = TokenAnswerSchema.safeParse(answer)
  if (!parsed.success)
    throw new GoogleApiUnavailableError('the token answer came in an unexpected shape')

  cachedToken = {
    refreshToken: config.refreshToken,
    value: parsed.data.access_token,
    expiresAt: now + (parsed.data.expires_in - RENEW_EARLY_SECONDS) * MS_PER_SECOND,
  }
  return parsed.data.access_token
}
