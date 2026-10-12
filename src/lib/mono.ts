import { env } from '@/lib/env'

const MONO_API_BASE = 'https://api.monobank.ua/api/merchant'
const REQUEST_TIMEOUT_MS = 20_000

// The merchant account does not exist yet and the token is a placeholder, so
// the shop must not offer a card route it cannot honour. One flag, flipped by
// putting a real token in the environment.
const PLACEHOLDER_PREFIX = 'PLACEHOLDER'

export function isMonoConfigured(): boolean {
  return env.MONO_TOKEN.trim() !== '' && !env.MONO_TOKEN.startsWith(PLACEHOLDER_PREFIX)
}

export async function monoRequest<T>(
  path: string,
  init: { readonly method: 'GET' | 'POST'; readonly body?: unknown } = { method: 'GET' },
): Promise<T> {
  const response = await fetch(`${MONO_API_BASE}${path}`, {
    method: init.method,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      'X-Token': env.MONO_TOKEN,
      'Content-Type': 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`monobank ${path} returned ${response.status}: ${text.slice(0, 200)}`)
  }

  return JSON.parse(text) as T
}
