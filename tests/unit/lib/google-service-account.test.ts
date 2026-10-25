import { createVerify, generateKeyPairSync } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn() } }))

import { GoogleApiUnavailableError } from '@/lib/errors'
import {
  parseServiceAccount,
  serviceAccountClaims,
  serviceAccountToken,
  signServiceAccountJwt,
} from '@/lib/google-service-account'

const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'
const NOW_SECONDS = 1_792_900_000
const RSA_BITS = 2048
// A key made for this test only: nothing real is ever read here.
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: RSA_BITS,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
})
const keyJson = JSON.stringify({
  type: 'service_account',
  client_email: 'stats@hart-test.iam.gserviceaccount.com',
  private_key: privateKey,
})

function decodePart(part: string | undefined): unknown {
  return JSON.parse(Buffer.from(part ?? '', 'base64url').toString())
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parseServiceAccount', () => {
  it('reads the downloaded key and defaults the token address', () => {
    expect(parseServiceAccount(keyJson)).toEqual({
      clientEmail: 'stats@hart-test.iam.gserviceaccount.com',
      privateKey,
      tokenUri: 'https://oauth2.googleapis.com/token',
    })
  })

  it('refuses a broken paste or a key without its parts', () => {
    expect(() => parseServiceAccount('{"client_email":')).toThrow(GoogleApiUnavailableError)
    expect(() => parseServiceAccount('{"client_email":"a@b.com"}')).toThrow(
      GoogleApiUnavailableError,
    )
  })
})

describe('signServiceAccountJwt', () => {
  it('signs the claims Google expects with the account key', () => {
    const account = parseServiceAccount(keyJson)
    const jwt = signServiceAccountJwt(account, SCOPE, NOW_SECONDS)
    const [header, claims, signature] = jwt.split('.')

    expect(decodePart(header)).toEqual({ alg: 'RS256', typ: 'JWT' })
    expect(decodePart(claims)).toEqual(serviceAccountClaims(account, SCOPE, NOW_SECONDS))
    expect(
      createVerify('RSA-SHA256')
        .update(`${header}.${claims}`)
        .verify(publicKey, signature ?? '', 'base64url'),
    ).toBe(true)
  })

  it('asks for an hour from now, addressed to the token endpoint', () => {
    expect(serviceAccountClaims(parseServiceAccount(keyJson), SCOPE, NOW_SECONDS)).toEqual({
      iss: 'stats@hart-test.iam.gserviceaccount.com',
      scope: SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      iat: NOW_SECONDS,
      exp: NOW_SECONDS + 3600,
    })
  })

  it('turns a key that cannot sign into the domain error', () => {
    const account = { ...parseServiceAccount(keyJson), privateKey: 'not a key' }

    expect(() => signServiceAccountJwt(account, SCOPE, NOW_SECONDS)).toThrow(
      GoogleApiUnavailableError,
    )
  })
})

describe('serviceAccountToken', () => {
  it('asks Google once and reuses the token until it nears expiry', async () => {
    const fetchToken = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ access_token: 'ya29.test', expires_in: 3599 })),
    })
    vi.stubGlobal('fetch', fetchToken)
    const account = parseServiceAccount(keyJson)

    await expect(serviceAccountToken(account, SCOPE)).resolves.toBe('ya29.test')
    await expect(serviceAccountToken(account, SCOPE)).resolves.toBe('ya29.test')
    expect(fetchToken).toHaveBeenCalledTimes(1)
  })
})
