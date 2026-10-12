import 'dotenv/config'
import { adminRepository } from '@/features/admin/repository/admin-repository'
import { closeDb } from '@/lib/db'

async function main(): Promise<void> {
  const [email] = process.argv.slice(2)

  if (!email) {
    console.info('Usage: pnpm admin:revoke <email>')
    process.exitCode = 1
    return
  }

  const admin = await adminRepository.findByEmail(email)
  if (!admin) {
    console.error(`No admin with address ${email}.`)
    process.exitCode = 1
    return
  }

  await adminRepository.revokeSessions(admin.id)

  console.info(`Signed ${admin.email} out of every browser.`)
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(closeDb)
