import { describe, expect, it } from 'vitest'
import { toGoogleUserData } from '@/features/analytics/model/events'

describe('toGoogleUserData', () => {
  it('maps the email and the phone to the keys the Google tag expects', () => {
    expect(toGoogleUserData({ email: 'buyer@example.com', phone: '+380631234567' })).toEqual({
      email: 'buyer@example.com',
      phone_number: '+380631234567',
    })
  })

  it('leaves out an identifier that is missing instead of sending an empty value', () => {
    expect(toGoogleUserData({ email: null, phone: '+380631234567' })).toEqual({
      phone_number: '+380631234567',
    })
    expect(toGoogleUserData({ email: 'buyer@example.com', phone: null })).toEqual({
      email: 'buyer@example.com',
    })
  })

  it('returns null when there is nothing to match on', () => {
    expect(toGoogleUserData({ email: null, phone: null })).toBeNull()
  })
})
