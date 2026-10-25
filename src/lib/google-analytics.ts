import { z } from 'zod'
import { env } from '@/lib/env'
import { GoogleApiUnavailableError } from '@/lib/errors'
import { postToGoogle } from '@/lib/google-api'
import { parseServiceAccount, serviceAccountToken } from '@/lib/google-service-account'
import { logger } from '@/lib/logger'

// GA4's Data API, read by a service account the property lists as a viewer.
// Google Ads spend reaches GA4 through the Ads ↔ GA4 link, so one read
// covers it without the Ads API and its developer token.

const DATA_API = 'https://analyticsdata.googleapis.com/v1beta'
const READONLY_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
const AD_COST_METRIC = 'advertiserAdCost'
const DAY_DIMENSION = 'date'
// GA refuses advertiser cost by date alone («dimensions & metrics are
// incompatible»): it wants a campaign beside it, so the report comes per day
// and campaign and the campaigns of a day are added up.
const CAMPAIGN_DIMENSION = 'sessionCampaignName'
// The property reports money in its own currency; the shop's is the hryvnia.
const PROPERTY_CURRENCY = 'UAH'
const KOPIYKAS_PER_HRYVNIA = 100
const GA_DAY = /^(\d{4})(\d{2})(\d{2})$/
// «558472171» as GA4 shows it, or «properties/558472171» as its API names it.
const PROPERTY_ID = /^(?:properties\/)?(\d+)$/

const ReportSchema = z.object({
  rows: z
    .array(
      z.object({
        dimensionValues: z.tuple([
          z.object({ value: z.string().regex(GA_DAY).transform(isoDayOfGaDay) }),
          z.object({ value: z.string() }),
        ]),
        metricValues: z.tuple([z.object({ value: z.coerce.number().min(0) })]),
      }),
    )
    .default([]),
  metadata: z.object({ currencyCode: z.string().optional() }).optional(),
})

export type DailyAdCost = {
  // «2026-10-25» on the property's clock.
  readonly day: string
  readonly costCents: number
}

export function isGoogleAnalyticsConfigured(): boolean {
  return Boolean(env.GA4_SERVICE_ACCOUNT_JSON && env.GA4_PROPERTY_ID)
}

// Google Ads spend per day from `from` to `to`, both included. Days without
// spend are simply missing from the answer.
export async function fetchDailyAdCost(from: string, to: string): Promise<DailyAdCost[]> {
  const { GA4_SERVICE_ACCOUNT_JSON: keyJson, GA4_PROPERTY_ID: rawPropertyId } = env
  if (!keyJson || !rawPropertyId) throw new GoogleApiUnavailableError('Analytics is not configured')
  const propertyId = PROPERTY_ID.exec(rawPropertyId)?.[1]
  if (!propertyId) {
    logger.warn('GA4_PROPERTY_ID is not a GA4 property id')
    throw new GoogleApiUnavailableError('GA4_PROPERTY_ID is not a property id')
  }

  const token = await serviceAccountToken(parseServiceAccount(keyJson), READONLY_SCOPE)
  const answer = await postToGoogle(`${DATA_API}/properties/${propertyId}:runReport`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRanges: [{ startDate: from, endDate: to }],
      dimensions: [{ name: DAY_DIMENSION }, { name: CAMPAIGN_DIMENSION }],
      metrics: [{ name: AD_COST_METRIC }],
    }),
  })

  return parseAdCostReport(answer)
}

export function parseAdCostReport(answer: unknown): DailyAdCost[] {
  const parsed = ReportSchema.safeParse(answer)
  if (!parsed.success) {
    logger.warn('GA4 ad cost report came in an unexpected shape', { issues: parsed.error.issues })
    throw new GoogleApiUnavailableError('the ad cost report came in an unexpected shape')
  }

  const currency = parsed.data.metadata?.currencyCode
  if (currency !== undefined && currency !== PROPERTY_CURRENCY) {
    throw new GoogleApiUnavailableError(`the property reports money in ${currency}`)
  }

  const byDay = new Map<string, number>()
  parsed.data.rows.forEach((row) => {
    const day = row.dimensionValues[0].value
    byDay.set(day, (byDay.get(day) ?? 0) + row.metricValues[0].value)
  })

  return [...byDay].map(([day, cost]) => ({
    day,
    costCents: Math.round(cost * KOPIYKAS_PER_HRYVNIA),
  }))
}

function isoDayOfGaDay(gaDay: string): string {
  return gaDay.replace(GA_DAY, '$1-$2-$3')
}
