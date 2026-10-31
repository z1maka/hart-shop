import { describe, expect, it } from 'vitest'
import { OrderStatus, PaymentRoute } from '@/db/enums'
import {
  isGoogleAdsSale,
  toGoogleAdsConversionsCsv,
  type GoogleAdsSaleCandidate,
} from '@/features/orders/model/google-ads-conversions'

const SALE: GoogleAdsSaleCandidate = {
  orderNumber: 'HART-2026-000023',
  googleClickId: 'CjwKCAjwl4HXBhAjEiwAHlpWhNjyMOWk',
  createdAt: new Date('2026-10-27T13:11:22.901Z'),
  totalCents: 1_450_000,
  currency: 'UAH',
  status: OrderStatus.Pending,
  paymentRoute: PaymentRoute.CashOnDelivery,
  paidAt: null,
}

describe('which orders go to Google Ads as sales', () => {
  it('counts a cash-on-delivery order once it is placed', () => {
    expect(isGoogleAdsSale(SALE)).toBe(true)
  })

  it('leaves out a cancelled or refunded order', () => {
    expect(isGoogleAdsSale({ ...SALE, status: OrderStatus.Cancelled })).toBe(false)
    expect(isGoogleAdsSale({ ...SALE, status: OrderStatus.Refunded })).toBe(false)
  })

  it('waits for a card order to be paid', () => {
    const card = { ...SALE, paymentRoute: PaymentRoute.Card }

    expect(isGoogleAdsSale(card)).toBe(false)
    expect(isGoogleAdsSale({ ...card, paidAt: new Date('2026-10-27T13:15:00Z') })).toBe(true)
  })
})

describe('the upload file', () => {
  it('names the click, the action, the UTC time, the value and the order', () => {
    expect(toGoogleAdsConversionsCsv([SALE], 'Server purchase')).toBe(
      [
        'Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency,Order ID,Ad User Data,Ad Personalization,Event Source',
        'CjwKCAjwl4HXBhAjEiwAHlpWhNjyMOWk,Server purchase,2026-10-27 13:11:22+00:00,14500.00,UAH,HART-2026-000023,Granted,Granted,WEB',
        '',
      ].join('\n'),
    )
  })

  it('starts with the header, which Data Manager maps the columns by', () => {
    expect(toGoogleAdsConversionsCsv([], 'Server purchase').split('\n')[0]).toMatch(
      /^Google Click ID,/,
    )
  })
})
