import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '@/features/admin/services/password'

describe('password hashing', () => {
  it('accepts the password it hashed', async () => {
    const stored = await hashPassword('correct horse battery staple')

    expect(await verifyPassword('correct horse battery staple', stored)).toBe(true)
  })

  it('rejects a wrong password', async () => {
    const stored = await hashPassword('correct horse battery staple')

    expect(await verifyPassword('Correct horse battery staple', stored)).toBe(false)
  })

  it('salts every hash, so the same password stores differently', async () => {
    const first = await hashPassword('same password')
    const second = await hashPassword('same password')

    expect(first).not.toBe(second)
    expect(await verifyPassword('same password', second)).toBe(true)
  })

  it.each([
    ['an empty string', ''],
    ['a value without a separator', 'deadbeef'],
    ['a value with an empty hash half', 'deadbeef:'],
    ['a hash of the wrong length', 'deadbeef:aabb'],
  ])('rejects %s as a stored hash', async (_case, stored) => {
    expect(await verifyPassword('any password', stored)).toBe(false)
  })
})
