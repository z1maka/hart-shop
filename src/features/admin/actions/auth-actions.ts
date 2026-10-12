'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { adminAuthService } from '@/features/admin/services/admin-auth'
import { isLoginThrottled } from '@/features/admin/services/login-throttle'
import { createSessionToken } from '@/features/admin/services/session'
import { clearAdminCookie, writeAdminCookie } from '@/features/admin/session-cookie'
import { actionError, toActionError, type ActionResult } from '@/lib/action-result'
import { clientAddress } from '@/lib/request-context'

const SignInSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
})

export async function signInAction(input: unknown): Promise<ActionResult<never>> {
  const parsed = SignInSchema.safeParse(input)
  if (!parsed.success) return actionError('VALIDATION_FAILED', 'Enter an email and a password.')

  // Throttled before any scrypt work: password hashing is the expensive part,
  // so the limiter has to run in front of it, not after.
  if (isLoginThrottled(await clientAddress())) {
    return actionError('RATE_LIMITED', 'Too many attempts. Try again in a minute.')
  }

  try {
    const session = await adminAuthService.authenticate(parsed.data.email, parsed.data.password)
    await writeAdminCookie(await createSessionToken(session))
  } catch (error) {
    return toActionError(error)
  }

  redirect('/admin/catalog')
}

export async function signOutAction(): Promise<void> {
  await clearAdminCookie()
  redirect('/admin/login')
}
