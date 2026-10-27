import { GOOGLE_ADS_IMPORT } from '@/config/google-ads-import'
import { googleAdsConversionsCsv } from '@/features/orders'
import { env } from '@/lib/env'
import { isSharedSecretMatch } from '@/lib/shared-secret'

const BASIC_SCHEME = 'Basic '

// Google Ads' scheduled upload (source HTTPS) fetches the shop's ad sales
// here with the login from config/google-ads-import.ts — an external
// consumer, so a route (AGENTS.md §5). Without GOOGLE_ADS_IMPORT_PASSWORD it
// refuses every call.
export async function GET(request: Request): Promise<Response> {
  if (!isGoogleAdsLogin(request.headers.get('authorization'))) {
    return new Response('unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="google-ads"' },
    })
  }

  return new Response(await googleAdsConversionsCsv(new Date()), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function isGoogleAdsLogin(authorization: string | null): boolean {
  if (!authorization?.startsWith(BASIC_SCHEME)) return false

  const credentials = Buffer.from(authorization.slice(BASIC_SCHEME.length), 'base64').toString()
  const expected = env.GOOGLE_ADS_IMPORT_PASSWORD
    ? `${GOOGLE_ADS_IMPORT.username}:${env.GOOGLE_ADS_IMPORT_PASSWORD}`
    : undefined
  return isSharedSecretMatch(credentials, expected)
}
