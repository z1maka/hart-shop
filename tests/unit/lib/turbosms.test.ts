import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/env', () => ({
  env: { TURBO_SMS_API_TOKEN: 'token', TURBO_SMS_SENDER: 'FOX Armor' },
}))
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn() } }))

import { sendSms } from '@/lib/turbosms'

const PHONE = '380631234567'
const MESSAGE_ID = 'f83f8868-5e46-c6cf-e4fb-615e5a293754'

function respondWith(body: unknown): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve(body) }))
}

function recipient(responseCode: number, responseStatus: string, messageId: string | null) {
  return {
    phone: PHONE,
    response_code: responseCode,
    message_id: messageId,
    response_status: responseStatus,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sendSms', () => {
  it('treats a message TurboSMS reports as sent (801) as delivered', async () => {
    respondWith({
      response_code: 801,
      response_status: 'SUCCESS_MESSAGE_SENT',
      response_result: [recipient(0, 'OK', MESSAGE_ID)],
    })

    await expect(sendSms(PHONE, 'Замовлення прийнято')).resolves.toBeUndefined()
  })

  it('treats a queued message (800) as delivered', async () => {
    respondWith({
      response_code: 800,
      response_status: 'SUCCESS_MESSAGE_ACCEPTED',
      response_result: [recipient(0, 'OK', MESSAGE_ID)],
    })

    await expect(sendSms(PHONE, 'Замовлення прийнято')).resolves.toBeUndefined()
  })

  it('trusts an accepted request that lists no recipients', async () => {
    respondWith({ response_code: 801, response_status: 'SUCCESS_MESSAGE_SENT' })

    await expect(sendSms(PHONE, 'Замовлення прийнято')).resolves.toBeUndefined()
  })

  it('fails when the only recipient was left out of a partial success', async () => {
    respondWith({
      response_code: 803,
      response_status: 'SUCCESS_MESSAGE_PARTIAL_SENT',
      response_result: [recipient(406, 'NOT_ALLOWED_RECIPIENT_COUNTRY', null)],
    })

    await expect(sendSms(PHONE, 'Замовлення прийнято')).rejects.toThrow(
      'TurboSMS send failed: 406 NOT_ALLOWED_RECIPIENT_COUNTRY',
    )
  })

  it('fails on a refused request', async () => {
    respondWith({ response_code: 103, response_status: 'REQUIRED_TOKEN', response_result: null })

    await expect(sendSms(PHONE, 'Замовлення прийнято')).rejects.toThrow(
      'TurboSMS send failed: 103 REQUIRED_TOKEN',
    )
  })
})
