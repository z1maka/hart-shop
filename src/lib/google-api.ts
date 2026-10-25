import { GoogleApiUnavailableError } from '@/lib/errors'
import { logger } from '@/lib/logger'

const REQUEST_TIMEOUT_MS = 15_000
const LOGGED_BODY_LENGTH = 300

export type GoogleRequest = {
  readonly headers: Record<string, string>
  readonly body: string
}

type GoogleAnswer = {
  readonly isOk: boolean
  readonly status: number
  readonly text: string
}

// One POST to a Google API, answered as parsed JSON. A network failure, a
// timeout, a refusal or a non-JSON answer all end as GoogleApiUnavailableError:
// the admin page shows its earnings without the ad spend whichever it was.
export async function postToGoogle(url: string, request: GoogleRequest): Promise<unknown> {
  const host = new URL(url).host
  const answer = await send(url, request, host)

  if (!answer.isOk) {
    logger.warn('Google API refused a call', {
      host,
      status: answer.status,
      body: answer.text.slice(0, LOGGED_BODY_LENGTH),
    })
    throw new GoogleApiUnavailableError(`${host} answered ${answer.status}`)
  }

  return parseJson(answer.text, host)
}

async function send(url: string, request: GoogleRequest, host: string): Promise<GoogleAnswer> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: request.headers,
      body: request.body,
    })
    return { isOk: response.ok, status: response.status, text: await response.text() }
  } catch (error) {
    logger.warn('Google API did not answer', { host, error })
    throw new GoogleApiUnavailableError(`${host} did not answer`)
  }
}

function parseJson(text: string, host: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    logger.warn('Google API answered without JSON', {
      host,
      body: text.slice(0, LOGGED_BODY_LENGTH),
    })
    throw new GoogleApiUnavailableError(`${host} answered without JSON`)
  }
}
