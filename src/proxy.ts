import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_COOKIE, readSessionToken } from '@/features/admin/services/session'

const LOGIN_PATH = '/admin/login'

// Imported straight from the session module, not the feature barrel: Proxy runs
// ahead of the app and must not pull the database stack into its bundle.
// A signed token is enough to route the request; whether the session is still
// live is decided next to the data, in the admin queries and actions. The login
// page stays reachable with a signed cookie on purpose — a revoked session is
// sent here, and bouncing it back would loop.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // trailingSlash: true canonicalises /admin/login to /admin/login/, so the
  // guard compares without the slash — otherwise it redirects in a loop.
  const path = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

  if (path === LOGIN_PATH) return NextResponse.next()

  const token = request.cookies.get(ADMIN_COOKIE)?.value
  const hasSignedSession = token ? (await readSessionToken(token)) !== null : false

  if (hasSignedSession) return NextResponse.next()

  return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
}

export const config = {
  // The storefront needs no proxy work — only the admin area is guarded.
  matcher: ['/admin', '/admin/:path*'],
}
