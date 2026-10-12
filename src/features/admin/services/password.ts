import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

const SALT_BYTES = 16
const KEY_LENGTH = 64

// scrypt from node:crypto rather than bcrypt: no native dependency to rebuild on
// every platform, and the parameters are explicit. See AGENTS.md §14.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer

  return `${salt.toString('hex')}:${derived.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false

  const derived = (await scryptAsync(password, Buffer.from(saltHex, 'hex'), KEY_LENGTH)) as Buffer
  const expected = Buffer.from(hashHex, 'hex')

  if (derived.length !== expected.length) return false

  return timingSafeEqual(derived, expected)
}
