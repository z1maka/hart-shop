import 'dotenv/config'
import { AdminRole } from '@/db/enums'
import { adminRepository } from '@/features/admin/repository/admin-repository'
import { hashPassword } from '@/features/admin/services/password'
import { closeDb } from '@/lib/db'

async function main(): Promise<void> {
  const [email, password, role = AdminRole.Owner] = process.argv.slice(2)

  if (!email || !password) {
    console.info('Usage: pnpm admin:create <email> <password> [owner|staff]')
    process.exitCode = 1
    return
  }

  if (password.length < 12) {
    console.error('Password must be at least 12 characters.')
    process.exitCode = 1
    return
  }

  const existing = await adminRepository.findByEmail(email)
  if (existing) {
    console.warn(`${email} already exists — this resets the password for that account.`)
  }

  const admin = await adminRepository.create(
    email,
    await hashPassword(password),
    role === AdminRole.Staff ? AdminRole.Staff : AdminRole.Owner,
  )

  console.info(
    `${existing ? 'Password reset for' : 'Admin created:'} ${admin.email} (${admin.role})`,
  )
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(closeDb)
