import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { isQuietHour } from '@/lib/quiet-hours'
import { isSharedSecretMatch } from '@/lib/shared-secret'

const BEARER_PREFIX = 'Bearer '

// Vercel sends CRON_SECRET as a bearer token with every scheduled call
// (vercel.json crons); anything else is refused and logged.
export function isCronRequest(request: Request, job: string): boolean {
  const header = request.headers.get('authorization')
  const token = header?.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length) : null
  if (isSharedSecretMatch(token, env.CRON_SECRET)) return true

  logger.warn('Cron call refused: wrong or missing secret', {
    job,
    isSecretConfigured: Boolean(env.CRON_SECRET),
  })
  return false
}

// The answer a scheduled job gives at night instead of running: 200, so
// the cron log shows a quiet skip and not a failure.
export function quietHoursSkip(job: string, now: Date): Response | null {
  if (!isQuietHour(now)) return null

  logger.info('Cron skipped for the night', { job })
  return Response.json({ skipped: 'quiet-hours', job })
}

// The shell every scheduled job runs in: the secret, the night, then the
// work; a failure answers 500 so it shows as such in the cron log.
export async function runCron(
  request: Request,
  job: string,
  work: () => Promise<unknown>,
): Promise<Response> {
  if (!isCronRequest(request, job)) return new Response('forbidden', { status: 403 })

  const night = quietHoursSkip(job, new Date())
  if (night) return night

  try {
    return Response.json(await work())
  } catch (error) {
    logger.error('Cron failed', { job, error })
    return new Response(`${job} failed`, { status: 500 })
  }
}
