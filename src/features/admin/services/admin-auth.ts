import { adminRepository } from '@/features/admin/repository/admin-repository'
import { verifyPassword } from '@/features/admin/services/password'
import { type AdminIdentity, type AdminSession } from '@/features/admin/services/session'
import { UnauthorizedError } from '@/lib/errors'
import { logger } from '@/lib/logger'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

export const adminAuthService = {
  async authenticate(email: string, password: string): Promise<AdminIdentity> {
    const admin = await adminRepository.findByEmail(email)

    // The same error for an unknown address, a locked account and a wrong
    // password: telling them apart hands an attacker a list of valid accounts.
    if (!admin) {
      logger.warn('Admin sign-in for unknown address', { email })
      throw new UnauthorizedError('Wrong email or password')
    }

    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      logger.warn('Admin sign-in while locked out', { email, until: admin.lockedUntil })
      throw new UnauthorizedError('Wrong email or password')
    }

    if (!(await verifyPassword(password, admin.passwordHash))) {
      await adminRepository.recordFailure(admin.id, MAX_ATTEMPTS, LOCK_MINUTES)
      logger.warn('Failed admin sign-in attempt', { email })
      throw new UnauthorizedError('Wrong email or password')
    }

    await adminRepository.recordSuccess(admin.id)

    return { adminId: admin.id, email: admin.email, role: admin.role }
  },

  // A token alone is not enough: the account must still exist and must not have
  // had its sessions revoked since the token was issued. The role comes back
  // from the row, not the token claim — a demotion applies on the next request
  // instead of surviving until the 8-hour token expires.
  async validateSession(session: AdminSession): Promise<AdminSession | null> {
    const admin = await adminRepository.findById(session.adminId)
    if (!admin) return null

    if (admin.sessionsValidFrom.getTime() > session.issuedAt * 1000) return null

    return { ...session, role: admin.role }
  },
}
