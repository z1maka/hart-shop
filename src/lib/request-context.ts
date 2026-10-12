import { headers } from 'next/headers'
import { env } from '@/lib/env'

const HOST = /^[a-z0-9.-]+(:\d{1,5})?$/i
const PLAIN_HTTP_HOSTS = /^(localhost|127\.0\.0\.1)(:\d+)?$/

// The origin the current request reached this app on. Acquirers must call
// back and return the buyer to the deployment that took the order: the
// configured site URL is the canonical, indexed domain, and it can name a
// site this app does not serve yet — before the DNS switch it is WordPress.
export async function requestOrigin(): Promise<string> {
  const store = await headers()
  const host = store.get('x-forwarded-host') ?? store.get('host')
  if (!host || !HOST.test(host)) return env.NEXT_PUBLIC_SITE_URL

  const protocol =
    store.get('x-forwarded-proto') ?? (PLAIN_HTTP_HOSTS.test(host) ? 'http' : 'https')

  return `${protocol === 'http' ? 'http' : 'https'}://${host.toLowerCase()}`
}

// The address a throttle keys on: the first hop the platform's proxy saw.
export async function clientAddress(): Promise<string> {
  const forwarded = (await headers()).get('x-forwarded-for') ?? ''
  return forwarded.split(',')[0]?.trim() || 'unknown'
}
