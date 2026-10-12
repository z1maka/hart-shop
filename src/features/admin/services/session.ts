import { SignJWT, jwtVerify } from 'jose'
import type { AdminRole } from '@/db/enums'
import { env } from '@/lib/env'

export const ADMIN_COOKIE = 'hart_admin'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8

export type AdminIdentity = {
  readonly adminId: string
  readonly email: string
  readonly role: AdminRole
}

export type AdminSession = AdminIdentity & {
  readonly issuedAt: number
}

const secret = new TextEncoder().encode(env.ADMIN_SESSION_SECRET)
const ISSUER = 'hart-shop'

export async function createSessionToken(session: AdminIdentity): Promise<string> {
  return new SignJWT({ email: session.email, role: session.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.adminId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secret)
}

export async function readSessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: ISSUER })

    if (!payload.sub || typeof payload.email !== 'string' || typeof payload.role !== 'string') {
      return null
    }

    return {
      adminId: payload.sub,
      email: payload.email,
      role: payload.role as AdminRole,
      issuedAt: payload.iat ?? 0,
    }
  } catch {
    // An unreadable token is simply not a session; the caller redirects to login.
    return null
  }
}
