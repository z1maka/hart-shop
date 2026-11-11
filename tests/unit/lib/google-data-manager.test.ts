import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  env: {} as Record<string, string | undefined>,
  postToGoogle: vi.fn(),
  warn: vi.fn(),
}))

vi.mock('@/lib/env', () => ({ env: mocks.env }))
vi.mock('@/lib/google-api', () => ({ postToGoogle: mocks.postToGoogle }))
vi.mock('@/lib/logger', () => ({ logger: { warn: mocks.warn } }))

import { GoogleApiUnavailableError } from '@/lib/errors'
import { ingestConversionEvents, isDataManagerConfigured } from '@/lib/google-data-manager'
import type { DataManagerConversionEvent } from '@/lib/google-data-manager-events'

const CONFIGURED = {
  GOOGLE_DATA_MANAGER_CLIENT_ID: 'client-1.apps.googleusercontent.com',
  GOOGLE_DATA_MANAGER_CLIENT_SECRET: 'client-secret',
  GOOGLE_DATA_MANAGER_REFRESH_TOKEN: 'refresh-1',
  GOOGLE_ADS_CUSTOMER_ID: '853-032-5809',
  GOOGLE_ADS_SALE_CONVERSION_ACTION_ID: '7884414690',
}

const EVENT: DataManagerConversionEvent = {
  adIdentifiers: { gclid: 'CjwKCAjwl4HXBhAjEiwAHlpWhNjyMOWk' },
  eventTimestamp: '2026-11-11T10:00:00.000Z',
  transactionId: 'HART-2026-000081',
  conversionValue: 2_900,
  currency: 'UAH',
  eventSource: 'WEB',
  consent: { adUserData: 'CONSENT_GRANTED', adPersonalization: 'CONSENT_GRANTED' },
}

function configure(values: Record<string, string | undefined>) {
  Object.keys(mocks.env).forEach((key) => delete mocks.env[key])
  Object.assign(mocks.env, values)
}

// Each test signs in with its own refresh token, so the cached access token
// of an earlier test never answers for it.
let tokenCounter = 0
function configureFresh(overrides: Record<string, string | undefined> = {}) {
  tokenCounter += 1
  configure({
    ...CONFIGURED,
    GOOGLE_DATA_MANAGER_REFRESH_TOKEN: `refresh-${tokenCounter}`,
    ...overrides,
  })
}

function answerTokenThenIngest(requestId = 'request-1') {
  mocks.postToGoogle
    .mockResolvedValueOnce({ access_token: 'access-1', expires_in: 3599 })
    .mockResolvedValueOnce({ requestId })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('isDataManagerConfigured', () => {
  it('needs the client, the token, the account and the action', () => {
    configure(CONFIGURED)
    expect(isDataManagerConfigured()).toBe(true)

    Object.keys(CONFIGURED).forEach((key) => {
      configure({ ...CONFIGURED, [key]: undefined })
      expect(isDataManagerConfigured()).toBe(false)
    })
  })

  it('refuses an account id that is not ten digits, and says so', () => {
    configure({ ...CONFIGURED, GOOGLE_ADS_CUSTOMER_ID: '853 032 5809' })

    expect(isDataManagerConfigured()).toBe(false)
    expect(mocks.warn).toHaveBeenCalledTimes(1)
  })

  it('names what is missing from a half-filled set', () => {
    configure({ ...CONFIGURED, GOOGLE_DATA_MANAGER_REFRESH_TOKEN: undefined })

    expect(isDataManagerConfigured()).toBe(false)
    expect(mocks.warn).toHaveBeenCalledWith(expect.any(String), { missing: ['refreshToken'] })
  })

  it('stays quiet where the push is simply not set up', () => {
    configure({})

    expect(isDataManagerConfigured()).toBe(false)
    expect(mocks.warn).not.toHaveBeenCalled()
  })
})

describe('ingestConversionEvents', () => {
  it('trades the refresh token for access and books the events on the action', async () => {
    configureFresh()
    answerTokenThenIngest()

    await expect(ingestConversionEvents([EVENT])).resolves.toBe('request-1')

    const [tokenUrl, tokenRequest] = mocks.postToGoogle.mock.calls[0] ?? []
    expect(tokenUrl).toBe('https://oauth2.googleapis.com/token')
    expect(new URLSearchParams(tokenRequest.body).get('grant_type')).toBe('refresh_token')

    const [ingestUrl, ingestRequest] = mocks.postToGoogle.mock.calls[1] ?? []
    expect(ingestUrl).toBe('https://datamanager.googleapis.com/v1/events:ingest')
    expect(ingestRequest.headers.Authorization).toBe('Bearer access-1')
    expect(JSON.parse(ingestRequest.body)).toEqual({
      destinations: [
        {
          operatingAccount: { accountType: 'GOOGLE_ADS', accountId: '8530325809' },
          productDestinationId: '7884414690',
        },
      ],
      events: [EVENT],
    })
  })

  it('reuses the access token until it is about to expire', async () => {
    configureFresh()
    answerTokenThenIngest('request-1')
    mocks.postToGoogle.mockResolvedValueOnce({ requestId: 'request-2' })

    await ingestConversionEvents([EVENT])
    await expect(ingestConversionEvents([EVENT])).resolves.toBe('request-2')

    expect(mocks.postToGoogle).toHaveBeenCalledTimes(3)
  })

  it('refuses to send when it is not configured', async () => {
    configure({})

    await expect(ingestConversionEvents([EVENT])).rejects.toThrow(GoogleApiUnavailableError)
    expect(mocks.postToGoogle).not.toHaveBeenCalled()
  })

  it('reports an answer it cannot read as Google being unavailable', async () => {
    configureFresh()
    mocks.postToGoogle
      .mockResolvedValueOnce({ access_token: 'access-1', expires_in: 3599 })
      .mockResolvedValueOnce({ unexpected: true })

    await expect(ingestConversionEvents([EVENT])).rejects.toThrow(GoogleApiUnavailableError)
  })

  it('reports a token answer it cannot read as Google being unavailable', async () => {
    configureFresh()
    mocks.postToGoogle.mockResolvedValueOnce({ error: 'invalid_grant' })

    await expect(ingestConversionEvents([EVENT])).rejects.toThrow(GoogleApiUnavailableError)
  })
})
