import { cookies } from 'next/headers'
import { cache } from 'react'
import { adminAuthService } from '@/features/admin/services/admin-auth'
import { redirect } from 'next/navigation'
import {
  ADMIN_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  readSessionToken,
  type AdminSession,
} from '@/features/admin/services/session'

// cache() collapses the layout's counters, the page query and the actions of
// one request into a single database check instead of four to six.
export const readAdminSession = cache(async (): Promise<AdminSession | null> => {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value
  if (!token) return null

  const session = await readSessionToken(token)
  if (!session) return null

  // A valid signature is not enough: the account may have been removed or had
  // its sessions revoked since this token was issued.
  return adminAuthService.validateSession(session)
})

export async function writeAdminCookie(token: string): Promise<void> {
  const store = await cookies()

  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export async function clearAdminCookie(): Promise<void> {
  ;(await cookies()).delete(ADMIN_COOKIE)
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await readAdminSession()
  if (!session) redirect('/admin/login')

  return session
}
