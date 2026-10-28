import { describe, expect, it } from 'vitest'
import { toAdsCartData, toGoogleUserData } from '@/features/analytics/model/events'

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

describe('toAdsCartData', () => {
  it('names the feed and lists each bought line by its offer id, in hryvnias', () => {
    expect(
      toAdsCartData({
        merchantId: 5873814429,
        lines: [
          { offerId: 'gla_38680', quantity: 2, priceCents: 185_000 },
          { offerId: 'hart_HART-SL-MINI-PIXEL', quantity: 1, priceCents: 129_950 },
        ],
      }),
    ).toEqual({
      aw_merchant_id: 5873814429,
      aw_feed_country: 'UA',
      aw_feed_language: 'uk',
      items: [
        { id: 'gla_38680', quantity: 2, price: 1850 },
        { id: 'hart_HART-SL-MINI-PIXEL', quantity: 1, price: 1299.5 },
      ],
    })
  })
})
